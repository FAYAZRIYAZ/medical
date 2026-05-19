import { Router } from 'express';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { WardModel, BedModel, AdmissionModel, VitalsModel } from './ipd.model.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { tenantContext } from '../../middleware/tenant.js';
import { sendSuccess } from '../../utils/response.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';
import { validate } from '../../middleware/validate.js';
import { AdmitPatientSchema, VitalsSchema, DischargePatientSchema, WardSchema, BedSchema } from '@hims/shared';
import { notificationQueue, pdfQueue } from '../../jobs/queues.js';

const router = Router();
router.use(authenticate, tenantContext);

// ── Wards ──────────────────────────────────────────────────────────────────

router.get('/wards', requirePermission('ipd:read'), async (req: Request, res: Response) => {
  const wards = await WardModel.find({ tenantId: req.tenantId, isActive: true }).lean();
  sendSuccess(res, wards);
});

router.post('/wards', requirePermission('admin:settings'), validate(WardSchema), async (req: Request, res: Response) => {
  const ward = await WardModel.create({ ...req.body, tenantId: req.tenantId });
  sendSuccess(res, ward.toObject(), 201);
});

// ── Beds ───────────────────────────────────────────────────────────────────

router.get('/beds', requirePermission('ipd:read'), async (req: Request, res: Response) => {
  const { wardId, status } = req.query as { wardId?: string; status?: string };
  const filter: Record<string, unknown> = { tenantId: req.tenantId };
  if (wardId) filter['wardId'] = wardId;
  if (status) filter['status'] = status;

  const beds = await BedModel.find(filter)
    .populate('wardId', 'name type floor')
    .populate('currentAdmissionId', 'patientId admittedAt')
    .lean();
  sendSuccess(res, beds);
});

router.post('/beds', requirePermission('admin:settings'), validate(BedSchema), async (req: Request, res: Response) => {
  const bed = await BedModel.create({ ...req.body, tenantId: req.tenantId });
  sendSuccess(res, bed.toObject(), 201);
});

router.get('/beds/availability', requirePermission('ipd:read'), async (req: Request, res: Response) => {
  const summary = await WardModel.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(req.tenantId!), isActive: true } },
    {
      $lookup: {
        from: 'beds',
        let: { wardId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$wardId', '$$wardId'] } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ],
        as: 'bedStats',
      },
    },
    {
      $project: {
        name: 1, type: 1, totalBeds: 1, dailyCharges: 1,
        bedStats: 1,
        available: { $ifNull: [{ $arrayElemAt: [{ $filter: { input: '$bedStats', cond: { $eq: ['$$this._id', 'available'] } } }, 0] }, { count: 0 }] },
      },
    },
  ]);
  sendSuccess(res, summary);
});

// ── Admissions ─────────────────────────────────────────────────────────────

router.post('/admissions', requirePermission('ipd:admit'), validate(AdmitPatientSchema), async (req: Request, res: Response) => {
  const data = req.body as typeof AdmitPatientSchema._type;

  // Check bed availability
  const bed = await BedModel.findOne({ _id: data.bedId, tenantId: req.tenantId, status: 'available' }).lean();
  if (!bed) throw new ConflictError('Bed is not available');

  const admissionNumber = `IPD-${Date.now()}`;
  const admission = await AdmissionModel.create({
    ...data,
    tenantId: req.tenantId,
    admissionNumber,
    admittedAt: new Date(),
    bedHistory: [{ wardId: data.wardId, bedId: data.bedId, fromDate: new Date() }],
  });

  // Mark bed as occupied
  await BedModel.findByIdAndUpdate(data.bedId, {
    status: 'occupied',
    currentAdmissionId: admission._id,
  });

  await notificationQueue.add('patient-admitted', {
    admissionId: admission._id.toString(),
    patientId: data.patientId,
  });

  sendSuccess(res, admission.toObject(), 201);
});

router.get('/admissions', requirePermission('ipd:read'), async (req: Request, res: Response) => {
  const { status = 'active', page = '1', limit = '20' } = req.query as Record<string, string>;
  const p = parseInt(page, 10);
  const l = parseInt(limit, 10);
  const filter: Record<string, unknown> = { tenantId: req.tenantId };
  if (status !== 'all') filter['status'] = status;

  const [total, admissions] = await Promise.all([
    AdmissionModel.countDocuments(filter),
    AdmissionModel.find(filter)
      .populate('patientId', 'firstName lastName uhid phone bloodGroup dateOfBirth gender')
      .populate('admittingDoctorId', 'firstName lastName specialization')
      .populate('wardId', 'name type')
      .populate('bedId', 'bedNumber')
      .sort({ admittedAt: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .lean(),
  ]);

  sendSuccess(res, admissions, 200, {
    pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l), hasNextPage: p < Math.ceil(total / l), hasPrevPage: p > 1 },
  });
});

