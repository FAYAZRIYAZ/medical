import { AppointmentModel } from './appointment.model.js';
import { DoctorModel } from '../doctors/doctor.model.js';
import { PatientModel } from '../patients/patient.model.js';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors.js';
import { buildPaginationMeta } from '../../utils/response.js';
import { notificationQueue } from '../../jobs/queues.js';
import type { CreateAppointmentInput, UpdateAppointmentInput, AppointmentListInput } from '@hims/shared';
import { APPOINTMENT_STATUS } from '@hims/shared';
import { socketService } from '../../integrations/socket.js';
import { createLiveKitRoom } from '../../integrations/livekit.js';

export class AppointmentService {
  async create(input: CreateAppointmentInput, tenantId: string, createdBy?: string) {
    const { patientId, doctorId, departmentId, appointmentDate, slotId, type, idempotencyKey } = input;

    // Idempotency check
    if (idempotencyKey) {
      const existing = await AppointmentModel.findOne({ idempotencyKey }).lean();
      if (existing) return existing;
    }

    const [patient, doctor] = await Promise.all([
      PatientModel.findOne({ _id: patientId, tenantId }).lean(),
      DoctorModel.findOne({ _id: doctorId, tenantId }).lean(),
    ]);
    if (!patient) throw new NotFoundError('Patient');
    if (!doctor) throw new NotFoundError('Doctor');

    // Check slot conflict
    const dateObj = new Date(appointmentDate);
    const slotConflict = await AppointmentModel.findOne({
      tenantId,
      doctorId,
      appointmentDate: dateObj,
      slotId,
      status: { $nin: [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW] },
    }).lean();
    if (slotConflict) throw new ConflictError('Slot already booked');

    // Get day schedule for token number
    const dayOfWeek = dateObj.getDay();
    const daySchedule = doctor.schedule.find((s) => s.dayOfWeek === dayOfWeek && s.isActive);
    const tokenNumber = await this._getNextTokenNumber(tenantId, doctorId.toString(), dateObj);

    // Extract slot time from slotId
    const slotParts = slotId.split('-');
    const slotTime = slotParts.length >= 4 ? (slotParts[3] ?? '09:00') : '09:00';
    const slotDuration = daySchedule?.slotDuration ?? 15;
    const [sh, sm] = slotTime.split(':').map(Number) as [number, number];
    const endMin = sh * 60 + sm + slotDuration;
    const slotEndTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

    const appointment = await AppointmentModel.create({
      tenantId,
      patientId,
      doctorId,
      departmentId,
      appointmentDate: dateObj,
      slotId,
      slotTime,
      slotEndTime,
      tokenNumber,
      type,
      status: APPOINTMENT_STATUS.SCHEDULED,
      chiefComplaint: input.chiefComplaint,
      notes: input.notes,
      consultationFee: type === 'telemedicine' ? (doctor.teleConsultationFee ?? doctor.consultationFee) : doctor.consultationFee,
      isRecurring: input.isRecurring ?? false,
      idempotencyKey,
      createdBy: createdBy ? createdBy : undefined,
    });

    // Create LiveKit room for telemedicine
    if (type === 'telemedicine') {
      const roomName = `consult-${appointment._id.toString()}`;
      await createLiveKitRoom(roomName);
      await AppointmentModel.updateOne({ _id: appointment._id }, { livekitRoomName: roomName });
    }

    // Update patient total visits
    await PatientModel.updateOne({ _id: patientId }, { $inc: { totalVisits: 1 }, lastVisit: dateObj });

    // Queue notifications
    await notificationQueue.add('appointment-booked', {
      appointmentId: appointment._id.toString(),
      patientId,
      doctorId,
      date: appointmentDate,
      type,
    });

    // Emit queue update
    socketService.emitToTenant(tenantId, 'queue:updated', { doctorId, date: appointmentDate });

    return appointment.toObject();
  }

