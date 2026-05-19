import { z } from 'zod';
import { INVOICE_STATUS, PAYMENT_METHOD } from '../constants.js';

export const InvoiceItemSchema = z.object({
  serviceId: z.string().optional(),
  serviceName: z.string().min(1),
  category: z.enum(['consultation', 'procedure', 'lab', 'pharmacy', 'room_rent', 'surgery', 'radiology', 'nursing', 'other']),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().nonnegative(),
  discount: z.number().min(0).max(100).default(0),
  gstRate: z.number().min(0).max(28).default(0),
  hsnSacCode: z.string().max(20).optional(),
  notes: z.string().max(200).optional(),
});

export const CreateInvoiceSchema = z.object({
  patientId: z.string().min(1),
  encounterId: z.string().optional(),
  admissionId: z.string().optional(),
  items: z.array(InvoiceItemSchema).min(1),
  discountAmount: z.number().nonnegative().default(0),
  discountReason: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  insurancePolicyId: z.string().optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export const RecordPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  method: z.nativeEnum(PAYMENT_METHOD),
  reference: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export const InvoiceListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  patientId: z.string().optional(),
  status: z.nativeEnum(INVOICE_STATUS).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['createdAt', 'dueDate', 'totalAmount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;
export type InvoiceItemInput = z.infer<typeof InvoiceItemSchema>;
export type InvoiceListInput = z.infer<typeof InvoiceListSchema>;