router.get('/admissions/:id', requirePermission('ipd:read'), async (req: Request, res: Response) => {
  const admission = await AdmissionModel.findOne({ _id: req.params['id'], tenantId: req.tenantId })
    .populate('patientId')
    .populate('admittingDoctorId', 'firstName lastName specialization registrationNumber')
    .populate('wardId', 'name type floor dailyCharges')
    .populate('bedId', 'bedNumber features')
    .lean();
  if (!admission) throw new NotFoundError('Admission');
  sendSuccess(res, admission);
});

router.post('/admissions/:id/discharge', requirePermission('ipd:discharge'), validate(DischargePatientSchema.omit({ admissionId: true })), async (req: Request, res: Response) => {
  const admission = await AdmissionModel.findOne({ _id: req.params['id'], tenantId: req.tenantId, status: 'active' }).lean();
  if (!admission) throw new NotFoundError('Active admission');

  const data = req.body as Omit<typeof DischargePatientSchema._type, 'admissionId'>;

  const updated = await AdmissionModel.findByIdAndUpdate(
    req.params['id'],
    {
      ...data,
      status: 'discharged',
      dischargedAt: new Date(),
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
    },
    { new: true }
  ).lean();

  // Free the bed
  await BedModel.findByIdAndUpdate(admission.bedId, { status: 'available', $unset: { currentAdmissionId: 1 } });

  // Generate discharge summary PDF
  await pdfQueue.add('generate-discharge-summary', { admissionId: req.params['id'] });

  await notificationQueue.add('patient-discharged', {
    admissionId: req.params['id'],
    patientId: admission.patientId.toString(),
  });

  sendSuccess(res, updated);
});

router.post('/admissions/:id/transfer', requirePermission('ipd:update'), async (req: Request, res: Response) => {
  const { newWardId, newBedId, reason } = req.body as { newWardId: string; newBedId: string; reason: string };

  const admission = await AdmissionModel.findOne({ _id: req.params['id'], tenantId: req.tenantId, status: 'active' }).lean();
  if (!admission) throw new NotFoundError('Active admission');

  const newBed = await BedModel.findOne({ _id: newBedId, tenantId: req.tenantId, status: 'available' }).lean();
  if (!newBed) throw new ConflictError('Target bed is not available');

  // Free old bed, occupy new
  await BedModel.findByIdAndUpdate(admission.bedId, { status: 'available', $unset: { currentAdmissionId: 1 } });
  await BedModel.findByIdAndUpdate(newBedId, { status: 'occupied', currentAdmissionId: admission._id });

  const updated = await AdmissionModel.findByIdAndUpdate(
    req.params['id'],
    {
      wardId: newWardId,
      bedId: newBedId,
      $push: {
        bedHistory: {
          wardId: admission.wardId,
          bedId: admission.bedId,
          fromDate: admission.admittedAt,
          toDate: new Date(),
          reason,
        },
      },
    },
    { new: true }
  ).lean();

  sendSuccess(res, updated);
});

// ── Vitals ─────────────────────────────────────────────────────────────────

router.post('/vitals', requirePermission('vitals:record'), validate(VitalsSchema), async (req: Request, res: Response) => {
  const data = req.body as typeof VitalsSchema._type;
  if (data.weight && data.height) {
    const hm = data.height / 100;
    data.bmi = Math.round((data.weight / (hm * hm)) * 10) / 10;
  }
  const vitals = await VitalsModel.create({
    ...data,
    tenantId: req.tenantId,
    recordedBy: req.user!._id,
    recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
  });
  sendSuccess(res, vitals.toObject(), 201);
});

router.get('/vitals', requirePermission('vitals:read'), async (req: Request, res: Response) => {
  const { patientId, admissionId, limit = '10' } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = { tenantId: req.tenantId };
  if (patientId) filter['patientId'] = patientId;
  if (admissionId) filter['admissionId'] = admissionId;

  const vitals = await VitalsModel.find(filter)
    .sort({ recordedAt: -1 })
    .limit(parseInt(limit, 10))
    .lean();
  sendSuccess(res, vitals);
});

export default router;
