import mongoose, { Schema, Document } from 'mongoose';
import type { Role, Permission } from '@hims/shared';
import { ROLE_PERMISSIONS } from '@hims/shared';

export interface IUser extends Document {
  tenantId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role: Role;
  permissions: Permission[];
  customPermissions?: Permission[];
  avatar?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  is2faEnabled: boolean;
  totpSecret?: string;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpiry?: Date;
  emailVerificationToken?: string;
  emailVerificationExpiry?: Date;
  googleId?: string;
  patientId?: mongoose.Types.ObjectId;
  doctorId?: mongoose.Types.ObjectId;
  deviceTokens: string[];
  preferredLanguage: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: String,
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      required: true,
      enum: ['super_admin', 'hospital_admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'radiologist', 'accountant', 'patient', 'ambulance_driver'],
    },
    permissions: { type: [String], default: [] },
    customPermissions: [String],
    avatar: String,
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    is2faEnabled: { type: Boolean, default: false },
    totpSecret: { type: String, select: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
    lastLoginAt: Date,
    lastLoginIp: String,
    passwordChangedAt: Date,
    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpiry: { type: Date, select: false },
    googleId: String,
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
    deviceTokens: { type: [String], default: [] },
    preferredLanguage: { type: String, default: 'en' },
  },
  { timestamps: true }
);

UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, phone: 1 }, { sparse: true });
UserSchema.index({ tenantId: 1, role: 1 });
UserSchema.index({ googleId: 1 }, { sparse: true });

// Auto-populate permissions from role
UserSchema.pre('save', function (next) {
  if (this.isModified('role')) {
    this.permissions = ROLE_PERMISSIONS[this.role as Role] ?? [];
  }
  next();
});

UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

export const UserModel = mongoose.model<IUser>('User', UserSchema);