  async list(query: AppointmentListInput, tenantId: string) {
    const { page, limit, doctorId, patientId, departmentId, date, dateFrom, dateTo, status, type, sortBy, sortOrder } = query;
    const filter: Record<string, unknown> = { tenantId };

    if (doctorId) filter['doctorId'] = doctorId;
    if (patientId) filter['patientId'] = patientId;
    if (departmentId) filter['departmentId'] = departmentId;
    if (status) filter['status'] = status;
    if (type) filter['type'] = type;

    if (date) {
      const d = new Date(date);
      filter['appointmentDate'] = {
        $gte: new Date(d.setHours(0, 0, 0, 0)),
        $lt: new Date(d.setHours(23, 59, 59, 999)),
      };
    } else if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter['$gte'] = new Date(dateFrom);
      if (dateTo) dateFilter['$lte'] = new Date(dateTo + 'T23:59:59');
      filter['appointmentDate'] = dateFilter;
    }

    const sortDir = sortOrder === 'asc' ? 1 : -1;

    const [total, appointments] = await Promise.all([
      AppointmentModel.countDocuments(filter),
      AppointmentModel.find(filter)
        .populate('patientId', 'firstName lastName uhid phone')
        .populate('doctorId', 'firstName lastName specialization')
        .populate('departmentId', 'name code')
        .sort({ [sortBy]: sortDir })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return { data: appointments, meta: { pagination: buildPaginationMeta(total, page, limit) } };
  }

  async findById(id: string, tenantId: string) {
    const appt = await AppointmentModel.findOne({ _id: id, tenantId })
      .populate('patientId', 'firstName lastName uhid phone bloodGroup allergies')
      .populate('doctorId', 'firstName lastName specialization registrationNumber')
      .populate('departmentId', 'name code')
      .lean();
    if (!appt) throw new NotFoundError('Appointment');
    return appt;
  }

  async update(id: string, tenantId: string, input: UpdateAppointmentInput, updatedBy?: string) {
    const appt = await AppointmentModel.findOne({ _id: id, tenantId }).lean();
    if (!appt) throw new NotFoundError('Appointment');

    if (appt.status === APPOINTMENT_STATUS.CANCELLED) {
      throw new ValidationError('Cannot update a cancelled appointment');
    }

    const update: Record<string, unknown> = { ...input };

    if (input.status === APPOINTMENT_STATUS.CANCELLED) {
      update['cancelledBy'] = updatedBy;
    }
    if (input.status === APPOINTMENT_STATUS.CHECKED_IN) {
      update['checkedInAt'] = new Date();
    }
    if (input.status === APPOINTMENT_STATUS.IN_PROGRESS) {
      update['consultationStartedAt'] = new Date();
    }
    if (input.status === APPOINTMENT_STATUS.COMPLETED) {
      update['consultationEndedAt'] = new Date();
    }

    const updated = await AppointmentModel.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate('patientId', 'firstName lastName uhid')
      .lean();

    socketService.emitToTenant(tenantId, 'queue:updated', { doctorId: appt.doctorId.toString() });

    // Queue notification on status change
    if (input.status) {
      await notificationQueue.add('appointment-status-changed', {
        appointmentId: id,
        status: input.status,
        patientId: appt.patientId.toString(),
      });
    }

    return updated;
  }

  async getTodayQueue(doctorId: string, tenantId: string) {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));

    return AppointmentModel.find({
      tenantId,
      doctorId,
      appointmentDate: { $gte: start, $lte: end },
      status: { $in: [APPOINTMENT_STATUS.SCHEDULED, APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.IN_PROGRESS] },
    })
      .populate('patientId', 'firstName lastName uhid phone bloodGroup allergies')
      .sort({ tokenNumber: 1 })
      .lean();
  }

  private async _getNextTokenNumber(tenantId: string, doctorId: string, date: Date): Promise<number> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const count = await AppointmentModel.countDocuments({
      tenantId,
      doctorId,
      appointmentDate: { $gte: start, $lte: end },
      status: { $ne: APPOINTMENT_STATUS.CANCELLED },
    });
    return count + 1;
  }
}

export const appointmentService = new AppointmentService();
