import { Worker } from 'bullmq';
import mongoose from 'mongoose';
import { bullRedis } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { sendEmail } from '../integrations/email.js';
import { sendOtpSms, sendOtpWhatsApp, sendSMS } from '../integrations/sms.js';
import { generatePrescriptionPdf } from '../utils/pdf.js';
import { AppointmentModel } from '../modules/appointments/appointment.model.js';
import { PatientModel } from '../modules/patients/patient.model.js';
import { DoctorModel } from '../modules/doctors/doctor.model.js';
import { LabOrderModel } from '../modules/lab/lab.model.js';
import { InvoiceModel } from '../modules/billing/billing.model.js';
import { socketService } from '../integrations/socket.js';
import { PharmacyBatchModel } from '../modules/pharmacy/pharmacy.model.js';
import { NotificationModel } from '../modules/notifications/notification.model.js';
import { AdmissionModel } from '../modules/ipd/ipd.model.js';

// Helper: create in-app notifications for all staff (admin/doctor/nurse) in a tenant
async function notifyTenantStaff(tenantId: string, title: string, message: string, type: string, data?: Record<string, unknown>) {
  try {
    const UserModel = mongoose.model('User');
    const staff = await UserModel.find({
      tenantId,
      role: { $in: ['hospital_admin', 'doctor', 'nurse', 'receptionist'] },
      isActive: true,
    }).select('_id').lean() as { _id: mongoose.Types.ObjectId }[];

    if (staff.length === 0) return;
    await NotificationModel.insertMany(
      staff.map((u) => ({ tenantId, userId: u._id, type, title, message, data, channels: ['in_app'] }))
    );
    staff.forEach((u) => {
      socketService.emitToUser(u._id.toString(), 'notification', { type, title, message, data });
    });
  } catch (err) {
    logger.warn('Failed to notify tenant staff', { error: String(err) });
  }
}


const workerOpts = { connection: bullRedis };

