import { Router } from 'express';
import type { Request, Response } from 'express';
import { InvoiceModel, PaymentModel } from './billing.model.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { tenantContext } from '../../middleware/tenant.js';
import { sendSuccess } from '../../utils/response.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';
import { validate } from '../../middleware/validate.js';
import { CreateInvoiceSchema, RecordPaymentSchema, InvoiceListSchema } from '@hims/shared';
import { notificationQueue } from '../../jobs/queues.js';
import { razorpayService } from '../../integrations/razorpay.js';

const router = Router();
router.use(authenticate, tenantContext);

// ── Invoices ───────────────────────────────────────────────────────────────

router.post('/invoices', requirePermission('billing:create'), validate(CreateInvoiceSchema), async (req: Request, res: Response) => {
  const data = req.body as typeof CreateInvoiceSchema._type;

  if (data.idempotencyKey) {
    const existing = await InvoiceModel.findOne({ idempotencyKey: data.idempotencyKey, tenantId: req.tenantId }).lean();
    if (existing) { sendSuccess(res, existing); return; }
  }

  // Calculate line items
  let subtotal = 0;
  let taxAmount = 0;
  const items = data.items.map((item) => {
    const itemSubtotal = item.unitPrice * item.quantity * (1 - item.discount / 100);
    const itemGst = itemSubtotal * (item.gstRate / 100);
    const total = itemSubtotal + itemGst;
    subtotal += itemSubtotal;
    taxAmount += itemGst;
    return { ...item, subtotal: itemSubtotal, gstAmount: itemGst, total };
  });

  const totalAmount = subtotal + taxAmount - (data.discountAmount ?? 0);

  const invoiceNumber = `INV-${Date.now()}`;
  const invoice = await InvoiceModel.create({
    ...data,
    tenantId: req.tenantId,
    invoiceNumber,
    items,
    subtotal,
    taxAmount,
    totalAmount,
    dueAmount: totalAmount,
    createdBy: req.user!._id,
    dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
  });

  sendSuccess(res, invoice.toObject(), 201);
});

router.get('/invoices', requirePermission('billing:read'), validate(InvoiceListSchema, 'query'), async (req: Request, res: Response) => {
  const { page, limit, patientId, status, dateFrom, dateTo, sortBy, sortOrder } = req.query as unknown as typeof InvoiceListSchema._type;
  const filter: Record<string, unknown> = { tenantId: req.tenantId };
  if (patientId) filter['patientId'] = patientId;
  if (status) filter['status'] = status;
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter['$gte'] = new Date(dateFrom);
    if (dateTo) dateFilter['$lte'] = new Date(dateTo + 'T23:59:59');
    filter['createdAt'] = dateFilter;
  }

  const [total, invoices] = await Promise.all([
    InvoiceModel.countDocuments(filter),
    InvoiceModel.find(filter)
      .populate('patientId', 'firstName lastName uhid')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  sendSuccess(res, invoices, 200, {
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
  });
});

router.get('/invoices/:id', requirePermission('billing:read'), async (req: Request, res: Response) => {
  const invoice = await InvoiceModel.findOne({ _id: req.params['id'], tenantId: req.tenantId })
    .populate('patientId', 'firstName lastName uhid phone email address')
    .lean();
  if (!invoice) throw new NotFoundError('Invoice');
  sendSuccess(res, invoice);
});

// ── Payments ───────────────────────────────────────────────────────────────

router.post('/payments', requirePermission('billing:create'), validate(RecordPaymentSchema), async (req: Request, res: Response) => {
  const data = req.body as typeof RecordPaymentSchema._type;

  if (data.idempotencyKey) {
    const existing = await PaymentModel.findOne({ idempotencyKey: data.idempotencyKey, tenantId: req.tenantId }).lean();
    if (existing) { sendSuccess(res, existing); return; }
  }

  const invoice = await InvoiceModel.findOne({ _id: data.invoiceId, tenantId: req.tenantId }).lean();
  if (!invoice) throw new NotFoundError('Invoice');
  if (invoice.status === 'paid') throw new ConflictError('Invoice already paid');

  const paymentNumber = `PAY-${Date.now()}`;
  const payment = await PaymentModel.create({
    ...data,
    tenantId: req.tenantId,
    patientId: invoice.patientId,
    paymentNumber,
    recordedBy: req.user!._id,
    paidAt: new Date(),
  });

  const newPaid = invoice.paidAmount + data.amount;
  const newDue = invoice.totalAmount - newPaid;
  const newStatus = newDue <= 0 ? 'paid' : 'partial';

  await InvoiceModel.findByIdAndUpdate(data.invoiceId, {
    paidAmount: newPaid,
    dueAmount: Math.max(0, newDue),
    status: newStatus,
  });

  await notificationQueue.add('payment-received', {
    paymentId: payment._id.toString(),
    invoiceId: data.invoiceId,
    patientId: invoice.patientId.toString(),
    amount: data.amount,
  });

  sendSuccess(res, payment.toObject(), 201);
});

// Razorpay payment initiation
router.post('/payments/razorpay/create-order', requirePermission('billing:create'), async (req: Request, res: Response) => {
  const { invoiceId, amount } = req.body as { invoiceId: string; amount: number };
  const invoice = await InvoiceModel.findOne({ _id: invoiceId, tenantId: req.tenantId }).lean();
  if (!invoice) throw new NotFoundError('Invoice');

  const order = await razorpayService.createOrder(amount, 'INR', invoiceId);
  sendSuccess(res, order);
});

router.post('/payments/razorpay/verify', requirePermission('billing:create'), async (req: Request, res: Response) => {
  const { orderId, paymentId, signature, invoiceId } = req.body as { orderId: string; paymentId: string; signature: string; invoiceId: string };
  const isValid = razorpayService.verifySignature(orderId, paymentId, signature);
  if (!isValid) throw new ConflictError('Invalid payment signature');

  const invoice = await InvoiceModel.findOne({ _id: invoiceId, tenantId: req.tenantId }).lean();
  if (!invoice) throw new NotFoundError('Invoice');

  const paymentNumber = `PAY-RZP-${paymentId}`;
  const payment = await PaymentModel.create({
    tenantId: req.tenantId,
    invoiceId,
    patientId: invoice.patientId,
    paymentNumber,
    amount: invoice.dueAmount,
    method: 'upi',
    status: 'completed',
    gatewayOrderId: orderId,
    gatewayPaymentId: paymentId,
    gatewaySignature: signature,
    paidAt: new Date(),
  });

  await InvoiceModel.findByIdAndUpdate(invoiceId, { status: 'paid', paidAmount: invoice.totalAmount, dueAmount: 0 });

  sendSuccess(res, payment.toObject(), 201);
});

// ── Reports ────────────────────────────────────────────────────────────────

router.get('/reports/daily-collection', requirePermission('admin:reports'), async (req: Request, res: Response) => {
  const { date = new Date().toISOString().split('T')[0] } = req.query as { date?: string };
  const start = new Date(date + 'T00:00:00');
  const end = new Date(date + 'T23:59:59');

  const result = await PaymentModel.aggregate([
    { $match: { tenantId: req.tenantId, paidAt: { $gte: start, $lte: end }, status: 'completed' } },
    { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

  const grandTotal = result.reduce((s, r) => s + (r.total as number), 0);
  sendSuccess(res, { date, breakdown: result, grandTotal });
});

export default router;
