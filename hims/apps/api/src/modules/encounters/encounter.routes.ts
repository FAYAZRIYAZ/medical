import { Router } from 'express';
import type { Request, Response } from 'express';
import { EncounterModel } from './encounter.model.js';
import { AppointmentModel } from '../appointments/appointment.model.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { tenantContext } from '../../middleware/tenant.js';
import { sendSuccess } from '../../utils/response.js';
import { NotFoundError } from '../../utils/errors.js';
import { APPOINTMENT_STATUS } from '@hims/shared';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';

const CreateEncounterSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  appointmentId: z.string().optional(),
  departmentId: z.string().min(1),
  encounterType: z.enum(['opd', 'ipd', 'emergency', 'telemedicine']).default('opd'),
  chiefComplaints: z.array(z.string()).default([]),
  historyOfPresentIllness: z.string().max(5000).optional(),
  pastMedicalHistory: z.string().max(5000).optional(),
  familyHistory: z.string().max(2000).optional(),
  socialHistory: z.string().max(2000).optional(),
  reviewOfSystems: z.string().max(5000).optional(),
  physicalExamination: z.string().max(5000).optional(),
  impression: z.string().max(2000).optional(),
  diagnosis: z.array(z.object({
    icd10Code: z.string().optional(),
    description: z.string().min(1),
    type: z.enum(['primary', 'secondary', 'comorbidity']).default('primary'),
  })).default([]),
  treatmentPlan: z.string().max(5000).optional(),
  advice: z.string().max(2000).optional(),
  followUpDate: z.string().optional(),
  followUpInstructions: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});

const router = Router();
router.use(authenticate, tenantContext);

router.post('/', requirePermission('encounter:create'), validate(CreateEncounterSchema), async (req: Request, res: Response) => {
  const data = req.body as z.infer<typeof CreateEncounterSchema>;
  const encounter = await EncounterModel.create({
    ...data,
    tenantId: req.tenantId,
    encounterDate: new Date(),
    followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
  });

  // Update appointment status to in_progress
  if (data.appointmentId) {
    await AppointmentModel.findByIdAndUpdate(data.appointmentId, {
      status: APPOINTMENT_STATUS.IN_PROGRESS,
      encounterId: encounter._id,
      consultationStartedAt: new Date(),
    });
  }

  sendSuccess(res, encounter.toObject(), 201);
});

router.get('/', requirePermission('encounter:read'), async (req: Request, res: Response) => {
  const { patientId, doctorId, page = '1', limit = '20' } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = { tenantId: req.tenantId };
  if (patientId) filter['patientId'] = patientId;
  if (doctorId) filter['doctorId'] = doctorId;

  const p = parseInt(page, 10);
  const l = parseInt(limit, 10);

  const [total, encounters] = await Promise.all([
    EncounterModel.countDocuments(filter),
    EncounterModel.find(filter)
      .populate('patientId', 'firstName lastName uhid')
      .populate('doctorId', 'firstName lastName specialization')
      .sort({ encounterDate: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .lean(),
  ]);

  sendSuccess(res, encounters, 200, {
    pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l), hasNextPage: p < Math.ceil(total / l), hasPrevPage: p > 1 },
  });
});

router.get('/:id', requirePermission('encounter:read'), async (req: Request, res: Response) => {
  const encounter = await EncounterModel.findOne({ _id: req.params['id'], tenantId: req.tenantId })
    .populate('patientId', 'firstName lastName uhid phone dateOfBirth gender bloodGroup allergies chronicConditions')
    .populate('doctorId', 'firstName lastName specialization registrationNumber signatureImage')
    .populate('departmentId', 'name code')
    .lean();
  if (!encounter) throw new NotFoundError('Encounter');
  sendSuccess(res, encounter);
});

router.patch('/:id', requirePermission('encounter:update'), validate(CreateEncounterSchema.partial()), async (req: Request, res: Response) => {
  const encounter = await EncounterModel.findOneAndUpdate(
    { _id: req.params['id'], tenantId: req.tenantId },
    { $set: req.body },
    { new: true }
  ).lean();
  if (!encounter) throw new NotFoundError('Encounter');
  sendSuccess(res, encounter);
});

router.post('/:id/sign', requirePermission('prescription:sign'), async (req: Request, res: Response) => {
  const encounter = await EncounterModel.findOneAndUpdate(
    { _id: req.params['id'], tenantId: req.tenantId, doctorId: req.user!.doctorId ?? req.user!._id },
    { isSigned: true, signedAt: new Date(), status: 'completed' },
    { new: true }
  ).lean();
  if (!encounter) throw new NotFoundError('Encounter');
  sendSuccess(res, encounter);
});

export default router;
