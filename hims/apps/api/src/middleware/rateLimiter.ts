import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// In-memory rate limiting — no Redis dependency.
// For multi-instance deployments, swap the store for a Redis-backed one.

export const globalRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
});

export const loginRateLimit = rateLimit({
  windowMs: 60_000,
  max: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many login attempts' } },
});

export const otpRateLimit = rateLimit({
  windowMs: 60_000,
  max: env.OTP_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.body as { phone?: string })?.phone ?? req.ip ?? 'unknown',
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many OTP requests' } },
});

export const passwordResetRateLimit = rateLimit({
  windowMs: 3_600_000,
  max: 3,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many password reset requests' } },
});
