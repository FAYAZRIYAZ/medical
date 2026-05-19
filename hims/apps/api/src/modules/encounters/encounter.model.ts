import mongoose, { Schema, Document } from 'mongoose';

export interface IEncounter extends Document {
  tenantId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  encounterType: 'opd' | 'ipd' | 'emergency' | 'telemedicine';
  encounterDate: Date;
  chiefComplaints: string[];
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  familyHistory?: string;
  socialHistory?: string;
  reviewOfSystems?: string;
  physicalExamination?: string;
  impression?: string;
  diagnosis: Array<{ icd10Code: string; description: string; type: 'primary' | 'secondary' | 'comorbidity' }>;
  treatmentPlan?: string;
  advice?: string;
  followUpDate?: Date;
  followUpInstructions?: string;
  referralId?: mongoose.Types.ObjectId;
  vitals?: mongoose.Types.ObjectId;
  status: 'in_progress' | 'completed' | 'cancelled';
  isSigned: boolean;
  signedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EncounterSchema = new Schema<IEncounter>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    encounterType: { type: String, enum: ['opd', 'ipd', 'emergency', 'telemedicine'], default: 'opd' },
    encounterDate: { type: Date, default: Date.now },
    chiefComplaints: { type: [String], default: [] },
    historyOfPresentIllness: String,
    pastMedicalHistory: String,
    familyHistory: String,
    socialHistory: String,
    reviewOfSystems: String,
    physicalExamination: String,
    impression: String,
    diagnosis: [
      {
        icd10Code: String,
        description: { type: String, required: true },
        type: { type: String, enum: ['primary', 'secondary', 'comorbidity'], default: 'primary' },
      },
    ],
    treatmentPlan: String,
    advice: String,
    followUpDate: Date,
    followUpInstructions: String,
    referralId: { type: Schema.Types.ObjectId, ref: 'Referral' },
    vitals: { type: Schema.Types.ObjectId, ref: 'Vitals' },
    status: { type: String, enum: ['in_progress', 'completed', 'cancelled'], default: 'in_progress' },
    isSigned: { type: Boolean, default: false },
    signedAt: Date,
    notes: String,
  },
  { timestamps: true }
);

EncounterSchema.index({ tenantId: 1, patientId: 1, encounterDate: -1 });
EncounterSchema.index({ tenantId: 1, doctorId: 1, encounterDate: -1 });
EncounterSchema.index({ tenantId: 1, appointmentId: 1 });

export const EncounterModel = mongoose.model<IEncounter>('Encounter', EncounterSchema);
