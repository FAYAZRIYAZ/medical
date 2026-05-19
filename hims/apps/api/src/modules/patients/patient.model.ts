import mongoose, { Schema, Document } from 'mongoose';
import type { BloodGroup, Gender } from '@hims/shared';

export interface IPatient extends Document {
  tenantId: mongoose.Types.ObjectId;
  uhid: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  bloodGroup?: BloodGroup;
  phone: string;
  alternatePhone?: string;
  email?: string;
  photo?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  emergencyContacts: Array<{ name: string; relationship: string; phone: string }>;
  allergies: string[];
  chronicConditions: string[];
  occupation?: string;
  nationality: string;
  maritalStatus?: string;
  governmentId?: { type: string; number: string; documentUrl?: string };
  insurancePolicies: Array<{
    companyName: string;
    policyNumber: string;
    groupNumber?: string;
    subscriberName: string;
    coverageType: string;
    validFrom: Date;
    validTo: Date;
    tpaName?: string;
    cashless: boolean;
    sumInsured?: number;
    isActive: boolean;
  }>;
  familyHead?: mongoose.Types.ObjectId;
  referredBy?: string;
  notes?: string;
  isActive: boolean;
  isDeceased: boolean;
  userId?: mongoose.Types.ObjectId;
  registeredBy?: mongoose.Types.ObjectId;
  lastVisit?: Date;
  totalVisits: number;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    uhid: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, required: true, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    phone: { type: String, required: true, index: true },
    alternatePhone: String,
    email: { type: String, lowercase: true },
    photo: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' },
    },
    emergencyContacts: [
      {
        name: { type: String, required: true },
        relationship: { type: String, required: true },
        phone: { type: String, required: true },
      },
    ],
    allergies: { type: [String], default: [] },
    chronicConditions: { type: [String], default: [] },
    occupation: String,
    nationality: { type: String, default: 'Indian' },
    maritalStatus: { type: String, enum: ['single', 'married', 'divorced', 'widowed', 'other'] },
    governmentId: { type: { type: String }, number: String, documentUrl: String },
    insurancePolicies: [
      {
        companyName: { type: String, required: true },
        policyNumber: { type: String, required: true },
        groupNumber: String,
        subscriberName: { type: String, required: true },
        coverageType: { type: String, enum: ['individual', 'family', 'group'] },
        validFrom: Date,
        validTo: Date,
        tpaName: String,
        cashless: { type: Boolean, default: false },
        sumInsured: Number,
        isActive: { type: Boolean, default: true },
      },
    ],
    familyHead: { type: Schema.Types.ObjectId, ref: 'Patient' },
    referredBy: String,
    notes: String,
    isActive: { type: Boolean, default: true },
    isDeceased: { type: Boolean, default: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    registeredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastVisit: Date,
    totalVisits: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PatientSchema.index({ tenantId: 1, uhid: 1 }, { unique: true });
PatientSchema.index({ tenantId: 1, phone: 1 });
PatientSchema.index({ tenantId: 1, email: 1 }, { sparse: true });
PatientSchema.index({ tenantId: 1, firstName: 1, lastName: 1 });
PatientSchema.index(
  { firstName: 'text', lastName: 'text', uhid: 'text', phone: 'text' },
  { weights: { uhid: 10, phone: 5, firstName: 3, lastName: 3 } }
);

PatientSchema.virtual('fullName').get(function () {
  return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
});

export const PatientModel = mongoose.model<IPatient>('Patient', PatientSchema);
