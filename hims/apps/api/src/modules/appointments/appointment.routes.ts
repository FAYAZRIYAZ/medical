import { Router } from 'express';
import type { Request, Response } from 'express';
import { appointmentService } from './appointment.service.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { tenantContext } from '../../middleware/tenant.js';
import { sendSuccess } from '../../utils/response.js';
import { CreateAppointmentSchema, UpdateAppointmentSchema, AppointmentListSchema } from '@hims/shared';

const router = Router();
router.use(authenticate, tenantContext);

router.get('/', requirePermission('appointment:read'), validate(AppointmentListSchema, 'query'), async (req: Request, res: Response) => {
  const result = await appointmentService.list(req.query as never, req.tenantId!);
  sendSuccess(res, result.data, 200, result.meta);
});

router.post('/', requirePermission('appointment:create'), validate(CreateAppointmentSchema), async (req: Request, res: Response) => {
  const appt = await appointmentService.create(req.body as never, req.tenantId!, req.user!._id.toString());
  sendSuccess(res, appt, 201);
});

router.get('/queue', requirePermission('appointment:read'), async (req: Request, res: Response) => {
  const { doctorId } = req.query as { doctorId?: string };
  if (!doctorId) { res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'doctorId required' } }); return; }
  const queue = await appointmentService.getTodayQueue(doctorId, req.tenantId!);
  sendSuccess(res, queue);
});

router.get('/:id', requirePermission('appointment:read'), async (req: Request, res: Response) => {
  const appt = await appointmentService.findById(req.params['id']!, req.tenantId!);
  sendSuccess(res, appt);
});

router.patch('/:id', requirePermission('appointment:update'), validate(UpdateAppointmentSchema), async (req: Request, res: Response) => {
  const appt = await appointmentService.update(req.params['id']!, req.tenantId!, req.body as never, req.user!._id.toString());
  sendSuccess(res, appt);
});

router.delete('/:id', requirePermission('appointment:cancel'), async (req: Request, res: Response) => {
  const { reason } = req.body as { reason?: string };
  const appt = await appointmentService.update(
    req.params['id']!,
    req.tenantId!,
    { status: 'cancelled', cancellationReason: reason },
    req.user!._id.toString()
  );
  sendSuccess(res, appt);
});

export default router;
