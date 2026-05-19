import mongoose, { Schema, Document } from 'mongoose';

export interface IPrescription extends Document {
  tenantId: mongoose.Types.ObjectId;
  encounterId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  prescriptionNumber: string;
  items: Array<{
    drugId: mongoose.Types.ObjectId;
    drugName: string;
    genericName?: string;
    dose: string;
    frequency: string;
    route: string;
    duration: string;
    quantity: number;
    instructions?: string;
    substitutionAllowed: boolean;
    isDispensed: boolean;
    dispensedQuantity: number;
  }>;
  diagnosis: string[];
  advice?: string;
  followUpDate?: Date;
  followUpInstructions?: string;
  doctorNotes?: string;
  isSigned: boolean;
  signedAt?: Date;
  qrCode?: string;
  pdfUrl?: string;
  isDispensed: boolean;
  dispensedAt?: Date;
  dispensedBy?: mongoose.Types.ObjectId;
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PrescriptionSchema = new Schema<IPrescription>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    encounterId: { type: Schema.Types.ObjectId, ref: 'Encounter', required: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    prescriptionNumber: { type: String, required: true },
    items: [
      {
        drugId: { type: Schema.Types.ObjectId, ref: 'Drug' },
        drugName: { type: String, required: true },
        genericName: String,
        dose: { type: String, required: true },
        frequency: { type: String, required: true },
        route: { type: String, required: true },
        duration: { type: String, required: true },
        quantity: { type: Number, required: true },
        instructions: String,
        substitutionAllowed: { type: Boolean, default: true },
        isDispensed: { type: Boolean, default: false },
        dispensedQuantity: { type: Number, default: 0 },
      },
    ],
    diagnosis: { type: [String], default: [] },
    advice: String,
    followUpDate: Date,
    followUpInstructions: String,
    doctorNotes: String,
    isSigned: { type: Boolean, default: false },
    signedAt: Date,
    qrCode: String,
    pdfUrl: String,
    isDispensed: { type: Boolean, default: false },
    dispensedAt: Date,
    dispensedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    validUntil: { type: Date, required: true },
  },
  { timestamps: true }
);

PrescriptionSchema.index({ tenantId: 1, patientId: 1, createdAt: -1 });
PrescriptionSchema.index({ tenantId: 1, encounterId: 1 });
PrescriptionSchema.index({ tenantId: 1, doctorId: 1, createdAt: -1 });

export const PrescriptionModel = mongoose.model<IPrescription>('Prescription', PrescriptionSchema);
