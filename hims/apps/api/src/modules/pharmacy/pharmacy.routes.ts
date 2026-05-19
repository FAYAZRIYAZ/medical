import { Router } from 'express';
import type { Request, Response } from 'express';
import { DrugModel, PharmacyBatchModel, DispensingModel } from './pharmacy.model.js';
import { PrescriptionModel } from '../prescriptions/prescription.model.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { tenantContext } from '../../middleware/tenant.js';
import { sendSuccess } from '../../utils/response.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';
import { validate } from '../../middleware/validate.js';
import { DrugMasterSchema, AddStockSchema, DispensePrescriptionSchema } from '@hims/shared';
import { z } from 'zod';

const router = Router();
router.use(authenticate, tenantContext);

// ── Drug Master ────────────────────────────────────────────────────────────

router.get('/drugs', requirePermission('pharmacy:read'), async (req: Request, res: Response) => {
  const { q, page = '1', limit = '20', form, schedule } = req.query as Record<string, string>;
  const p = parseInt(page, 10);
  const l = parseInt(limit, 10);
  const filter: Record<string, unknown> = { tenantId: req.tenantId, isActive: true };
  if (q) filter['$text'] = { $search: q };
  if (form) filter['form'] = form;
  if (schedule) filter['schedule'] = schedule;

  const [total, drugs] = await Promise.all([
    DrugModel.countDocuments(filter),
    DrugModel.find(filter).sort({ brandName: 1 }).skip((p - 1) * l).limit(l).lean(),
  ]);

  sendSuccess(res, drugs, 200, {
    pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l), hasNextPage: p < Math.ceil(total / l), hasPrevPage: p > 1 },
  });
});

router.post('/drugs', requirePermission('pharmacy:stock_manage'), validate(DrugMasterSchema), async (req: Request, res: Response) => {
  const drug = await DrugModel.create({ ...req.body, tenantId: req.tenantId });
  sendSuccess(res, drug.toObject(), 201);
});

router.patch('/drugs/:id', requirePermission('pharmacy:stock_manage'), async (req: Request, res: Response) => {
  const drug = await DrugModel.findOneAndUpdate({ _id: req.params['id'], tenantId: req.tenantId }, { $set: req.body }, { new: true }).lean();
  if (!drug) throw new NotFoundError('Drug');
  sendSuccess(res, drug);
});

// ── Stock / Batches ────────────────────────────────────────────────────────

router.get('/stock', requirePermission('pharmacy:read'), async (req: Request, res: Response) => {
  const { drugId, expiringSoon } = req.query as { drugId?: string; expiringSoon?: string };
  const filter: Record<string, unknown> = { tenantId: req.tenantId, isActive: true };
  if (drugId) filter['drugId'] = drugId;
  if (expiringSoon === 'true') {
    filter['expiryDate'] = { $lte: new Date(Date.now() + 90 * 24 * 3600 * 1000) };
  }

  const batches = await PharmacyBatchModel.find(filter)
    .populate('drugId', 'genericName brandName form strength')
    .sort({ expiryDate: 1 })
    .lean();
  sendSuccess(res, batches);
});

router.post('/stock', requirePermission('pharmacy:stock_manage'), validate(AddStockSchema), async (req: Request, res: Response) => {
  const batch = await PharmacyBatchModel.create({ ...req.body, tenantId: req.tenantId });
  sendSuccess(res, batch.toObject(), 201);
});

router.get('/stock/low', requirePermission('pharmacy:read'), async (req: Request, res: Response) => {
  const lowStock = await PharmacyBatchModel.aggregate([
    { $match: { tenantId: req.tenantId, isActive: true } },
    { $group: { _id: '$drugId', totalAvailable: { $sum: { $subtract: ['$quantity', '$soldQuantity'] } } } },
    {
      $lookup: { from: 'drugs', localField: '_id', foreignField: '_id', as: 'drug' },
    },
    { $unwind: '$drug' },
    { $match: { $expr: { $lte: ['$totalAvailable', '$drug.minStockLevel'] } } },
    { $project: { drug: 1, totalAvailable: 1 } },
  ]);
  sendSuccess(res, lowStock);
});

// ── Dispensing ─────────────────────────────────────────────────────────────

router.post('/dispense', requirePermission('pharmacy:dispense'), validate(DispensePrescriptionSchema), async (req: Request, res: Response) => {
  const data = req.body as typeof DispensePrescriptionSchema._type;

  const prescription = await PrescriptionModel.findOne({
    _id: data.prescriptionId,
    tenantId: req.tenantId,
  }).lean();
  if (!prescription) throw new NotFoundError('Prescription');
  if (prescription.isDispensed) throw new ConflictError('Prescription already dispensed');

  let totalAmount = 0;
  const dispensedItems = [];

  for (const item of data.items) {
    const batch = await PharmacyBatchModel.findOne({
      _id: item.batchId,
      tenantId: req.tenantId,
      drugId: item.drugId,
    }).lean();
    if (!batch) throw new NotFoundError(`Batch ${item.batchId}`);

    const available = batch.quantity - batch.soldQuantity;
    if (available < item.quantityDispensed) {
      throw new ConflictError(`Insufficient stock for batch ${batch.batchNumber}`);
    }

    await PharmacyBatchModel.findByIdAndUpdate(item.batchId, { $inc: { soldQuantity: item.quantityDispensed } });
    const lineTotal = batch.unitMrp * item.quantityDispensed;
    totalAmount += lineTotal;
    dispensedItems.push({
      drugId: item.drugId,
      batchId: item.batchId,
      drugName: `Drug-${item.drugId}`,
      quantityDispensed: item.quantityDispensed,
      unitMrp: batch.unitMrp,
      totalAmount: lineTotal,
    });
  }

  const dispensing = await DispensingModel.create({
    tenantId: req.tenantId,
    prescriptionId: data.prescriptionId,
    patientId: prescription.patientId,
    dispensedBy: req.user!._id,
    items: dispensedItems,
    totalAmount,
    dispensedAt: new Date(),
    notes: data.notes,
  });

  await PrescriptionModel.findByIdAndUpdate(data.prescriptionId, {
    isDispensed: true,
    dispensedAt: new Date(),
    dispensedBy: req.user!._id,
  });

  sendSuccess(res, dispensing.toObject(), 201);
});

router.get('/dispensing', requirePermission('pharmacy:read'), async (req: Request, res: Response) => {
  const { patientId, page = '1', limit = '20' } = req.query as Record<string, string>;
  const p = parseInt(page, 10);
  const l = parseInt(limit, 10);
  const filter: Record<string, unknown> = { tenantId: req.tenantId };
  if (patientId) filter['patientId'] = patientId;

  const [total, records] = await Promise.all([
    DispensingModel.countDocuments(filter),
    DispensingModel.find(filter)
      .populate('patientId', 'firstName lastName uhid')
      .sort({ dispensedAt: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .lean(),
  ]);

  sendSuccess(res, records, 200, {
    pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l), hasNextPage: p < Math.ceil(total / l), hasPrevPage: p > 1 },
  });
});

export default router;
