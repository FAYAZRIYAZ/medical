import { Router } from 'express';
import type { Request, Response } from 'express';
import { patientService } from './patient.service.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { tenantContext } from '../../middleware/tenant.js';
import { uploadImage } from '../../middleware/upload.js';
import { sendSuccess } from '../../utils/response.js';
import { storageService } from '../../integrations/storage.js';
import { CreatePatientSchema, UpdatePatientSchema, PatientSearchSchema } from '@hims/shared';

const router = Router();
router.use(authenticate, tenantContext);

/**
 * @swagger
 * /patients:
 *   get:
 *     summary: Search patients
 *     tags: [Patients]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/',
  requirePermission('patient:read'),
  validate(PatientSearchSchema, 'query'),
  async (req: Request, res: Response) => {
    const result = await patientService.search(req.query as never, req.tenantId!);
    sendSuccess(res, result.data, 200, result.meta);
  }
);

router.post(
  '/',
  requirePermission('patient:create'),
  validate(CreatePatientSchema),
  async (req: Request, res: Response) => {
    const patient = await patientService.create(req.body as never, req.tenantId!, req.user!._id.toString());
    sendSuccess(res, patient, 201);
  }
);

router.get(
  '/stats',
  requirePermission('patient:read'),
  async (req: Request, res: Response) => {
    const stats = await patientService.getStats(req.tenantId!);
    sendSuccess(res, stats);
  }
);

router.get(
  '/:id',
  requirePermission('patient:read'),
  async (req: Request, res: Response) => {
    const patient = await patientService.findById(req.params['id']!, req.tenantId!);
    sendSuccess(res, patient);
  }
);

router.patch(
  '/:id',
  requirePermission('patient:update'),
  validate(UpdatePatientSchema),
  async (req: Request, res: Response) => {
    const patient = await patientService.update(req.params['id']!, req.tenantId!, req.body as never);
    sendSuccess(res, patient);
  }
);

router.delete(
  '/:id',
  requirePermission('patient:delete'),
  async (req: Request, res: Response) => {
    const result = await patientService.delete(req.params['id']!, req.tenantId!);
    sendSuccess(res, result);
  }
);

router.post(
  '/:id/photo',
  requirePermission('patient:update'),
  uploadImage.single('photo'),
  async (req: Request, res: Response) => {
    if (!req.file) { res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } }); return; }
    const url = await storageService.upload(req.file.buffer, `patients/${req.params['id']}/photo`, req.file.mimetype);
    const patient = await patientService.uploadPhoto(req.params['id']!, req.tenantId!, url);
    sendSuccess(res, patient);
  }
);

export default router;
