import { z } from 'zod';
import { WARD_TYPE, BED_STATUS } from '../constants.js';

export const AdmitPatientSchema = z.object({
  patientId: z.string().min(1),
  admittingDoctorId: z.string().min(1),
  wardId: z.string().min(1),
  bedId: z.string().min(1),
  admissionType: z.enum(['planned', 'emergency', 'transfer']).default('planned'),
  admissionReason: z.string().min(1).max(1000),
  diagnosis: z.string().max(500).optional(),
  referredBy: z.string().max(200).optional(),
  estimatedStay: z.number().int().positive().optional(),
  insurancePolicyId: z.string().optional(),
  mlcCase: z.boolean().default(false),
  mlcDetails: z.string().max(1000).optional(),
  emergencyContactNotified: z.boolean().default(false),
  dietType: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

export const VitalsSchema = z.object({
  admissionId: z.string().optional(),
  encounterId: z.string().optional(),
  systolicBp: z.number().int().min(0).max(300).optional(),
  diastolicBp: z.number().int().min(0).max(200).optional(),
  pulse: z.number().int().min(0).max(300).optional(),
  temperature: z.number().min(30).max(45).optional(),
  temperatureUnit: z.enum(['C', 'F']).default('C'),
  spo2: z.number().min(0).max(100).optional(),
  respiratoryRate: z.number().int().min(0).max(100).optional(),
  weight: z.number().min(0).max(500).optional(),
  height: z.number().min(0).max(300).optional(),
  bmi: z.number().optional(),
  bloodGlucose: z.number().optional(),
  painScore: z.number().int().min(0).max(10).optional(),
  gcsScore: z.number().int().min(3).max(15).optional(),
  notes: z.string().max(500).optional(),
  recordedAt: z.string().optional(),
});

export const BedTransferSchema = z.object({
  admissionId: z.string().min(1),
  newWardId: z.string().min(1),
  newBedId: z.string().min(1),
  reason: z.string().min(1).max(500),
  transferredBy: z.string().optional(),
});

export const DischargePatientSchema = z.object({
  admissionId: z.string().min(1),
  dischargeType: z.enum(['recovered', 'referred', 'lama', 'expired', 'against_advice']),
  finalDiagnosis: z.string().min(1).max(2000),
  treatmentSummary: z.string().min(1).max(5000),
  medications: z.string().max(2000).optional(),
  followUpDate: z.string().optional(),
  followUpInstructions: z.string().max(1000).optional(),
  dietAdvice: z.string().max(500).optional(),
  activityRestrictions: z.string().max(500).optional(),
  dischargeNotes: z.string().max(2000).optional(),
});

export const WardSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.nativeEnum(WARD_TYPE),
  floor: z.number().int().nonnegative().optional(),
  building: z.string().max(100).optional(),
  totalBeds: z.number().int().positive(),
  dailyCharges: z.number().nonnegative(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});

export const BedSchema = z.object({
  wardId: z.string().min(1),
  bedNumber: z.string().min(1).max(20),
  status: z.nativeEnum(BED_STATUS).default(BED_STATUS.AVAILABLE),
  features: z.array(z.string()).default([]),
  notes: z.string().max(200).optional(),
});

export type AdmitPatientInput = z.infer<typeof AdmitPatientSchema>;
export type VitalsInput = z.infer<typeof VitalsSchema>;
export type BedTransferInput = z.infer<typeof BedTransferSchema>;
export type DischargePatientInput = z.infer<typeof DischargePatientSchema>;
export type WardInput = z.infer<typeof WardSchema>;
export type BedInput = z.infer<typeof BedSchema>;
