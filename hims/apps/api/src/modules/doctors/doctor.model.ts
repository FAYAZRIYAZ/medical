import mongoose, { Schema, Document } from 'mongoose';

export interface IDoctor extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization: string;
  qualification: string[];
  registrationNumber: string;
  experience: number;
  departmentIds: mongoose.Types.ObjectId[];
  avatar?: string;
  bio?: string;
  languages: string[];
  consultationFee: number;
  teleConsultationFee?: number;
  schedule: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDuration: number;
    maxSlots?: number;
    isActive: boolean;
    departmentId: mongoose.Types.ObjectId;
    locationId?: string;
  }>;
  signatureImage?: string;
  isAvailable: boolean;
  isActive: boolean;
  rating?: number;
  totalReviews?: number;
  createdAt: Date;
  updatedAt: Date;
}

const DoctorSchema = new Schema<IDoctor>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    specialization: { type: String, required: true },
    qualification: { type: [String], default: [] },
    registrationNumber: { type: String, required: true },
    experience: { type: Number, default: 0 },
    departmentIds: [{ type: Schema.Types.ObjectId, ref: 'Department' }],
    avatar: String,
    bio: String,
    languages: { type: [String], default: ['English'] },
    consultationFee: { type: Number, default: 0 },
    teleConsultationFee: Number,
    schedule: [
      {
        dayOfWeek: { type: Number, min: 0, max: 6 },
        startTime: String,
        endTime: String,
        slotDuration: { type: Number, default: 15 },
        maxSlots: Number,
        isActive: { type: Boolean, default: true },
        departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
        locationId: String,
      },
    ],
    signatureImage: String,
    isAvailable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    rating: Number,
    totalReviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

DoctorSchema.index({ tenantId: 1, isActive: 1 });
DoctorSchema.index({ tenantId: 1, specialization: 1 });
DoctorSchema.index({ tenantId: 1, departmentIds: 1 });
DoctorSchema.index({ registrationNumber: 1, tenantId: 1 }, { unique: true });

DoctorSchema.virtual('fullName').get(function () {
  return `Dr. ${this.firstName} ${this.lastName}`;
});

export const DoctorModel = mongoose.model<IDoctor>('Doctor', DoctorSchema);
