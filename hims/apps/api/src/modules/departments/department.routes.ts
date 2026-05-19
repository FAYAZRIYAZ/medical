import { Router } from 'express';
import type { Request, Response } from 'express';
import { DepartmentModel } from './department.model.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { tenantContext } from '../../middleware/tenant.js';
import { sendSuccess } from '../../utils/response.js';
import { NotFoundError } from '../../utils/errors.js';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';

const CreateDeptSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  description: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  floor: z.coerce.number().int().nonnegative().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  color: z.string().optional(),
  isActive: z.boolean().default(true),
});

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('patient:read'), async (req: Request, res: Response) => {
  const depts = await DepartmentModel.find({ tenantId: req.tenantId, isActive: true })
    .populate('headDoctorId', 'firstName lastName')
    .lean();
  sendSuccess(res, depts);
});

router.post('/', requirePermission('admin:settings'), validate(CreateDeptSchema), async (req: Request, res: Response) => {
  const dept = await DepartmentModel.create({ ...req.body, tenantId: req.tenantId });
  sendSuccess(res, dept.toObject(), 201);
});

router.get('/:id', requirePermission('patient:read'), async (req: Request, res: Response) => {
  const dept = await DepartmentModel.findOne({ _id: req.params['id'], tenantId: req.tenantId })
    .populate('headDoctorId', 'firstName lastName specialization')
    .lean();
  if (!dept) throw new NotFoundError('Department');
  sendSuccess(res, dept);
});

router.patch('/:id', requirePermission('admin:settings'), validate(CreateDeptSchema.partial()), async (req: Request, res: Response) => {
  const dept = await DepartmentModel.findOneAndUpdate(
    { _id: req.params['id'], tenantId: req.tenantId },
    { $set: req.body },
    { new: true }
  ).lean();
  if (!dept) throw new NotFoundError('Department');
  sendSuccess(res, dept);
});

router.delete('/:id', requirePermission('admin:settings'), async (req: Request, res: Response) => {
  await DepartmentModel.findOneAndUpdate(
    { _id: req.params['id'], tenantId: req.tenantId },
    { isActive: false }
  );
  sendSuccess(res, { message: 'Department deactivated' });
});

export default router;
