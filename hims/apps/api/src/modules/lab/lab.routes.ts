import { Router } from 'express';
import type { Request, Response } from 'express';
import { LabTestModel, LabOrderModel, LabResultModel } from './lab.model.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { tenantContext } from '../../middleware/tenant.js';
import { sendSuccess } from '../../utils/response.js';
import { NotFoundError } from '../../utils/errors.js';
import { validate } from '../../middleware/validate.js';
import { CreateLabOrderSchema, LabResultEntrySchema, LabTestCatalogSchema } from '@hims/shared';
import { pdfQueue, notificationQueue } from '../../jobs/queues.js';

const router = Router();
router.use(authenticate, tenantContext);

// ── Test Catalog ───────────────────────────────────────────────────────────

router.get('/tests', requirePermission('lab_order:read'), async (req: Request, res: Response) => {
  const { q, page = '1', limit = '50' } = req.query as Record<string, string>;
  const p = parseInt(page, 10);
  const l = parseInt(limit, 10);
  const filter: Record<string, unknown> = { tenantId: req.tenantId, isActive: true };
  if (q) filter['$text'] = { $search: q };

  const [total, tests] = await Promise.all([
    LabTestModel.countDocuments(filter),
    LabTestModel.find(filter).sort({ name: 1 }).skip((p - 1) * l).limit(l).lean(),
  ]);
  sendSuccess(res, tests, 200, { pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l), hasNextPage: p < Math.ceil(total / l), hasPrevPage: p > 1 } });
});

router.post('/tests', requirePermission('admin:settings'), validate(LabTestCatalogSchema), async (req: Request, res: Response) => {
  const test = await LabTestModel.create({ ...req.body, tenantId: req.tenantId });
  sendSuccess(res, test.toObject(), 201);
});

// ── Lab Orders ─────────────────────────────────────────────────────────────

router.post('/orders', requirePermission('lab_order:create'), validate(CreateLabOrderSchema), async (req: Request, res: Response) => {
  const data = req.body as typeof CreateLabOrderSchema._type;
  const orderNumber = `LAB-${Date.now()}`;

  // Enrich items with test names
  const testIds = data.items.map((i) => i.testId);
  const tests = await LabTestModel.find({ _id: { $in: testIds }, tenantId: req.tenantId }).lean();
  const testMap = new Map(tests.map((t) => [t._id.toString(), t]));

  const items = data.items.map((item) => ({
    ...item,
    testName: testMap.get(item.testId)?.name ?? item.testName,
    barcodeId: `BAR-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
  }));

  const order = await LabOrderModel.create({
    ...data,
    items,
    tenantId: req.tenantId,
    orderNumber,
  });
  sendSuccess(res, order.toObject(), 201);
});

router.get('/orders', requirePermission('lab_order:read'), async (req: Request, res: Response) => {
  const { patientId, status, priority, page = '1', limit = '20' } = req.query as Record<string, string>;
  const p = parseInt(page, 10);
  const l = parseInt(limit, 10);
  const filter: Record<string, unknown> = { tenantId: req.tenantId };
  if (patientId) filter['patientId'] = patientId;
  if (status) filter['status'] = status;
  if (priority) filter['priority'] = priority;

  const [total, orders] = await Promise.all([
    LabOrderModel.countDocuments(filter),
    LabOrderModel.find(filter)
      .populate('patientId', 'firstName lastName uhid')
      .populate('doctorId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .lean(),
  ]);
  sendSuccess(res, orders, 200, { pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l), hasNextPage: p < Math.ceil(total / l), hasPrevPage: p > 1 } });
});

router.get('/orders/:id', requirePermission('lab_order:read'), async (req: Request, res: Response) => {
  const order = await LabOrderModel.findOne({ _id: req.params['id'], tenantId: req.tenantId })
    .populate('patientId')
    .populate('doctorId', 'firstName lastName specialization')
    .lean();
  if (!order) throw new NotFoundError('Lab Order');
  sendSuccess(res, order);
});

router.patch('/orders/:id/collect-sample', requirePermission('lab_result:enter'), async (req: Request, res: Response) => {
  const order = await LabOrderModel.findOneAndUpdate(
    { _id: req.params['id'], tenantId: req.tenantId },
    { status: 'sample_collected', sampleCollectedAt: new Date(), sampleCollectedBy: req.user!._id },
    { new: true }
  ).lean();
  if (!order) throw new NotFoundError('Lab Order');
  sendSuccess(res, order);
});

// ── Results ────────────────────────────────────────────────────────────────

router.post('/results', requirePermission('lab_result:enter'), validate(LabResultEntrySchema), async (req: Request, res: Response) => {
  const data = req.body as typeof LabResultEntrySchema._type;
  const order = await LabOrderModel.findOne({ _id: data.orderId, tenantId: req.tenantId }).lean();
  if (!order) throw new NotFoundError('Lab Order');

  const result = await LabResultModel.create({
    ...data,
    tenantId: req.tenantId,
    patientId: order.patientId,
    testId: order.items[0]?.testId,
  });

  await LabOrderModel.findByIdAndUpdate(data.orderId, {
    status: 'result_entered',
    resultEnteredBy: req.user!._id,
    resultEnteredAt: new Date(),
  });

  sendSuccess(res, result.toObject(), 201);
});

router.post('/results/:id/verify', requirePermission('lab_result:verify'), async (req: Request, res: Response) => {
  const result = await LabResultModel.findOneAndUpdate(
    { _id: req.params['id'], tenantId: req.tenantId },
    { isVerified: true, verifiedBy: req.user!._id, verifiedAt: new Date() },
    { new: true }
  ).lean();
  if (!result) throw new NotFoundError('Lab Result');

  // Update order status
  await LabOrderModel.findByIdAndUpdate(result.orderId, { status: 'verified', verifiedBy: req.user!._id, verifiedAt: new Date() });

  // Generate report PDF + deliver
  await Promise.all([
    pdfQueue.add('generate-lab-report', { resultId: result._id.toString(), orderId: result.orderId.toString() }),
    notificationQueue.add('lab-report-ready', {
      orderId: result.orderId.toString(),
      patientId: result.patientId.toString(),
    }),
  ]);

  sendSuccess(res, result);
});

router.get('/results', requirePermission('lab_order:read'), async (req: Request, res: Response) => {
  const { patientId, orderId } = req.query as { patientId?: string; orderId?: string };
  const filter: Record<string, unknown> = { tenantId: req.tenantId };
  if (patientId) filter['patientId'] = patientId;
  if (orderId) filter['orderId'] = orderId;

  const results = await LabResultModel.find(filter)
    .populate('testId', 'name code')
    .sort({ createdAt: -1 })
    .lean();
  sendSuccess(res, results);
});

export default router;
