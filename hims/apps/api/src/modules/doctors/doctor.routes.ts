import { Router } from 'express';
import type { Request, Response } from 'express';
import { DoctorModel } from './doctor.model.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { tenantContext } from '../../middleware/tenant.js';
import { sendSuccess } from '../../utils/response.js';
import { NotFoundError } from '../../utils/errors.js';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { DoctorScheduleSchema } from '@hims/shared';

const DoctorQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  departmentId: z.string().optional(),
  specialization: z.string().optional(),
  available: z.coerce.boolean().optional(),
  q: z.string().optional(),
});

const CreateDoctorSchema = z.object({
  userId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string(),
  specialization: z.string().min(1),
  qualification: z.array(z.string()).default([]),
  registrationNumber: z.string().min(1),
  experience: z.coerce.number().nonnegative().default(0),
  departmentIds: z.array(z.string()).default([]),
  bio: z.string().max(2000).optional(),
  languages: z.array(z.string()).default(['English']),
  consultationFee: z.coerce.number().nonnegative().default(0),
  teleConsultationFee: z.coerce.number().nonnegative().optional(),
});

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('patient:read'), validate(DoctorQuerySchema, 'query'), async (req: Request, res: Response) => {
  const { page, limit, departmentId, specialization, available, q } = req.query as unknown as z.infer<typeof DoctorQuerySchema>;
  const filter: Record<string, unknown> = { tenantId: req.tenantId, isActive: true };
  if (departmentId) filter['departmentIds'] = departmentId;
  if (specialization) filter['specialization'] = new RegExp(specialization, 'i');
  if (available !== undefined) filter['isAvailable'] = available;
  if (q) filter['$or'] = [
    { firstName: new RegExp(q, 'i') },
    { lastName: new RegExp(q, 'i') },
    { specialization: new RegExp(q, 'i') },
  ];

  const [total, doctors] = await Promise.all([
    DoctorModel.countDocuments(filter),
    DoctorModel.find(filter)
      .populate('departmentIds', 'name code')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  sendSuccess(res, doctors, 200, {
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
  });
});

router.post('/', requirePermission('admin:users'), validate(CreateDoctorSchema), async (req: Request, res: Response) => {
  const doctor = await DoctorModel.create({ ...req.body, tenantId: req.tenantId });
  sendSuccess(res, doctor.toObject(), 201);
});

router.get('/:id', requirePermission('patient:read'), async (req: Request, res: Response) => {
  const doctor = await DoctorModel.findOne({ _id: req.params['id'], tenantId: req.tenantId })
    .populate('departmentIds', 'name code')
    .lean();
  if (!doctor) throw new NotFoundError('Doctor');
  sendSuccess(res, doctor);
});

router.get('/:id/slots', requirePermission('appointment:read'), async (req: Request, res: Response) => {
  const { date } = req.query as { date?: string };
  if (!date) { res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'date required' } }); return; }

  const doctor = await DoctorModel.findOne({ _id: req.params['id'], tenantId: req.tenantId }).lean();
  if (!doctor) throw new NotFoundError('Doctor');

  const dayOfWeek = new Date(date).getDay();
  const daySchedule = doctor.schedule.find((s) => s.dayOfWeek === dayOfWeek && s.isActive);
  if (!daySchedule) { sendSuccess(res, { slots: [], date }); return; }

  // Generate time slots
  const slots = [];
  const [sh, sm] = daySchedule.startTime.split(':').map(Number) as [number, number];
  const [eh, em] = daySchedule.endTime.split(':').map(Number) as [number, number];
  let current = sh * 60 + sm;
  const end = eh * 60 + em;
  let index = 1;

  while (current + daySchedule.slotDuration <= end) {
    const hh = String(Math.floor(current / 60)).padStart(2, '0');
    const mm = String(current % 60).padStart(2, '0');
    const endMin = current + daySchedule.slotDuration;
    const eh2 = String(Math.floor(endMin / 60)).padStart(2, '0');
    const em2 = String(endMin % 60).padStart(2, '0');
    slots.push({ id: `${req.params['id']}-${date}-${index}`, time: `${hh}:${mm}`, endTime: `${eh2}:${em2}`, tokenNumber: index, isBooked: false });
    current += daySchedule.slotDuration;
    index++;
  }

  sendSuccess(res, { slots, date, doctorId: req.params['id'] });
});

router.patch('/:id', requirePermission('admin:users'), async (req: Request, res: Response) => {
  const doctor = await DoctorModel.findOneAndUpdate(
    { _id: req.params['id'], tenantId: req.tenantId },
    { $set: req.body },
    { new: true }
  ).lean();
  if (!doctor) throw new NotFoundError('Doctor');
  sendSuccess(res, doctor);
});

router.put('/:id/schedule', requirePermission('admin:users'), validate(z.array(DoctorScheduleSchema.omit({ doctorId: true }))), async (req: Request, res: Response) => {
  const doctor = await DoctorModel.findOneAndUpdate(
    { _id: req.params['id'], tenantId: req.tenantId },
    { schedule: req.body },
    { new: true }
  ).lean();
  if (!doctor) throw new NotFoundError('Doctor');
  sendSuccess(res, doctor);
});

export default router;
