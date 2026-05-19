import { Worker } from 'bullmq';
import { bullRedis } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { sendEmail } from '../integrations/email.js';
import { sendOtpSms, sendOtpWhatsApp, sendSMS, sendWhatsApp } from '../integrations/sms.js';
import { generatePrescriptionPdf } from '../utils/pdf.js';
import { AppointmentModel } from '../modules/appointments/appointment.model.js';
import { PatientModel } from '../modules/patients/patient.model.js';
import { DoctorModel } from '../modules/doctors/doctor.model.js';
import { PrescriptionModel } from '../modules/prescriptions/prescription.model.js';
import { LabOrderModel } from '../modules/lab/lab.model.js';
import { InvoiceModel, PaymentModel } from '../modules/billing/billing.model.js';
import { socketService } from '../integrations/socket.js';
import { DrugModel, PharmacyBatchModel } from '../modules/pharmacy/pharmacy.model.js';

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
        const { appointmentId, patientId, doctorId, date, type } = job.data as { appointmentId: string; patientId: string; doctorId: string; date: string; type: string };
        const [patient, doctor, appointment] = await Promise.all([
          PatientModel.findById(patientId).lean(),
          DoctorModel.findById(doctorId).lean(),
          AppointmentModel.findById(appointmentId).lean(),
        ]);
        if (patient?.email) {
          await sendEmail(patient.email, 'appointment-booked', {
            patientName: `${patient.firstName} ${patient.lastName}`,
            doctorName: `${doctor?.firstName ?? ''} ${doctor?.lastName ?? ''}`,
            date: new Date(date).toLocaleDateString('en-IN'),
            time: appointment?.slotTime ?? '',
            tokenNumber: String(appointment?.tokenNumber ?? ''),
          });
        }
        if (patient?.phone) {
          await sendSMS(patient.phone,
            `Appointment confirmed with Dr. ${doctor?.lastName ?? ''} on ${new Date(date).toLocaleDateString('en-IN')} at ${appointment?.slotTime ?? ''}. Token: ${appointment?.tokenNumber ?? ''}`
          );
        }
        socketService.emitToUser(patientId, 'notification', {
          type: 'appointment_booked',
          message: 'Your appointment has been confirmed',
          data: { appointmentId },
        });
        break;
      }

      case 'appointment-status-changed': {
        const { appointmentId, status, patientId } = job.data as { appointmentId: string; status: string; patientId: string };
        socketService.emitToUser(patientId, 'notification', {
          type: 'appointment_status',
          message: `Appointment status updated to ${status}`,
          data: { appointmentId, status },
        });
        break;
      }

      case 'prescription-ready': {
        const { prescriptionId, patientId } = job.data as { prescriptionId: string; patientId: string };
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
        socketService.emitToUser(patientId, 'notification', {
          type: 'prescription_ready',
          message: 'Your prescription is ready',
          data: { prescriptionId },
        });
        break;
      }

      case 'lab-report-ready': {
        const { orderId, patientId } = job.data as { orderId: string; patientId: string };
        const [patient, order] = await Promise.all([
          PatientModel.findById(patientId).lean(),
          LabOrderModel.findById(orderId).populate('items.testId', 'name').lean(),
        ]);
        if (patient?.email) {
          await sendEmail(patient.email, 'lab-report-ready', {
            patientName: `${patient.firstName} ${patient.lastName}`,
            testName: order?.items?.map((i) => i.testName).join(', ') ?? '',
          });
        }
        socketService.emitToUser(patientId, 'notification', {
          type: 'lab_report_ready',
          message: 'Your lab report is ready',
          data: { orderId },
        });
        break;
      }

      case 'payment-received': {
        const { invoiceId, patientId, amount } = job.data as { paymentId: string; invoiceId: string; patientId: string; amount: number };
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
        socketService.emitToUser(patientId, 'notification', {
          type: 'payment_received',
          message: `Payment of ₹${amount} received`,
          data: { invoiceId, amount },
        });
        break;
      }

      case 'patient-admitted': {
        const { patientId } = job.data as { admissionId: string; patientId: string };
        socketService.emitToUser(patientId, 'notification', { type: 'admitted', message: 'You have been admitted' });
        break;
      }

      case 'patient-discharged': {
        const { patientId } = job.data as { admissionId: string; patientId: string };
        socketService.emitToUser(patientId, 'notification', { type: 'discharged', message: 'You have been discharged' });
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
