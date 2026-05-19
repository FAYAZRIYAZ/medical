import { z } from 'zod';
import { APPOINTMENT_STATUS, APPOINTMENT_TYPE } from '../constants.js';

export const CreateAppointmentSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  departmentId: z.string().min(1),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotId: z.string().min(1),
  type: z.enum([APPOINTMENT_TYPE.IN_PERSON, APPOINTMENT_TYPE.TELEMEDICINE, APPOINTMENT_TYPE.WALK_IN]).default(APPOINTMENT_TYPE.IN_PERSON),
  chiefComplaint: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z
    .object({
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      interval: z.number().int().positive(),
      endDate: z.string().optional(),
      occurrences: z.number().int().positive().optional(),
    })
    .optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export const UpdateAppointmentSchema = z.object({
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  slotId: z.string().optional(),
  status: z.nativeEnum(APPOINTMENT_STATUS).optional(),
  chiefComplaint: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  cancellationReason: z.string().max(500).optional(),
});

export const DoctorScheduleSchema = z.object({
  doctorId: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/),
  slotDuration: z.number().int().min(5).max(120).default(15),
  maxSlots: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
  departmentId: z.string().min(1),
  locationId: z.string().optional(),
  consultationFee: z.number().nonnegative(),
  teleConsultationFee: z.number().nonnegative().optional(),
});

export const AppointmentListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  doctorId: z.string().optional(),
  patientId: z.string().optional(),
  departmentId: z.string().optional(),
  date: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.nativeEnum(APPOINTMENT_STATUS).optional(),
  type: z.string().optional(),
  sortBy: z.enum(['appointmentDate', 'createdAt', 'status']).default('appointmentDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>;
export type DoctorScheduleInput = z.infer<typeof DoctorScheduleSchema>;
export type AppointmentListInput = z.infer<typeof AppointmentListSchema>;
