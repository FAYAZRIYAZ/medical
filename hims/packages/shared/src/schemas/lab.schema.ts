import { z } from 'zod';
import { LAB_ORDER_STATUS } from '../constants.js';

export const LabOrderItemSchema = z.object({
  testId: z.string().min(1),
  testName: z.string().min(1),
  panelId: z.string().optional(),
  urgent: z.boolean().default(false),
  clinicalNotes: z.string().max(500).optional(),
});

export const CreateLabOrderSchema = z.object({
  patientId: z.string().min(1),
  encounterId: z.string().optional(),
  admissionId: z.string().optional(),
  doctorId: z.string().min(1),
  items: z.array(LabOrderItemSchema).min(1),
  clinicalHistory: z.string().max(1000).optional(),
  priority: z.enum(['routine', 'urgent', 'stat']).default('routine'),
});

export const LabResultEntrySchema = z.object({
  orderId: z.string().min(1),
  results: z.array(
    z.object({
      testId: z.string().min(1),
      parameter: z.string().min(1),
      value: z.union([z.string(), z.number()]),
      unit: z.string().optional(),
      referenceRange: z.string().optional(),
      abnormal: z.boolean().default(false),
      critical: z.boolean().default(false),
      notes: z.string().max(500).optional(),
    })
  ).min(1),
  sampleCollectedAt: z.string().optional(),
  technician: z.string().optional(),
  instrumentUsed: z.string().max(200).optional(),
});

export const LabTestCatalogSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(50),
  sampleType: z.string().min(1).max(100),
  container: z.string().max(100).optional(),
  turnaroundHours: z.number().int().positive().default(24),
  price: z.number().nonnegative(),
  parameters: z.array(
    z.object({
      name: z.string().min(1),
      unit: z.string().optional(),
      referenceRange: z.object({
        male: z.string().optional(),
        female: z.string().optional(),
        child: z.string().optional(),
        general: z.string().optional(),
      }).optional(),
      method: z.string().optional(),
    })
  ).default([]),
  instructions: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});

export type CreateLabOrderInput = z.infer<typeof CreateLabOrderSchema>;
export type LabResultEntryInput = z.infer<typeof LabResultEntrySchema>;
export type LabTestCatalogInput = z.infer<typeof LabTestCatalogSchema>;
export type LabOrderItemInput = z.infer<typeof LabOrderItemSchema>;
