import { Router } from 'express';
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { authController } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { tenantContext } from '../../middleware/tenant.js';
import { sendSuccess } from '../../utils/response.js';
import { loginRateLimit, otpRateLimit, passwordResetRateLimit } from '../../middleware/rateLimiter.js';
import {
  LoginSchema,
  RegisterSchema,
  OtpLoginSchema,
  SendOtpSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  TotpVerifySchema,
} from '@hims/shared';

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & authorization
 */
const router = Router();

router.post('/login', loginRateLimit, validate(LoginSchema), (req, res) => authController.login(req, res));
router.post('/login/otp/send', otpRateLimit, validate(SendOtpSchema), (req, res) => authController.sendOtp(req, res));
router.post('/login/otp/verify', validate(OtpLoginSchema), (req, res) => authController.loginWithOtp(req, res));
router.post('/register', validate(RegisterSchema), (req, res) => authController.register(req, res));
router.post('/refresh', (req, res) => authController.refreshToken(req, res));
router.post('/logout', authenticate, (req, res) => authController.logout(req, res));
router.post('/logout-all', authenticate, (req, res) => authController.logoutAll(req, res));
router.post('/forgot-password', passwordResetRateLimit, validate(ForgotPasswordSchema), (req, res) => authController.forgotPassword(req, res));
router.post('/reset-password', validate(ResetPasswordSchema), (req, res) => authController.resetPassword(req, res));
router.post('/change-password', authenticate, validate(ChangePasswordSchema), (req, res) => authController.changePassword(req, res));
router.post('/2fa/setup', authenticate, (req, res) => authController.setup2fa(req, res));
router.post('/2fa/enable', authenticate, validate(TotpVerifySchema), (req, res) => authController.enable2fa(req, res));
router.post('/2fa/disable', authenticate, validate(TotpVerifySchema), (req, res) => authController.disable2fa(req, res));
router.post('/2fa/verify', validate(TotpVerifySchema), (req, res) => authController.verify2fa(req, res));
router.get('/verify-email/:token', (req, res) => authController.verifyEmail(req, res));
router.get('/me', authenticate, (req, res) => authController.me(req, res));

// List staff/users within a tenant (used by chat to start conversations)
router.get('/users', authenticate, tenantContext, async (req: Request, res: Response) => {
  const UserModel = mongoose.model('User');
  const { q = '', role } = req.query as { q?: string; role?: string };
  const filter: Record<string, unknown> = { tenantId: req.tenantId, isActive: true, _id: { $ne: req.user!._id } };
  if (role) filter['role'] = role;
  if (q) filter['$or'] = [
    { firstName: { $regex: q, $options: 'i' } },
    { lastName: { $regex: q, $options: 'i' } },
    { email: { $regex: q, $options: 'i' } },
  ];
  const users = await UserModel.find(filter).select('firstName lastName email role avatar').limit(30).lean();
  sendSuccess(res, users);
});

export default router;
