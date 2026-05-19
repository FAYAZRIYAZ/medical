import { Router } from 'express';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { PrescriptionModel } from './prescription.model.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { tenantContext } from '../../middleware/tenant.js';
import { sendSuccess } from '../../utils/response.js';
import { NotFoundError } from '../../utils/errors.js';
import { validate } from '../../middleware/validate.js';
import { CreatePrescriptionSchema } from '@hims/shared';
import { pdfQueue, notificationQueue } from '../../jobs/queues.js';

const router = Router();
router.use(authenticate, tenantContext);

let prescriptionCounter = 0;

router.post('/', requirePermission('prescription:create'), validate(CreatePrescriptionSchema), async (req: Request, res: Response) => {
  prescriptionCounter++;
  const rx = await PrescriptionModel.create({
    ...req.body,
    tenantId: req.tenantId,
    doctorId: req.user!.doctorId ?? new mongoose.Types.ObjectId(),
    prescriptionNumber: `RX-${Date.now()}-${prescriptionCounter}`,
    validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000),
  });

  // Queue PDF generation + delivery
  await pdfQueue.add('generate-prescription', { prescriptionId: rx._id.toString() });

  sendSuccess(res, rx.toObject(), 201);
});

router.get('/', requirePermission('prescription:read'), async (req: Request, res: Response) => {
  const { patientId, encounterId, page = '1', limit = '20' } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = { tenantId: req.tenantId };
  if (patientId) filter['patientId'] = patientId;
  if (encounterId) filter['encounterId'] = encounterId;

  const p = parseInt(page, 10);
  const l = parseInt(limit, 10);
  const [total, prescriptions] = await Promise.all([
    PrescriptionModel.countDocuments(filter),
    PrescriptionModel.find(filter)
      .populate('patientId', 'firstName lastName uhid')
      .populate('doctorId', 'firstName lastName specialization')
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .lean(),
  ]);

  sendSuccess(res, prescriptions, 200, {
    pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l), hasNextPage: p < Math.ceil(total / l), hasPrevPage: p > 1 },
  });
});

router.get('/:id', requirePermission('prescription:read'), async (req: Request, res: Response) => {
  const rx = await PrescriptionModel.findOne({ _id: req.params['id'], tenantId: req.tenantId })
    .populate('patientId', 'firstName lastName uhid phone dateOfBirth gender allergies')
    .populate('doctorId', 'firstName lastName specialization registrationNumber signatureImage')
    .lean();
  if (!rx) throw new NotFoundError('Prescription');
  sendSuccess(res, rx);
});

router.post('/:id/sign', requirePermission('prescription:sign'), async (req: Request, res: Response) => {
  const rx = await PrescriptionModel.findOneAndUpdate(
    { _id: req.params['id'], tenantId: req.tenantId },
    { isSigned: true, signedAt: new Date() },
    { new: true }
  ).lean();
  if (!rx) throw new NotFoundError('Prescription');

  await Promise.all([
    pdfQueue.add('generate-prescription', { prescriptionId: rx._id.toString() }),
    notificationQueue.add('prescription-ready', {
      prescriptionId: rx._id.toString(),
      patientId: rx.patientId.toString(),
    }),
  ]);

  sendSuccess(res, rx);
});

export default router;
