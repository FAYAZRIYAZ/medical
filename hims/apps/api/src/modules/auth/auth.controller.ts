import type { Request, Response } from 'express';
import { authService } from './auth.service.js';
import { sendSuccess } from '../../utils/response.js';
import type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  SendOtpInput,
  OtpLoginInput,
  TotpVerifyInput,
} from '@hims/shared';

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 3600 * 1000,
  path: '/api/v1/auth',
};

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body as LoginInput, req.ip ?? '');
    if ('requires2fa' in result && result.requires2fa) {
      sendSuccess(res, result);
      return;
    }
    const { refreshToken, ...rest } = result as { refreshToken: string; accessToken: string; tokenType: 'Bearer'; expiresIn: number };
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);
    sendSuccess(res, rest);
  }

  async verify2fa(req: Request, res: Response): Promise<void> {
    const { partialToken, token } = req.body as { partialToken: string; token: string };
    const result = await authService.verify2fa(partialToken, token);
    const { refreshToken, ...rest } = result;
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);
    sendSuccess(res, rest);
  }

  async sendOtp(req: Request, res: Response): Promise<void> {
    const { phone, channel } = req.body as SendOtpInput;
    const result = await authService.sendOtp(phone, channel);
    sendSuccess(res, result);
  }

  async loginWithOtp(req: Request, res: Response): Promise<void> {
    const { phone, otp } = req.body as OtpLoginInput;
    const tenantId = req.body.tenantId as string;
    const result = await authService.loginWithOtp(phone, otp, tenantId);
    const { refreshToken, ...rest } = result;
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);
    sendSuccess(res, rest);
  }

  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.register(req.body as RegisterInput);
    sendSuccess(res, result, 201);
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.refreshToken as string | undefined ?? (req.body as { refreshToken?: string }).refreshToken;
    if (!token) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'No refresh token' } });
      return;
    }
    const result = await authService.refreshToken(token);
    const { refreshToken, ...rest } = result;
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);
    sendSuccess(res, rest);
  }

  async logout(req: Request, res: Response): Promise<void> {
    const sessionId = req.sessionId ?? '';
    await authService.logout(sessionId);
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    sendSuccess(res, { message: 'Logged out successfully' });
  }

  async logoutAll(req: Request, res: Response): Promise<void> {
    const userId = req.user!._id.toString();
    await authService.logoutAll(userId);
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    sendSuccess(res, { message: 'All sessions terminated' });
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    const result = await authService.forgotPassword(req.body as ForgotPasswordInput);
    sendSuccess(res, result);
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    const result = await authService.resetPassword(req.body as ResetPasswordInput);
    sendSuccess(res, result);
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    const result = await authService.changePassword(req.user!._id.toString(), req.body as ChangePasswordInput);
    sendSuccess(res, result);
  }

  async setup2fa(req: Request, res: Response): Promise<void> {
    const result = await authService.setup2fa(req.user!._id.toString());
    sendSuccess(res, result);
  }

  async enable2fa(req: Request, res: Response): Promise<void> {
    const { token } = req.body as TotpVerifyInput;
    const result = await authService.enable2fa(req.user!._id.toString(), token);
    sendSuccess(res, result);
  }

  async disable2fa(req: Request, res: Response): Promise<void> {
    const { token } = req.body as TotpVerifyInput;
    const result = await authService.disable2fa(req.user!._id.toString(), token);
    sendSuccess(res, result);
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    const { token } = req.params;
    const result = await authService.verifyEmail(token ?? '');
    sendSuccess(res, result);
  }

  async me(req: Request, res: Response): Promise<void> {
    const u = req.user as unknown as Record<string, unknown>;
    const { _id, ...rest } = u;
    sendSuccess(res, { id: String(_id), ...rest });
  }
}

export const authController = new AuthController();
