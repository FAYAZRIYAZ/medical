import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartment extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  headDoctorId?: mongoose.Types.ObjectId;
  location?: string;
  floor?: number;
  phone?: string;
  email?: string;
  color?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: String,
    headDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
    location: String,
    floor: Number,
    phone: String,
    email: { type: String, lowercase: true },
    color: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DepartmentSchema.index({ tenantId: 1, code: 1 }, { unique: true });
DepartmentSchema.index({ tenantId: 1, isActive: 1 });

export const DepartmentModel = mongoose.model<IDepartment>('Department', DepartmentSchema);
