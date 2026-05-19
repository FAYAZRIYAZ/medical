import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import ioredis from 'ioredis';
import { env } from '../config/env.js';

// ioredis auto-connects on first command — safe to use before server.listen()
type IORedisAny = { call(cmd: string, ...args: string[]): Promise<unknown> };
const rl = new (ioredis as unknown as new (url: string) => IORedisAny)(env.REDIS_URL);

const makeStore = (prefix: string) =>
  new RedisStore({
    sendCommand: ((...args: string[]) => rl.call(args[0]!, ...args.slice(1))) as never,
    prefix: `rl:${prefix}:`,
  });

export const globalRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('global'),
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
});

export const loginRateLimit = rateLimit({
  windowMs: 60_000,
  max: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('login'),
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many login attempts' } },
});

export const otpRateLimit = rateLimit({
  windowMs: 60_000,
  max: env.OTP_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('otp'),
  keyGenerator: (req) => (req.body as { phone?: string })?.phone ?? req.ip ?? 'unknown',
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many OTP requests' } },
});

export const passwordResetRateLimit = rateLimit({
  windowMs: 3_600_000,
  max: 3,
  store: makeStore('pw_reset'),
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many password reset requests' } },
});
