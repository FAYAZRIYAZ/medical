import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { tenantContext } from '../../middleware/tenant.js';
import { sendSuccess } from '../../utils/response.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { AppointmentModel } from '../appointments/appointment.model.js';
import { generateLiveKitToken } from '../../integrations/livekit.js';
import { APPOINTMENT_STATUS } from '@hims/shared';

const router = Router();
router.use(authenticate, tenantContext);

router.post('/join/:appointmentId', async (req: Request, res: Response) => {
  const appointment = await AppointmentModel.findOne({
    _id: req.params['appointmentId'],
    tenantId: req.tenantId,
    type: 'telemedicine',
  })
    .populate('patientId', 'firstName lastName')
    .populate('doctorId', 'firstName lastName')
    .lean();

  if (!appointment) throw new NotFoundError('Telemedicine appointment');
  if (!appointment.livekitRoomName) throw new NotFoundError('Room not yet created');

  if (appointment.status === APPOINTMENT_STATUS.CANCELLED) {
    throw new ForbiddenError('Appointment is cancelled');
  }

  const userId = req.user!._id.toString();
  const role = req.user!.role;
  const isDoctor = role === 'doctor';

  const patient = appointment.patientId as unknown as Record<string, unknown>;
  const doctor = appointment.doctorId as unknown as Record<string, unknown>;
  const participantName = isDoctor
    ? `Dr. ${String(doctor.firstName ?? '')} ${String(doctor.lastName ?? '')}`
    : `${String(patient.firstName ?? '')} ${String(patient.lastName ?? '')}`;

  const token = generateLiveKitToken(
    appointment.livekitRoomName,
    userId,
    participantName,
    isDoctor
  );

  // Update appointment status
  if (appointment.status === APPOINTMENT_STATUS.SCHEDULED || appointment.status === APPOINTMENT_STATUS.CONFIRMED) {
    await AppointmentModel.findByIdAndUpdate(appointment._id, {
      status: APPOINTMENT_STATUS.IN_PROGRESS,
      consultationStartedAt: new Date(),
    });
  }

  sendSuccess(res, {
    token,
    roomName: appointment.livekitRoomName,
    livekitUrl: process.env['LIVEKIT_URL'] ?? 'wss://localhost:7880',
    participantName,
    isDoctor,
    appointment: {
      id: appointment._id,
      date: appointment.appointmentDate,
      slotTime: appointment.slotTime,
      patient: appointment.patientId,
      doctor: appointment.doctorId,
    },
  });
});

router.post('/end/:appointmentId', async (req: Request, res: Response) => {
  const appointment = await AppointmentModel.findOneAndUpdate(
    { _id: req.params['appointmentId'], tenantId: req.tenantId, type: 'telemedicine' },
    { status: APPOINTMENT_STATUS.COMPLETED, consultationEndedAt: new Date() },
    { new: true }
  ).lean();
  if (!appointment) throw new NotFoundError('Appointment');
  sendSuccess(res, appointment);
});

export default router;
