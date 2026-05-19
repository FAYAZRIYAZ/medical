import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
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

export default router;
