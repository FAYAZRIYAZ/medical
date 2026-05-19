import { z } from 'zod';
import { BLOOD_GROUP, GENDER } from '../constants.js';

export const AddressSchema = z.object({
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
  country: z.string().default('India'),
});

export const EmergencyContactSchema = z.object({
  name: z.string().min(1).max(100),
  relationship: z.string().min(1).max(50),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/),
});

export const InsurancePolicySchema = z.object({
  companyName: z.string().min(1).max(200),
  policyNumber: z.string().min(1).max(100),
  groupNumber: z.string().max(100).optional(),
  subscriberName: z.string().min(1).max(200),
  subscriberDob: z.string().optional(),
  coverageType: z.enum(['individual', 'family', 'group']),
  validFrom: z.string(),
  validTo: z.string(),
  tpaName: z.string().max(200).optional(),
  tpaId: z.string().max(100).optional(),
  preAuthRequired: z.boolean().default(false),
  cashless: z.boolean().default(false),
  sumInsured: z.number().positive().optional(),
});

export const CreatePatientSchema = z.object({
  firstName: z.string().min(1).max(50).trim(),
  middleName: z.string().max(50).trim().optional(),
  lastName: z.string().min(1).max(50).trim(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  gender: z.enum(GENDER),
  bloodGroup: z.enum(BLOOD_GROUP).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/),
  alternatePhone: z.string().regex(/^\+?[1-9]\d{9,14}$/).optional(),
  email: z.string().email().optional(),
  address: AddressSchema.optional(),
  emergencyContacts: z.array(EmergencyContactSchema).max(3).default([]),
  allergies: z.array(z.string().max(200)).default([]),
  chronicConditions: z.array(z.string().max(200)).default([]),
  occupation: z.string().max(100).optional(),
  nationality: z.string().max(100).default('Indian'),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed', 'other']).optional(),
  governmentId: z
    .object({
      type: z.enum(['aadhaar', 'pan', 'passport', 'voter_id', 'driving_license']),
      number: z.string().min(1).max(50),
    })
    .optional(),
  insurancePolicies: z.array(InsurancePolicySchema).default([]),
  familyHead: z.string().optional(),
  referredBy: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const UpdatePatientSchema = CreatePatientSchema.partial();

export const PatientSearchSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['name', 'uhid', 'createdAt', 'dateOfBirth']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  gender: z.enum(GENDER).optional(),
  bloodGroup: z.enum(BLOOD_GROUP).optional(),
});

export type CreatePatientInput = z.infer<typeof CreatePatientSchema>;
export type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>;
export type PatientSearchInput = z.infer<typeof PatientSearchSchema>;
export type AddressInput = z.infer<typeof AddressSchema>;
export type EmergencyContactInput = z.infer<typeof EmergencyContactSchema>;
export type InsurancePolicyInput = z.infer<typeof InsurancePolicySchema>;
