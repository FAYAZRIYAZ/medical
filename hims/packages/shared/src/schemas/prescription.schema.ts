import { z } from 'zod';
import { DOSAGE_FREQUENCY, DOSAGE_ROUTE } from '../constants.js';

export const PrescriptionItemSchema = z.object({
  drugId: z.string().min(1),
  drugName: z.string().min(1),
  genericName: z.string().optional(),
  dose: z.string().min(1).max(50),
  frequency: z.enum(DOSAGE_FREQUENCY),
  route: z.enum(DOSAGE_ROUTE),
  duration: z.string().min(1).max(50),
  quantity: z.number().int().positive(),
  instructions: z.string().max(500).optional(),
  substitutionAllowed: z.boolean().default(true),
});

export const CreatePrescriptionSchema = z.object({
  encounterId: z.string().min(1),
  patientId: z.string().min(1),
  items: z.array(PrescriptionItemSchema).min(1).max(30),
  diagnosis: z.array(z.string()).default([]),
  advice: z.string().max(2000).optional(),
  followUpDate: z.string().optional(),
  followUpInstructions: z.string().max(500).optional(),
  doctorNotes: z.string().max(2000).optional(),
});

export type CreatePrescriptionInput = z.infer<typeof CreatePrescriptionSchema>;
export type PrescriptionItemInput = z.infer<typeof PrescriptionItemSchema>;
