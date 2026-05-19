import mongoose, { Schema, Document } from 'mongoose';

export interface IWard extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  type: string;
  floor?: number;
  building?: string;
  totalBeds: number;
  dailyCharges: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBed extends Document {
  tenantId: mongoose.Types.ObjectId;
  wardId: mongoose.Types.ObjectId;
  bedNumber: string;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  features: string[];
  currentAdmissionId?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAdmission extends Document {
  tenantId: mongoose.Types.ObjectId;
  admissionNumber: string;
  patientId: mongoose.Types.ObjectId;
  admittingDoctorId: mongoose.Types.ObjectId;
  wardId: mongoose.Types.ObjectId;
  bedId: mongoose.Types.ObjectId;
  admissionType: 'planned' | 'emergency' | 'transfer';
  admissionReason: string;
  diagnosis?: string;
  referredBy?: string;
  estimatedStay?: number;
  insurancePolicyId?: mongoose.Types.ObjectId;
  mlcCase: boolean;
  mlcDetails?: string;
  emergencyContactNotified: boolean;
  dietType?: string;
  notes?: string;
  status: 'active' | 'discharged' | 'transferred' | 'expired';
  admittedAt: Date;
  dischargedAt?: Date;
  dischargeType?: string;
  finalDiagnosis?: string;
  treatmentSummary?: string;
  medications?: string;
  followUpDate?: Date;
  followUpInstructions?: string;
  dietAdvice?: string;
  activityRestrictions?: string;
  dischargeNotes?: string;
  dischargePdfUrl?: string;
  bedHistory: Array<{
    wardId: mongoose.Types.ObjectId;
    bedId: mongoose.Types.ObjectId;
    fromDate: Date;
    toDate?: Date;
    reason?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVitals extends Document {
  tenantId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  admissionId?: mongoose.Types.ObjectId;
  encounterId?: mongoose.Types.ObjectId;
  systolicBp?: number;
  diastolicBp?: number;
  pulse?: number;
  temperature?: number;
  temperatureUnit: 'C' | 'F';
  spo2?: number;
  respiratoryRate?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  bloodGlucose?: number;
  painScore?: number;
  gcsScore?: number;
  notes?: string;
  recordedBy?: mongoose.Types.ObjectId;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WardSchema = new Schema<IWard>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['general', 'semi_private', 'private', 'icu', 'nicu', 'hdu', 'emergency', 'ot'] },
  floor: Number,
  building: String,
  totalBeds: { type: Number, required: true },
  dailyCharges: { type: Number, default: 0 },
  description: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

WardSchema.index({ tenantId: 1, type: 1 });

const BedSchema = new Schema<IBed>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  wardId: { type: Schema.Types.ObjectId, ref: 'Ward', required: true },
  bedNumber: { type: String, required: true },
  status: { type: String, enum: ['available', 'occupied', 'reserved', 'maintenance'], default: 'available' },
  features: { type: [String], default: [] },
  currentAdmissionId: { type: Schema.Types.ObjectId, ref: 'Admission' },
  notes: String,
}, { timestamps: true });

BedSchema.index({ tenantId: 1, wardId: 1 });
BedSchema.index({ tenantId: 1, status: 1 });

const AdmissionSchema = new Schema<IAdmission>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  admissionNumber: { type: String, required: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  admittingDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
  wardId: { type: Schema.Types.ObjectId, ref: 'Ward', required: true },
  bedId: { type: Schema.Types.ObjectId, ref: 'Bed', required: true },
  admissionType: { type: String, enum: ['planned', 'emergency', 'transfer'], default: 'planned' },
  admissionReason: { type: String, required: true },
  diagnosis: String,
  referredBy: String,
  estimatedStay: Number,
  insurancePolicyId: { type: Schema.Types.ObjectId },
  mlcCase: { type: Boolean, default: false },
  mlcDetails: String,
  emergencyContactNotified: { type: Boolean, default: false },
  dietType: String,
  notes: String,
  status: { type: String, enum: ['active', 'discharged', 'transferred', 'expired'], default: 'active' },
  admittedAt: { type: Date, default: Date.now },
  dischargedAt: Date,
  dischargeType: { type: String, enum: ['recovered', 'referred', 'lama', 'expired', 'against_advice'] },
  finalDiagnosis: String,
  treatmentSummary: String,
  medications: String,
  followUpDate: Date,
  followUpInstructions: String,
  dietAdvice: String,
  activityRestrictions: String,
  dischargeNotes: String,
  dischargePdfUrl: String,
  bedHistory: [{
    wardId: { type: Schema.Types.ObjectId, ref: 'Ward' },
    bedId: { type: Schema.Types.ObjectId, ref: 'Bed' },
    fromDate: Date,
    toDate: Date,
    reason: String,
  }],
}, { timestamps: true });

AdmissionSchema.index({ tenantId: 1, patientId: 1, admittedAt: -1 });
AdmissionSchema.index({ tenantId: 1, status: 1 });
AdmissionSchema.index({ tenantId: 1, bedId: 1, status: 1 });

const VitalsSchema = new Schema<IVitals>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  admissionId: { type: Schema.Types.ObjectId, ref: 'Admission' },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Encounter' },
  systolicBp: Number,
  diastolicBp: Number,
  pulse: Number,
  temperature: Number,
  temperatureUnit: { type: String, enum: ['C', 'F'], default: 'C' },
  spo2: Number,
  respiratoryRate: Number,
  weight: Number,
  height: Number,
  bmi: Number,
  bloodGlucose: Number,
  painScore: Number,
  gcsScore: Number,
  notes: String,
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  recordedAt: { type: Date, default: Date.now },
}, { timestamps: true });

VitalsSchema.index({ tenantId: 1, patientId: 1, recordedAt: -1 });
VitalsSchema.index({ tenantId: 1, admissionId: 1 });

export const WardModel = mongoose.model<IWard>('Ward', WardSchema);
export const BedModel = mongoose.model<IBed>('Bed', BedSchema);
export const AdmissionModel = mongoose.model<IAdmission>('Admission', AdmissionSchema);
export const VitalsModel = mongoose.model<IVitals>('Vitals', VitalsSchema);
