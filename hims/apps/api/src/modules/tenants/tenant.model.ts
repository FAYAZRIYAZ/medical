import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  slug: string;
  logo?: string;
  tagline?: string;
  phone: string;
  email: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  website?: string;
  registrationNumber?: string;
  gstNumber?: string;
  currency: 'INR' | 'USD';
  timezone: string;
  locale: string;
  uhidPrefix: string;
  uhidSequence: number;
  enabledModules: string[];
  features: Record<string, boolean>;
  subscriptionPlan: 'free' | 'starter' | 'professional' | 'enterprise';
  subscriptionExpiry?: Date;
  isActive: boolean;
  settings: {
    appointmentSlotDuration: number;
    workingDays: number[];
    workingHours: { start: string; end: string };
    enableOnlineBooking: boolean;
    requireInsurance: boolean;
    autoSendReports: boolean;
    enableTelemedicine: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logo: String,
    tagline: String,
    phone: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    address: {
      line1: { type: String, required: true },
      line2: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, default: 'India' },
    },
    website: String,
    registrationNumber: String,
    gstNumber: String,
    currency: { type: String, enum: ['INR', 'USD'], default: 'INR' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    locale: { type: String, default: 'en-IN' },
    uhidPrefix: { type: String, default: 'UHID' },
    uhidSequence: { type: Number, default: 0 },
    enabledModules: {
      type: [String],
      default: ['opd', 'ipd', 'pharmacy', 'lab', 'billing', 'telemedicine'],
    },
    features: { type: Schema.Types.Mixed, default: {} },
    subscriptionPlan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'starter',
    },
    subscriptionExpiry: Date,
    isActive: { type: Boolean, default: true },
    settings: {
      appointmentSlotDuration: { type: Number, default: 15 },
      workingDays: { type: [Number], default: [1, 2, 3, 4, 5, 6] },
      workingHours: { start: { type: String, default: '09:00' }, end: { type: String, default: '18:00' } },
      enableOnlineBooking: { type: Boolean, default: true },
      requireInsurance: { type: Boolean, default: false },
      autoSendReports: { type: Boolean, default: true },
      enableTelemedicine: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

TenantSchema.index({ isActive: 1 });

export const TenantModel = mongoose.model<ITenant>('Tenant', TenantSchema);