// ── Notifications Worker ───────────────────────────────────────────────────
const notificationsWorker = new Worker(
  'notifications',
  async (job) => {
    logger.debug('Processing notification job', { name: job.name, id: job.id });

    switch (job.name) {
      case 'send-otp': {
        const { phone, otp, channel } = job.data as { phone: string; otp: string; channel: string };
        if (channel === 'whatsapp') await sendOtpWhatsApp(phone, otp);
        else await sendOtpSms(phone, otp);
        break;
      }

      case 'send-email-verification': {
        const { email, name, token } = job.data as { userId: string; email: string; name: string; token: string };
        const verifyUrl = `${process.env['CLIENT_URL']}/auth/verify-email?token=${token}`;
        await sendEmail(email, 'email-verification', { name, verifyUrl });
        break;
      }

      case 'send-password-reset': {
        const { email, name, token } = job.data as { userId: string; email: string; name: string; token: string };
        const resetUrl = `${process.env['CLIENT_URL']}/auth/reset-password?token=${token}`;
        await sendEmail(email, 'password-reset', { name, resetUrl });
        break;
      }

      case 'appointment-booked': {
        const { appointmentId, patientId, doctorId, date } = job.data as { appointmentId: string; patientId: string; doctorId: string; date: string; type: string };
        const [patient, doctor, appointment] = await Promise.all([
          PatientModel.findById(patientId).lean(),
          DoctorModel.findById(doctorId).lean(),
          AppointmentModel.findById(appointmentId).lean(),
        ]);
        const doctorName = `Dr. ${doctor?.firstName ?? ''} ${doctor?.lastName ?? ''}`.trim();
        const dateStr = new Date(date).toLocaleDateString('en-IN');
        if (patient?.email) {
          await sendEmail(patient.email, 'appointment-booked', {
            patientName: `${patient.firstName} ${patient.lastName}`,
            doctorName,
            date: dateStr,
            time: appointment?.slotTime ?? '',
            tokenNumber: String(appointment?.tokenNumber ?? ''),
          });
        }
        if (patient?.phone) {
          await sendSMS(patient.phone,
            `Appointment confirmed with ${doctorName} on ${dateStr}. Token: ${appointment?.tokenNumber ?? ''}`
          );
        }
        // Notify all staff about new appointment
        if (appointment?.tenantId) {
          await notifyTenantStaff(
            appointment.tenantId.toString(),
            'New Appointment Booked',
            `${patient?.firstName ?? 'Patient'} ${patient?.lastName ?? ''} booked an appointment with ${doctorName} on ${dateStr} (Token #${appointment?.tokenNumber ?? ''})`,
            'appointment',
            { appointmentId }
          );
        }
        break;
      }

      case 'appointment-status-changed': {
        const { appointmentId, status, patientId } = job.data as { appointmentId: string; status: string; patientId: string; tenantId?: string };
        const appointment = await AppointmentModel.findById(appointmentId).populate('doctorId', 'firstName lastName').lean();
        const tenantId = (job.data as { tenantId?: string }).tenantId ?? appointment?.tenantId?.toString();
        const msg = `Appointment status changed to "${status}"`;
        if (tenantId) {
          await notifyTenantStaff(tenantId, 'Appointment Updated', msg, 'appointment', { appointmentId, status });
        }
        socketService.emitToUser(patientId, 'notification', { type: 'appointment_status', message: msg, data: { appointmentId, status } });
        break;
      }

      case 'prescription-ready': {
        const { prescriptionId, patientId, tenantId } = job.data as { prescriptionId: string; patientId: string; tenantId?: string };
        const patient = await PatientModel.findById(patientId).lean();
        if (patient?.email) {
          await sendEmail(patient.email, 'appointment-booked', {
            patientName: `${patient.firstName} ${patient.lastName}`,
            doctorName: '',
            date: new Date().toLocaleDateString('en-IN'),
            time: '',
            tokenNumber: prescriptionId,
          });
        }
        if (tenantId) {
          await notifyTenantStaff(tenantId, 'Prescription Ready', `Prescription ready for ${patient?.firstName ?? 'patient'} ${patient?.lastName ?? ''}`, 'prescription', { prescriptionId, patientId });
        }
        break;
      }

      case 'lab-report-ready': {
        const { orderId, patientId, tenantId } = job.data as { orderId: string; patientId: string; tenantId?: string };
        const [patient, order] = await Promise.all([
          PatientModel.findById(patientId).lean(),
          LabOrderModel.findById(orderId).lean(),
        ]);
        const testNames = order?.items?.map((i: { testName: string }) => i.testName).join(', ') ?? 'tests';
        if (patient?.email) {
          await sendEmail(patient.email, 'lab-report-ready', {
            patientName: `${patient.firstName} ${patient.lastName}`,
            testName: testNames,
          });
        }
        if (tenantId) {
          await notifyTenantStaff(tenantId, 'Lab Report Ready', `Lab results ready for ${patient?.firstName ?? 'patient'} ${patient?.lastName ?? ''}: ${testNames}`, 'lab_report', { orderId, patientId });
        }
        break;
      }

      case 'payment-received': {
        const { invoiceId, patientId, amount, tenantId } = job.data as { paymentId: string; invoiceId: string; patientId: string; amount: number; tenantId?: string };
        const [patient, invoice] = await Promise.all([
          PatientModel.findById(patientId).lean(),
          InvoiceModel.findById(invoiceId).lean(),
        ]);
        if (patient?.email) {
          await sendEmail(patient.email, 'payment-receipt', {
            patientName: `${patient.firstName} ${patient.lastName}`,
            amount: amount.toFixed(2),
            invoiceNumber: invoice?.invoiceNumber ?? '',
          });
        }
        if (tenantId) {
          await notifyTenantStaff(tenantId, 'Payment Received', `₹${amount} payment received from ${patient?.firstName ?? 'patient'} ${patient?.lastName ?? ''} for Invoice #${invoice?.invoiceNumber ?? ''}`, 'payment', { invoiceId, amount, patientId });
        }
        break;
      }

      case 'patient-admitted': {
        const { admissionId, patientId } = job.data as { admissionId: string; patientId: string };
        const [patient, admission] = await Promise.all([
          PatientModel.findById(patientId).lean(),
          AdmissionModel.findById(admissionId).populate('wardId', 'name').populate('bedId', 'bedNumber').lean(),
        ]);
        const wardName = (admission?.wardId as { name?: string } | null)?.name ?? 'ward';
        const bedNum = (admission?.bedId as { bedNumber?: string } | null)?.bedNumber ?? '';
        const admitMsg = `${patient?.firstName ?? 'Patient'} ${patient?.lastName ?? ''} admitted to ${wardName}${bedNum ? ` Bed ${bedNum}` : ''}`;
        if (admission?.tenantId) {
          await notifyTenantStaff(admission.tenantId.toString(), 'Patient Admitted', admitMsg, 'emergency', { admissionId, patientId });
        }
        break;
      }

      case 'patient-discharged': {
        const { admissionId, patientId } = job.data as { admissionId: string; patientId: string };
        const [patient, admission] = await Promise.all([
          PatientModel.findById(patientId).lean(),
          AdmissionModel.findById(admissionId).lean(),
        ]);
        const dischargeMsg = `${patient?.firstName ?? 'Patient'} ${patient?.lastName ?? ''} has been discharged (Admission #${(admission as { admissionNumber?: string } | null)?.admissionNumber ?? ''})`;
        if (admission?.tenantId) {
          await notifyTenantStaff(admission.tenantId.toString(), 'Patient Discharged', dischargeMsg, 'general', { admissionId, patientId });
        }
        break;
      }

      default:
        logger.warn('Unknown notification job', { name: job.name });
    }
  },
  workerOpts
);

// ── PDF Generation Worker ──────────────────────────────────────────────────
const pdfWorker = new Worker(
  'pdf-generation',
  async (job) => {
    logger.debug('Processing PDF job', { name: job.name, id: job.id });
    await generatePrescriptionPdf(job.data as { prescriptionId?: string; admissionId?: string; resultId?: string });
  },
  workerOpts
);

// ── Inventory Alerts Worker ────────────────────────────────────────────────
const inventoryWorker = new Worker(
  'inventory-alerts',
  async () => {
    logger.debug('Running inventory check');
    const lowStock = await PharmacyBatchModel.aggregate([
      { $group: { _id: '$drugId', available: { $sum: { $subtract: ['$quantity', '$soldQuantity'] } } } },
      { $lookup: { from: 'drugs', localField: '_id', foreignField: '_id', as: 'drug' } },
      { $unwind: '$drug' },
      { $match: { $expr: { $lte: ['$available', '$drug.minStockLevel'] } } },
    ]);
    if (lowStock.length > 0) {
      logger.warn('Low stock alert', { count: lowStock.length, items: lowStock.map((i) => i.drug?.brandName) });
    }
  },
  workerOpts
);

// ── Cleanup Worker ─────────────────────────────────────────────────────────
const cleanupWorker = new Worker(
  'cleanup',
  async () => {
    logger.debug('Running cleanup job');
  },
  workerOpts
);

for (const worker of [notificationsWorker, pdfWorker, inventoryWorker, cleanupWorker]) {
  worker.on('failed', (job, err) => {
    logger.error('Job failed', { name: job?.name, id: job?.id, error: err.message });
  });
  worker.on('completed', (job) => {
    logger.debug('Job completed', { name: job.name, id: job.id });
  });
}

export { notificationsWorker, pdfWorker, inventoryWorker, cleanupWorker };
