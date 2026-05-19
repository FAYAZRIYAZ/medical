import mongoose, { Schema, Document } from 'mongoose';

export interface ILabTest extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  sampleType: string;
  container?: string;
  turnaroundHours: number;
  price: number;
  parameters: Array<{
    name: string;
    unit?: string;
    referenceRange?: { male?: string; female?: string; child?: string; general?: string };
    method?: string;
  }>;
  instructions?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILabOrder extends Document {
  tenantId: mongoose.Types.ObjectId;
  orderNumber: string;
  patientId: mongoose.Types.ObjectId;
  encounterId?: mongoose.Types.ObjectId;
  admissionId?: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  items: Array<{
    testId: mongoose.Types.ObjectId;
    testName: string;
    panelId?: mongoose.Types.ObjectId;
    urgent: boolean;
    clinicalNotes?: string;
    status: string;
    barcodeId?: string;
    sampleCollectedAt?: Date;
  }>;
  clinicalHistory?: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: string;
  sampleCollectedAt?: Date;
  sampleCollectedBy?: mongoose.Types.ObjectId;
  resultEnteredBy?: mongoose.Types.ObjectId;
  verifiedBy?: mongoose.Types.ObjectId;
  resultEnteredAt?: Date;
  verifiedAt?: Date;
  reportPdfUrl?: string;
  reportDeliveredAt?: Date;
  invoiceId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILabResult extends Document {
  tenantId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  testId: mongoose.Types.ObjectId;
  results: Array<{
    parameter: string;
    value: string | number;
    unit?: string;
    referenceRange?: string;
    abnormal: boolean;
    critical: boolean;
    notes?: string;
  }>;
  sampleCollectedAt?: Date;
  technician?: string;
  instrumentUsed?: string;
  isVerified: boolean;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LabTestSchema = new Schema<ILabTest>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  sampleType: { type: String, required: true },
  container: String,
  turnaroundHours: { type: Number, default: 24 },
  price: { type: Number, required: true },
  parameters: [{
    name: { type: String, required: true },
    unit: String,
    referenceRange: { male: String, female: String, child: String, general: String },
    method: String,
  }],
  instructions: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

LabTestSchema.index({ tenantId: 1, code: 1 }, { unique: true });
LabTestSchema.index({ name: 'text', code: 'text' });

const LabOrderSchema = new Schema<ILabOrder>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  orderNumber: { type: String, required: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Encounter' },
  admissionId: { type: Schema.Types.ObjectId, ref: 'Admission' },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
  items: [{
    testId: { type: Schema.Types.ObjectId, ref: 'LabTest' },
    testName: String,
    panelId: { type: Schema.Types.ObjectId },
    urgent: { type: Boolean, default: false },
    clinicalNotes: String,
    status: { type: String, enum: ['ordered', 'sample_collected', 'in_progress', 'result_entered', 'verified', 'delivered', 'cancelled'], default: 'ordered' },
    barcodeId: String,
    sampleCollectedAt: Date,
  }],
  clinicalHistory: String,
  priority: { type: String, enum: ['routine', 'urgent', 'stat'], default: 'routine' },
  status: { type: String, enum: ['ordered', 'sample_collected', 'in_progress', 'result_entered', 'verified', 'delivered', 'cancelled'], default: 'ordered' },
  sampleCollectedAt: Date,
  sampleCollectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resultEnteredBy: { type: Schema.Types.ObjectId, ref: 'User' },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resultEnteredAt: Date,
  verifiedAt: Date,
  reportPdfUrl: String,
  reportDeliveredAt: Date,
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
}, { timestamps: true });

LabOrderSchema.index({ tenantId: 1, patientId: 1 });
LabOrderSchema.index({ tenantId: 1, status: 1 });

const LabResultSchema = new Schema<ILabResult>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'LabOrder', required: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  testId: { type: Schema.Types.ObjectId, ref: 'LabTest', required: true },
  results: [{
    parameter: String,
    value: Schema.Types.Mixed,
    unit: String,
    referenceRange: String,
    abnormal: { type: Boolean, default: false },
    critical: { type: Boolean, default: false },
    notes: String,
  }],
  sampleCollectedAt: Date,
  technician: String,
  instrumentUsed: String,
  isVerified: { type: Boolean, default: false },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
  notes: String,
}, { timestamps: true });

LabResultSchema.index({ tenantId: 1, orderId: 1 });
LabResultSchema.index({ tenantId: 1, patientId: 1 });

export const LabTestModel = mongoose.model<ILabTest>('LabTest', LabTestSchema);
export const LabOrderModel = mongoose.model<ILabOrder>('LabOrder', LabOrderSchema);
export const LabResultModel = mongoose.model<ILabResult>('LabResult', LabResultSchema);
