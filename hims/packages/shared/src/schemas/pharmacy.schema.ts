import { z } from 'zod';
import { DRUG_SCHEDULE } from '../constants.js';

export const DrugMasterSchema = z.object({
  genericName: z.string().min(1).max(200),
  brandName: z.string().min(1).max(200),
  composition: z.string().max(500).optional(),
  schedule: z.enum(DRUG_SCHEDULE).default('general'),
  category: z.string().max(100).optional(),
  form: z.enum(['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'powder', 'suppository', 'patch', 'other']),
  strength: z.string().max(100),
  unit: z.string().max(50).default('mg'),
  manufacturer: z.string().max(200).optional(),
  hsn: z.string().max(20).optional(),
  gstRate: z.number().min(0).max(28).default(12),
  requiresPrescription: z.boolean().default(true),
  isNarcotic: z.boolean().default(false),
  storageInstructions: z.string().max(200).optional(),
  interactions: z.array(z.string()).default([]),
  contraindications: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const AddStockSchema = z.object({
  drugId: z.string().min(1),
  vendorId: z.string().optional(),
  batchNumber: z.string().min(1).max(100),
  quantity: z.number().int().positive(),
  unitCostPrice: z.number().nonnegative(),
  unitMrp: z.number().nonnegative(),
  manufacturingDate: z.string().optional(),
  expiryDate: z.string(),
  purchaseOrderId: z.string().optional(),
  invoiceNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const DispensePrescriptionSchema = z.object({
  prescriptionId: z.string().min(1),
  items: z.array(
    z.object({
      prescriptionItemId: z.string().min(1),
      drugId: z.string().min(1),
      batchId: z.string().min(1),
      quantityDispensed: z.number().int().positive(),
    })
  ).min(1),
  notes: z.string().max(500).optional(),
});

export const StockAdjustmentSchema = z.object({
  drugId: z.string().min(1),
  batchId: z.string().min(1),
  adjustment: z.number().int(),
  reason: z.enum(['correction', 'damaged', 'expired', 'theft', 'other']),
  notes: z.string().max(500).optional(),
});

export type DrugMasterInput = z.infer<typeof DrugMasterSchema>;
export type AddStockInput = z.infer<typeof AddStockSchema>;
export type DispensePrescriptionInput = z.infer<typeof DispensePrescriptionSchema>;
export type StockAdjustmentInput = z.infer<typeof StockAdjustmentSchema>;
