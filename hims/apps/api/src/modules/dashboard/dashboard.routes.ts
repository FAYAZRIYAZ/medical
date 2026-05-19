import { Router } from 'express';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { tenantContext } from '../../middleware/tenant.js';
import { sendSuccess } from '../../utils/response.js';
import { AppointmentModel } from '../appointments/appointment.model.js';
import { PatientModel } from '../patients/patient.model.js';
import { AdmissionModel } from '../ipd/ipd.model.js';
import { InvoiceModel, PaymentModel } from '../billing/billing.model.js';
import { LabOrderModel } from '../lab/lab.model.js';
import { PrescriptionModel } from '../prescriptions/prescription.model.js';
import { PharmacyBatchModel } from '../pharmacy/pharmacy.model.js';
import { cacheGet, cacheSet } from '../../config/redis.js';
import { APPOINTMENT_STATUS } from '@hims/shared';

const router = Router();
router.use(authenticate, tenantContext);

// Hospital Admin Dashboard
router.get('/admin', requirePermission('admin:reports'), async (req: Request, res: Response) => {
  const tenantId = new mongoose.Types.ObjectId(req.tenantId!);

  const today = new Date();
  const startOfDay = new Date(today); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today); endOfDay.setHours(23, 59, 59, 999);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Build last 7 days date range
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const { BedModel } = await import('../ipd/ipd.model.js');

  const [
    todayAppointments,
    activeAdmissions,
    todayPatients,
    monthRevenue,
    todayRevenue,
    pendingLabOrders,
    lowStockRaw,
    totalPatients,
    totalBeds,
    recentAdmissionsRaw,
    revenueByDayRaw,
    apptByDeptRaw,
  ] = await Promise.all([
    AppointmentModel.countDocuments({ tenantId, appointmentDate: { $gte: startOfDay, $lte: endOfDay }, status: { $ne: APPOINTMENT_STATUS.CANCELLED } }),
    AdmissionModel.countDocuments({ tenantId, status: 'active' }),
    PatientModel.countDocuments({ tenantId, createdAt: { $gte: startOfDay, $lte: endOfDay } }),
    PaymentModel.aggregate([{ $match: { tenantId, paidAt: { $gte: startOfMonth }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    PaymentModel.aggregate([{ $match: { tenantId, paidAt: { $gte: startOfDay, $lte: endOfDay }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    LabOrderModel.countDocuments({ tenantId, status: { $in: ['ordered', 'sample_collected', 'in_progress'] } }),
    PharmacyBatchModel.aggregate([
      { $match: { tenantId, isActive: true } },
      { $group: { _id: '$drugId', available: { $sum: { $subtract: ['$quantity', '$soldQuantity'] } } } },
      { $lookup: { from: 'drugs', localField: '_id', foreignField: '_id', as: 'drug' } },
      { $unwind: '$drug' },
      { $match: { $expr: { $lte: ['$available', '$drug.minStockLevel'] } } },
      { $count: 'count' },
    ]),
    PatientModel.countDocuments({ tenantId, isActive: true }),
    BedModel.countDocuments({ tenantId }),
    AdmissionModel.find({ tenantId, status: 'active' })
      .populate('patientId', 'firstName lastName uhid')
      .populate('wardId', 'name')
      .sort({ admittedAt: -1 })
      .limit(5)
      .lean(),
    PaymentModel.aggregate([
      { $match: { tenantId, paidAt: { $gte: last7Days[0] }, status: 'completed' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } }, amount: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ]),
    AppointmentModel.aggregate([
      { $match: { tenantId, appointmentDate: { $gte: startOfDay, $lte: endOfDay }, status: { $ne: APPOINTMENT_STATUS.CANCELLED } } },
      { $lookup: { from: 'departments', localField: 'departmentId', foreignField: '_id', as: 'dept' } },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$dept.name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
  ]);

  // Build revenue by day (fill missing days with 0)
  const revenueMap = new Map((revenueByDayRaw as { _id: string; amount: number }[]).map((r) => [r._id, r.amount]));
  const revenueByDay = last7Days.map((d) => ({
    date: d.toLocaleDateString('en-US', { weekday: 'short' }),
    amount: revenueMap.get(d.toISOString().split('T')[0]!) ?? 0,
  }));

  const recentAdmissions = (recentAdmissionsRaw as { patientId: { firstName: string; lastName: string; uhid: string } | null; wardId: { name: string } | null; admittedAt: Date }[]).map((a) => ({
    name: a.patientId ? `${a.patientId.firstName} ${a.patientId.lastName}` : 'Unknown',
    uhid: a.patientId?.uhid ?? '',
    ward: (a.wardId as { name?: string } | null)?.name ?? '—',
    admittedAt: a.admittedAt,
  }));

  const appointmentsByDept = (apptByDeptRaw as { _id: string | null; count: number }[]).map((a) => ({
    department: a._id ?? 'General',
    count: a.count,
  }));

  const data = {
    todayAppointments,
    occupiedBeds: activeAdmissions,
    totalBeds,
    todayNewPatients: todayPatients,
    totalPatients,
    todayRevenue: todayRevenue[0]?.total ?? 0,
    monthRevenue: monthRevenue[0]?.total ?? 0,
    pendingLabOrders,
    lowStockDrugs: (lowStockRaw[0] as { count?: number } | undefined)?.count ?? 0,
    revenueByDay,
    recentAdmissions,
    appointmentsByDept,
  };

  sendSuccess(res, data);
});

// Doctor Dashboard
router.get('/doctor', requirePermission('appointment:read'), async (req: Request, res: Response) => {
  const doctorId = req.user!.doctorId;
  if (!doctorId) { sendSuccess(res, {}); return; }

  const tenantId = new mongoose.Types.ObjectId(req.tenantId!);
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const [todayQueue, pendingRx, upcomingAppointments] = await Promise.all([
    AppointmentModel.find({
      tenantId,
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: [APPOINTMENT_STATUS.SCHEDULED, APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.CHECKED_IN] },
    }).populate('patientId', 'firstName lastName uhid phone').sort({ tokenNumber: 1 }).lean(),
    PrescriptionModel.countDocuments({ tenantId, doctorId, isSigned: false }),
    AppointmentModel.find({
      tenantId,
      doctorId,
      appointmentDate: { $gt: endOfDay },
      status: APPOINTMENT_STATUS.SCHEDULED,
    }).populate('patientId', 'firstName lastName uhid').sort({ appointmentDate: 1 }).limit(5).lean(),
  ]);

  sendSuccess(res, { todayQueue, pendingRx, upcomingAppointments });
});

// Receptionist Dashboard
router.get('/reception', requirePermission('appointment:read'), async (req: Request, res: Response) => {
  const tenantId = new mongoose.Types.ObjectId(req.tenantId!);
  const today = new Date();
  const start = new Date(today.setHours(0, 0, 0, 0));
  const end = new Date(today.setHours(23, 59, 59, 999));

  const [todayAppointments, walkIns, checkedIn] = await Promise.all([
    AppointmentModel.countDocuments({ tenantId, appointmentDate: { $gte: start, $lte: end }, status: { $ne: APPOINTMENT_STATUS.CANCELLED } }),
    AppointmentModel.countDocuments({ tenantId, appointmentDate: { $gte: start, $lte: end }, type: 'walk_in' }),
    AppointmentModel.countDocuments({ tenantId, appointmentDate: { $gte: start, $lte: end }, status: APPOINTMENT_STATUS.CHECKED_IN }),
  ]);

  sendSuccess(res, { todayAppointments, walkIns, checkedIn });
});

// Patient Dashboard
router.get('/patient', async (req: Request, res: Response) => {
  const patientId = req.user!.patientId;
  if (!patientId) { sendSuccess(res, {}); return; }

  const tenantId = new mongoose.Types.ObjectId(req.tenantId!);

  const [upcomingAppointments, recentPrescriptions, pendingInvoices] = await Promise.all([
    AppointmentModel.find({
      tenantId,
      patientId,
      appointmentDate: { $gte: new Date() },
      status: { $in: [APPOINTMENT_STATUS.SCHEDULED, APPOINTMENT_STATUS.CONFIRMED] },
    }).populate('doctorId', 'firstName lastName specialization').sort({ appointmentDate: 1 }).limit(3).lean(),
    PrescriptionModel.find({ tenantId, patientId }).sort({ createdAt: -1 }).limit(3).lean(),
    InvoiceModel.find({ tenantId, patientId, status: { $in: ['issued', 'partial', 'overdue'] } }).lean(),
  ]);

  sendSuccess(res, { upcomingAppointments, recentPrescriptions, pendingInvoices });
});

// Pharmacist Dashboard
router.get('/pharmacy', requirePermission('pharmacy:read'), async (req: Request, res: Response) => {
  const tenantId = new mongoose.Types.ObjectId(req.tenantId!);
  const today = new Date();
  const start = new Date(today.setHours(0, 0, 0, 0));
  const end = new Date(today.setHours(23, 59, 59, 999));

  const expiryDate90 = new Date(Date.now() + 90 * 24 * 3600 * 1000);

  const [pendingPrescriptions, lowStockItems, expiringBatches] = await Promise.all([
    PrescriptionModel.countDocuments({ tenantId, isSigned: true, isDispensed: false }),
    PharmacyBatchModel.aggregate([
      { $match: { tenantId, isActive: true } },
      { $group: { _id: '$drugId', available: { $sum: { $subtract: ['$quantity', '$soldQuantity'] } } } },
      { $lookup: { from: 'drugs', localField: '_id', foreignField: '_id', as: 'drug' } },
      { $unwind: '$drug' },
      { $match: { $expr: { $lte: ['$available', '$drug.minStockLevel'] } } },
    ]),
    PharmacyBatchModel.find({ tenantId, isActive: true, expiryDate: { $lte: expiryDate90 } })
      .populate('drugId', 'brandName genericName')
      .sort({ expiryDate: 1 })
      .limit(10)
      .lean(),
  ]);

  sendSuccess(res, { pendingPrescriptions, lowStockCount: lowStockItems.length, lowStockItems, expiringBatches });
});

// Lab Tech Dashboard
router.get('/lab', requirePermission('lab_order:read'), async (req: Request, res: Response) => {
  const tenantId = new mongoose.Types.ObjectId(req.tenantId!);

  const [pendingSamples, pendingResults, todayOrders] = await Promise.all([
    LabOrderModel.countDocuments({ tenantId, status: 'ordered' }),
    LabOrderModel.countDocuments({ tenantId, status: 'sample_collected' }),
    LabOrderModel.find({ tenantId, createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } })
      .populate('patientId', 'firstName lastName uhid')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
  ]);

  sendSuccess(res, { pendingSamples, pendingResults, todayOrders });
});

export default router;
