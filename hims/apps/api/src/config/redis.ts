import { createClient } from 'redis';
import type { Redis as IORedisInstance } from 'ioredis';
import ioredis from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

export let isRedisAvailable = false;

export interface IRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  setEx(key: string, seconds: number, value: string): Promise<unknown>;
  del(keys: string | string[]): Promise<unknown>;
  keys(pattern: string): Promise<string[]>;
  sendCommand(args: string[]): Promise<unknown>;
  on(event: string, listener: (...args: unknown[]) => void): this;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

// Redis client for general use (sessions, cache, OTP)
export const redisClient: IRedisClient = createClient({ url: env.REDIS_URL }) as unknown as IRedisClient;

redisClient.on('error', (err) => logger.warn('Redis client error', { error: (err as Error).message }));
redisClient.on('connect', () => { isRedisAvailable = true; logger.info('Redis connected'); });
redisClient.on('reconnecting', () => logger.warn('Redis reconnecting'));

// IORedis for BullMQ — ioredis v5 ESM requires the cast below
type IORedisConstructor = new (url: string, options: object) => IORedisInstance;
export const bullRedis = new (ioredis as unknown as IORedisConstructor)(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

bullRedis.on('error', (err: Error) => logger.warn('BullMQ Redis error', { error: err.message }));

export async function connectRedis(): Promise<void> {
  try {
    await redisClient.connect();
    await bullRedis.connect();
    isRedisAvailable = true;
    logger.info('Redis ready');
  } catch (err) {
    logger.warn('Redis unavailable — running without cache/queues', { error: String(err) });
    isRedisAvailable = false;
  }
}

export async function disconnectRedis(): Promise<void> {
  try {
    await redisClient.disconnect();
    await bullRedis.quit();
  } catch {
    // ignore disconnect errors
  }
}

// Utility wrappers — all silently no-op when Redis is down
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isRedisAvailable) return null;
  try {
    const data = await redisClient.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch { return null; }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  if (!isRedisAvailable) return;
  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await redisClient.setEx(key, ttlSeconds, serialized);
    } else {
      await redisClient.set(key, serialized);
    }
  } catch { /* ignore */ }
}

export async function cacheDel(key: string | string[]): Promise<void> {
  if (!isRedisAvailable) return;
  try {
    await redisClient.del(Array.isArray(key) ? key : [key]);
  } catch { /* ignore */ }
}

export async function cacheKeys(pattern: string): Promise<string[]> {
  if (!isRedisAvailable) return [];
  try {
    return redisClient.keys(pattern);
  } catch { return []; }
}
