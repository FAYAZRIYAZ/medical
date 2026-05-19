import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoice extends Document {
  tenantId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  patientId: mongoose.Types.ObjectId;
  encounterId?: mongoose.Types.ObjectId;
  admissionId?: mongoose.Types.ObjectId;
  items: Array<{
    serviceId: string;
    serviceName: string;
    category: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    gstRate: number;
    hsnSacCode?: string;
    subtotal: number;
    gstAmount: number;
    total: number;
    notes?: string;
  }>;
  subtotal: number;
  discountAmount: number;
  discountReason?: string;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  insurancePolicyId?: mongoose.Types.ObjectId;
  insuranceClaimId?: mongoose.Types.ObjectId;
  notes?: string;
  dueDate?: Date;
  isPackageBilling: boolean;
  packageName?: string;
  idempotencyKey?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPayment extends Document {
  tenantId: mongoose.Types.ObjectId;
  invoiceId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  paymentNumber: string;
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  refundAmount?: number;
  refundedAt?: Date;
  refundedBy?: mongoose.Types.ObjectId;
  idempotencyKey?: string;
  recordedBy?: mongoose.Types.ObjectId;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  invoiceNumber: { type: String, required: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Encounter' },
  admissionId: { type: Schema.Types.ObjectId, ref: 'Admission' },
  items: [{
    serviceId: String,
    serviceName: { type: String, required: true },
    category: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    gstRate: { type: Number, default: 0 },
    hsnSacCode: String,
    subtotal: Number,
    gstAmount: Number,
    total: Number,
    notes: String,
  }],
  subtotal: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  discountReason: String,
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  dueAmount: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'issued', 'partial', 'paid', 'overdue', 'cancelled', 'refunded'], default: 'issued' },
  insurancePolicyId: { type: Schema.Types.ObjectId },
  insuranceClaimId: { type: Schema.Types.ObjectId },
  notes: String,
  dueDate: Date,
  isPackageBilling: { type: Boolean, default: false },
  packageName: String,
  idempotencyKey: { type: String, sparse: true, unique: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

InvoiceSchema.index({ tenantId: 1, patientId: 1 });
InvoiceSchema.index({ tenantId: 1, status: 1 });
InvoiceSchema.index({ tenantId: 1, createdAt: -1 });

const PaymentSchema = new Schema<IPayment>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  paymentNumber: { type: String, required: true },
  amount: { type: Number, required: true },
  method: { type: String, required: true, enum: ['cash', 'card', 'upi', 'net_banking', 'cheque', 'wallet', 'insurance'] },
  reference: String,
  notes: String,
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'completed' },
  gatewayOrderId: String,
  gatewayPaymentId: String,
  gatewaySignature: String,
  refundAmount: Number,
  refundedAt: Date,
  refundedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  idempotencyKey: { type: String, sparse: true, unique: true },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  paidAt: { type: Date, default: Date.now },
}, { timestamps: true });

PaymentSchema.index({ tenantId: 1, invoiceId: 1 });
PaymentSchema.index({ tenantId: 1, paidAt: -1 });

export const InvoiceModel = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
export const PaymentModel = mongoose.model<IPayment>('Payment', PaymentSchema);
