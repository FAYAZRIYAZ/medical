import { createClient } from 'redis';
import type { Redis as IORedisInstance } from 'ioredis';
import ioredis from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

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

redisClient.on('error', (err) => logger.error('Redis client error', { error: (err as Error).message }));
redisClient.on('connect', () => logger.info('Redis connected'));
redisClient.on('reconnecting', () => logger.warn('Redis reconnecting'));

// IORedis for BullMQ — ioredis v5 ESM requires the cast below
type IORedisConstructor = new (url: string, options: object) => IORedisInstance;
export const bullRedis = new (ioredis as unknown as IORedisConstructor)(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export async function connectRedis(): Promise<void> {
  await redisClient.connect();
}

export async function disconnectRedis(): Promise<void> {
  await redisClient.disconnect();
  await bullRedis.quit();
}

// Utility wrappers
export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await redisClient.get(key);
  if (!data) return null;
  return JSON.parse(data) as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const serialized = JSON.stringify(value);
  if (ttlSeconds) {
    await redisClient.setEx(key, ttlSeconds, serialized);
  } else {
    await redisClient.set(key, serialized);
  }
}

export async function cacheDel(key: string | string[]): Promise<void> {
  await redisClient.del(Array.isArray(key) ? key : [key]);
}

export async function cacheKeys(pattern: string): Promise<string[]> {
  return redisClient.keys(pattern);
}
