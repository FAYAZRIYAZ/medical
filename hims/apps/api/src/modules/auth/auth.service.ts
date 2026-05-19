import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { JwtPayload } from '@hims/shared';
import { env } from '../../config/env.js';
import { redisClient } from '../../config/redis.js';
import { UserModel } from '../users/user.model.js';
import { TenantModel } from '../tenants/tenant.model.js';
import { logger } from '../../config/logger.js';
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  AppError,
  ValidationError,
} from '../../utils/errors.js';
import { notificationQueue } from '../../jobs/queues.js';
import type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from '@hims/shared';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: env.ARGON2_MEMORY_COST,
  timeCost: env.ARGON2_TIME_COST,
  parallelism: env.ARGON2_PARALLELISM,
};

const ACCOUNT_LOCK_THRESHOLD = 5;
const ACCOUNT_LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export class AuthService {
  async login(input: LoginInput, ip: string) {
    const { email, password, tenantId } = input;

    const query = tenantId
      ? { email: email.toLowerCase(), tenantId }
      : { email: email.toLowerCase() };

    const user = await UserModel.findOne(query).select('+password +totpSecret').lean();
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new AppError(`Account locked. Try again in ${minutesLeft} minutes`, 423, 'ACCOUNT_LOCKED');
    }

    const validPassword = await argon2.verify(user.password, password, ARGON2_OPTIONS);
    if (!validPassword) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const update: Record<string, unknown> = { failedLoginAttempts: attempts };
      if (attempts >= ACCOUNT_LOCK_THRESHOLD) {
        update.lockedUntil = new Date(Date.now() + ACCOUNT_LOCK_DURATION_MS);
      }
      await UserModel.updateOne({ _id: user._id }, update);
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account deactivated. Contact admin.');
    }

    // Reset failed attempts on success
    await UserModel.updateOne(
      { _id: user._id },
      { failedLoginAttempts: 0, $unset: { lockedUntil: 1 }, lastLoginAt: new Date(), lastLoginIp: ip }
    );

    // If 2FA enabled, return partial token requiring TOTP
    if (user.is2faEnabled) {
      const partialToken = jwt.sign(
        { userId: String(user._id), step: 'totp' },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '5m' }
      );
      return { requires2fa: true, partialToken };
    }

    return this._issueTokenPair(user._id.toString(), user.tenantId.toString(), user.role);
  }

  async verify2fa(partialToken: string, totp: string) {
    let payload: { userId: string; step: string };
    try {
      payload = jwt.verify(partialToken, env.JWT_ACCESS_SECRET) as typeof payload;
    } catch {
      throw new UnauthorizedError('Invalid or expired 2FA token');
    }
    if (payload.step !== 'totp') throw new UnauthorizedError('Invalid token type');

    const user = await UserModel.findById(payload.userId).select('+totpSecret').lean();
    if (!user?.totpSecret) throw new UnauthorizedError('2FA not configured');

    const valid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: totp,
      window: 1,
    });
    if (!valid) throw new UnauthorizedError('Invalid TOTP code');

    return this._issueTokenPair(user._id.toString(), user.tenantId.toString(), user.role);
  }

  async loginWithOtp(phone: string, otp: string, tenantId: string) {
    const stored = await redisClient.get(`otp:${phone}`);
    if (!stored || stored !== otp) {
      throw new UnauthorizedError('Invalid or expired OTP');
    }
    await redisClient.del(`otp:${phone}`);

    const existingUser = await UserModel.findOne({ phone, tenantId, role: 'patient' }).lean();

    let uid: string;
    let tid: string;
    let role: string;

    if (existingUser) {
      uid = existingUser._id.toString();
      tid = existingUser.tenantId.toString();
      role = existingUser.role;
    } else {
      const tenant = await TenantModel.findById(tenantId).lean();
      if (!tenant) throw new NotFoundError('Tenant');
      const newUser = await UserModel.create({
        tenantId,
        firstName: 'Patient',
        lastName: phone.slice(-4),
        email: `${phone}@otp.hims.local`,
        password: await argon2.hash(uuidv4(), ARGON2_OPTIONS),
        phone,
        role: 'patient',
        isPhoneVerified: true,
      });
      uid = newUser._id.toString();
      tid = newUser.tenantId.toString();
      role = newUser.role;
    }

    return this._issueTokenPair(uid, tid, role);
  }

  async sendOtp(phone: string, channel: 'sms' | 'whatsapp') {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await redisClient.setEx(`otp:${phone}`, 300, otp);

    await notificationQueue.add('send-otp', {
      phone,
      otp,
      channel,
      template: 'otp',
    });

    logger.info('OTP dispatched', { phone: phone.replace(/\d(?=\d{4})/g, '*'), channel });
    return { message: `OTP sent via ${channel}` };
  }

  async register(input: RegisterInput) {
    const { email, password, phone, firstName, lastName, tenantId, role } = input;

    const existing = await UserModel.findOne({ email: email.toLowerCase(), tenantId }).lean();
    if (existing) throw new ConflictError('Email already registered');

    const hashed = await argon2.hash(password, ARGON2_OPTIONS);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await UserModel.create({
      tenantId,
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      password: hashed,
      role: role ?? 'patient',
      emailVerificationToken: crypto.createHash('sha256').update(verificationToken).digest('hex'),
      emailVerificationExpiry: new Date(Date.now() + 24 * 3600 * 1000),
    });

    await notificationQueue.add('send-email-verification', {
      userId: user._id.toString(),
      email: user.email,
      name: user.firstName,
      token: verificationToken,
    });

    const { password: _pw, ...userObj } = user.toObject() as unknown as Record<string, unknown>;
    return userObj;
  }

  async refreshToken(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const storedHash = await redisClient.get(`refresh:${payload.sessionId}`);
    if (!storedHash) throw new UnauthorizedError('Session expired');

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    if (storedHash !== tokenHash) throw new UnauthorizedError('Token reuse detected');

    // Rotate: delete old, issue new
    await redisClient.del(`refresh:${payload.sessionId}`);
    const user = await UserModel.findById(payload.userId).lean();
    if (!user?.isActive) throw new UnauthorizedError('User not found');

    return this._issueTokenPair(payload.userId, payload.tenantId, user.role);
  }

  async logout(sessionId: string) {
    await Promise.all([
      redisClient.del(`refresh:${sessionId}`),
      redisClient.setEx(`revoked:session:${sessionId}`, 15 * 60, '1'),
    ]);
  }

  async logoutAll(userId: string) {
    const sessions = await redisClient.keys(`session:user:${userId}:*`);
    if (sessions.length) {
      for (const s of sessions) {
        const sid = s.split(':')[3];
        if (sid) await redisClient.setEx(`revoked:session:${sid}`, 15 * 60, '1');
      }
      await redisClient.del(sessions);
    }
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const { email } = input;
    const user = await UserModel.findOne({ email: email.toLowerCase() }).lean();
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    await UserModel.updateOne(
      { _id: user._id },
      { passwordResetToken: hash, passwordResetExpiry: new Date(Date.now() + 15 * 60 * 1000) }
    );

    await notificationQueue.add('send-password-reset', {
      userId: user._id.toString(),
      email: user.email,
      name: user.firstName,
      token,
    });

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(input: ResetPasswordInput) {
    const { token, password } = input;
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await UserModel.findOne({
      passwordResetToken: hash,
      passwordResetExpiry: { $gt: new Date() },
    }).lean();

    if (!user) throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');

    const hashed = await argon2.hash(password, ARGON2_OPTIONS);
    await UserModel.updateOne(
      { _id: user._id },
      {
        password: hashed,
        passwordChangedAt: new Date(),
        $unset: { passwordResetToken: 1, passwordResetExpiry: 1 },
      }
    );

    // Revoke all sessions
    await this.logoutAll(user._id.toString());
    return { message: 'Password reset successful' };
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const { currentPassword, newPassword } = input;
    const user = await UserModel.findById(userId).select('+password').lean();
    if (!user) throw new NotFoundError('User');

    const valid = await argon2.verify(user.password, currentPassword, ARGON2_OPTIONS);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');

    const hashed = await argon2.hash(newPassword, ARGON2_OPTIONS);
    await UserModel.updateOne(
      { _id: userId },
      { password: hashed, passwordChangedAt: new Date() }
    );

    return { message: 'Password changed successfully' };
  }

  async setup2fa(userId: string) {
    const user = await UserModel.findById(userId).lean();
    if (!user) throw new NotFoundError('User');

    const secret = speakeasy.generateSecret({
      name: `${env.TOTP_ISSUER} (${user.email})`,
      issuer: env.TOTP_ISSUER,
    });

    // Store temporarily pending verification
    await redisClient.setEx(`totp_setup:${userId}`, 300, secret.base32);

    const otpauthUrl = secret.otpauth_url ?? '';
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    return { secret: secret.base32, qrCode, otpauthUrl };
  }

  async enable2fa(userId: string, token: string) {
    const pending = await redisClient.get(`totp_setup:${userId}`);
    if (!pending) throw new AppError('2FA setup session expired', 400, 'SETUP_EXPIRED');

    const valid = speakeasy.totp.verify({
      secret: pending,
      encoding: 'base32',
      token,
      window: 1,
    });
    if (!valid) throw new ValidationError('Invalid TOTP token');

    await UserModel.updateOne({ _id: userId }, { totpSecret: pending, is2faEnabled: true });
    await redisClient.del(`totp_setup:${userId}`);

    return { message: '2FA enabled successfully' };
  }

  async disable2fa(userId: string, token: string) {
    const user = await UserModel.findById(userId).select('+totpSecret').lean();
    if (!user?.totpSecret) throw new AppError('2FA not enabled', 400, 'NOT_ENABLED');

    const valid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token,
      window: 1,
    });
    if (!valid) throw new ValidationError('Invalid TOTP token');

    await UserModel.updateOne({ _id: userId }, { is2faEnabled: false, $unset: { totpSecret: 1 } });
    return { message: '2FA disabled' };
  }

  async verifyEmail(token: string) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await UserModel.findOne({
      emailVerificationToken: hash,
      emailVerificationExpiry: { $gt: new Date() },
    }).lean();

    if (!user) throw new AppError('Invalid or expired verification link', 400, 'INVALID_TOKEN');

    await UserModel.updateOne(
      { _id: user._id },
      { isEmailVerified: true, $unset: { emailVerificationToken: 1, emailVerificationExpiry: 1 } }
    );

    return { message: 'Email verified successfully' };
  }

  private async _issueTokenPair(userId: string, tenantId: string, role: string) {
    const sessionId = uuidv4();

    const payload = { userId, tenantId, role, sessionId };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as unknown as number,
    });

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as unknown as number,
    });

    // Store hashed refresh token
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const ttl = 7 * 24 * 3600;
    await Promise.all([
      redisClient.setEx(`refresh:${sessionId}`, ttl, tokenHash),
      redisClient.setEx(`session:user:${userId}:${sessionId}`, ttl, '1'),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer' as const,
      expiresIn: 15 * 60,
    };
  }
}

export const authService = new AuthService();
