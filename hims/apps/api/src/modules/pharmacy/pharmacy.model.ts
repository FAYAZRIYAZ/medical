import mongoose, { Schema, Document } from 'mongoose';

export interface IDrug extends Document {
  tenantId: mongoose.Types.ObjectId;
  genericName: string;
  brandName: string;
  composition?: string;
  schedule: string;
  category?: string;
  form: string;
  strength: string;
  unit: string;
  manufacturer?: string;
  hsn?: string;
  gstRate: number;
  requiresPrescription: boolean;
  isNarcotic: boolean;
  storageInstructions?: string;
  interactions: string[];
  contraindications: string[];
  isActive: boolean;
  minStockLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPharmacyBatch extends Document {
  tenantId: mongoose.Types.ObjectId;
  drugId: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
  batchNumber: string;
  quantity: number;
  soldQuantity: number;
  unitCostPrice: number;
  unitMrp: number;
  manufacturingDate?: Date;
  expiryDate: Date;
  purchaseOrderId?: mongoose.Types.ObjectId;
  invoiceNumber?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDispensing extends Document {
  tenantId: mongoose.Types.ObjectId;
  prescriptionId?: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  dispensedBy: mongoose.Types.ObjectId;
  items: Array<{
    drugId: mongoose.Types.ObjectId;
    batchId: mongoose.Types.ObjectId;
    drugName: string;
    quantityDispensed: number;
    unitMrp: number;
    totalAmount: number;
  }>;
  totalAmount: number;
  invoiceId?: mongoose.Types.ObjectId;
  notes?: string;
  dispensedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DrugSchema = new Schema<IDrug>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  genericName: { type: String, required: true },
  brandName: { type: String, required: true },
  composition: String,
  schedule: { type: String, enum: ['general', 'H', 'H1', 'X', 'G', 'J', 'L'], default: 'general' },
  category: String,
  form: { type: String, required: true, enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'powder', 'suppository', 'patch', 'other'] },
  strength: { type: String, required: true },
  unit: { type: String, default: 'mg' },
  manufacturer: String,
  hsn: String,
  gstRate: { type: Number, default: 12 },
  requiresPrescription: { type: Boolean, default: true },
  isNarcotic: { type: Boolean, default: false },
  storageInstructions: String,
  interactions: { type: [String], default: [] },
  contraindications: { type: [String], default: [] },
  isActive: { type: Boolean, default: true },
  minStockLevel: { type: Number, default: 10 },
}, { timestamps: true });

DrugSchema.index({ tenantId: 1, isActive: 1 });
DrugSchema.index({ genericName: 'text', brandName: 'text' });

const BatchSchema = new Schema<IPharmacyBatch>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  drugId: { type: Schema.Types.ObjectId, ref: 'Drug', required: true },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
  batchNumber: { type: String, required: true },
  quantity: { type: Number, required: true },
  soldQuantity: { type: Number, default: 0 },
  unitCostPrice: { type: Number, required: true },
  unitMrp: { type: Number, required: true },
  manufacturingDate: Date,
  expiryDate: { type: Date, required: true },
  purchaseOrderId: { type: Schema.Types.ObjectId },
  invoiceNumber: String,
  notes: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

BatchSchema.index({ tenantId: 1, drugId: 1, expiryDate: 1 });
BatchSchema.index({ tenantId: 1, expiryDate: 1 });

const DispensingSchema = new Schema<IDispensing>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription' },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  dispensedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    drugId: { type: Schema.Types.ObjectId, ref: 'Drug' },
    batchId: { type: Schema.Types.ObjectId },
    drugName: String,
    quantityDispensed: Number,
    unitMrp: Number,
    totalAmount: Number,
  }],
  totalAmount: { type: Number, required: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  notes: String,
  dispensedAt: { type: Date, default: Date.now },
}, { timestamps: true });

DispensingSchema.index({ tenantId: 1, patientId: 1 });
DispensingSchema.index({ tenantId: 1, dispensedAt: -1 });

export const DrugModel = mongoose.model<IDrug>('Drug', DrugSchema);
export const PharmacyBatchModel = mongoose.model<IPharmacyBatch>('PharmacyBatch', BatchSchema);
export const DispensingModel = mongoose.model<IDispensing>('Dispensing', DispensingSchema);
