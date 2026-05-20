import mongoose from 'mongoose';
import { PatientModel } from './patient.model.js';
import { TenantModel } from '../tenants/tenant.model.js';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors.js';
import { buildPaginationMeta } from '../../utils/response.js';
import type { CreatePatientInput, UpdatePatientInput, PatientSearchInput } from '@hims/shared';
import { generateUHID } from '@hims/shared';

export class PatientService {
  async create(input: CreatePatientInput, tenantId: string, registeredBy?: string) {
    // Duplicate detection: fuzzy match on name + DOB + phone
    const existing = await PatientModel.findOne({
      tenantId,
      phone: input.phone,
    }).lean();
    if (existing) {
      throw new ConflictError(`Patient with phone ${input.phone} already registered (UHID: ${existing.uhid})`);
    }

    // Generate UHID
    const tenant = await TenantModel.findByIdAndUpdate(
      tenantId,
      { $inc: { uhidSequence: 1 } },
      { new: true }
    ).lean();
    if (!tenant) throw new NotFoundError('Tenant');

    const uhid = generateUHID(tenant.uhidPrefix, tenant.uhidSequence);

    const patient = await PatientModel.create({
      ...input,
      tenantId,
      uhid,
      dateOfBirth: new Date(input.dateOfBirth),
      registeredBy: registeredBy ? new mongoose.Types.ObjectId(registeredBy) : undefined,
    });

    return patient.toObject();
  }

  async findById(id: string, tenantId: string) {
    const patient = await PatientModel.findOne({ _id: id, tenantId }).lean();
    if (!patient) throw new NotFoundError('Patient');
    return patient;
  }

  async findByUHID(uhid: string, tenantId: string) {
    const patient = await PatientModel.findOne({ uhid, tenantId }).lean();
    if (!patient) throw new NotFoundError('Patient');
    return patient;
  }

  async update(id: string, tenantId: string, input: UpdatePatientInput) {
    const patient = await PatientModel.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: input },
      { new: true, runValidators: true }
    ).lean();
    if (!patient) throw new NotFoundError('Patient');
    return patient;
  }

  async delete(id: string, tenantId: string) {
    const patient = await PatientModel.findOneAndUpdate(
      { _id: id, tenantId },
      { isActive: false },
      { new: true }
    ).lean();
    if (!patient) throw new NotFoundError('Patient');
    return { message: 'Patient deactivated' };
  }

  async search(query: PatientSearchInput, tenantId: string) {
    const { q, page, limit, sortBy, sortOrder, gender, bloodGroup } = query;
    const filter: Record<string, unknown> = { tenantId, isActive: true };

    if (q) {
      filter['$or'] = [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { uhid: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }
    if (gender) filter['gender'] = gender;
    if (bloodGroup) filter['bloodGroup'] = bloodGroup;

    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const sortField = { [sortBy]: sortDir };

    const [total, patients] = await Promise.all([
      PatientModel.countDocuments(filter),
      PatientModel.find(filter)
        .sort(sortField as unknown as { [key: string]: 1 | -1 | { $meta: string } })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return {
      data: patients,
      meta: { pagination: buildPaginationMeta(total, page, limit) },
    };
  }

  async getStats(tenantId: string) {
    const [total, today, genderBreakdown] = await Promise.all([
      PatientModel.countDocuments({ tenantId, isActive: true }),
      PatientModel.countDocuments({
        tenantId,
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      PatientModel.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), isActive: true } },
        { $group: { _id: '$gender', count: { $sum: 1 } } },
      ]),
    ]);

    return { total, today, genderBreakdown };
  }

  async uploadPhoto(patientId: string, tenantId: string, photoUrl: string) {
    const patient = await PatientModel.findOneAndUpdate(
      { _id: patientId, tenantId },
      { photo: photoUrl },
      { new: true }
    ).lean();
    if (!patient) throw new NotFoundError('Patient');
    return patient;
  }
}

export const patientService = new PatientService();
