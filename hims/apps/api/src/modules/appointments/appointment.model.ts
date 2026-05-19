import mongoose, { Schema, Document } from 'mongoose';
import type { AppointmentStatus } from '@hims/shared';

export interface IAppointment extends Document {
  tenantId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  appointmentDate: Date;
  slotId: string;
  slotTime: string;
  slotEndTime: string;
  tokenNumber: number;
  type: 'in_person' | 'telemedicine' | 'walk_in';
  status: AppointmentStatus;
  chiefComplaint?: string;
  notes?: string;
  consultationFee: number;
  isFollowUp: boolean;
  parentAppointmentId?: mongoose.Types.ObjectId;
  isRecurring: boolean;
  recurringGroupId?: string;
  recurringPattern?: { frequency: string; interval: number; endDate?: Date; occurrences?: number };
  cancellationReason?: string;
  cancelledBy?: mongoose.Types.ObjectId;
  checkedInAt?: Date;
  consultationStartedAt?: Date;
  consultationEndedAt?: Date;
  encounterId?: mongoose.Types.ObjectId;
  livekitRoomName?: string;
  waitTime?: number;
  idempotencyKey?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    appointmentDate: { type: Date, required: true },
    slotId: { type: String, required: true },
    slotTime: { type: String, required: true },
    slotEndTime: String,
    tokenNumber: { type: Number, required: true },
    type: { type: String, enum: ['in_person', 'telemedicine', 'walk_in'], default: 'in_person' },
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'],
      default: 'scheduled',
    },
    chiefComplaint: String,
    notes: String,
    consultationFee: { type: Number, default: 0 },
    isFollowUp: { type: Boolean, default: false },
    parentAppointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    isRecurring: { type: Boolean, default: false },
    recurringGroupId: String,
    recurringPattern: {
      frequency: String,
      interval: Number,
      endDate: Date,
      occurrences: Number,
    },
    cancellationReason: String,
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    checkedInAt: Date,
    consultationStartedAt: Date,
    consultationEndedAt: Date,
    encounterId: { type: Schema.Types.ObjectId, ref: 'Encounter' },
    livekitRoomName: String,
    waitTime: Number,
    idempotencyKey: { type: String, unique: true, sparse: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

AppointmentSchema.index({ tenantId: 1, doctorId: 1, appointmentDate: 1 });
AppointmentSchema.index({ tenantId: 1, patientId: 1, appointmentDate: -1 });
AppointmentSchema.index({ tenantId: 1, status: 1, appointmentDate: 1 });
AppointmentSchema.index({ tenantId: 1, departmentId: 1, appointmentDate: 1 });

export const AppointmentModel = mongoose.model<IAppointment>('Appointment', AppointmentSchema);
