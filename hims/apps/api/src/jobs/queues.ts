import { Queue } from 'bullmq';
import { bullRedis } from '../config/redis.js';

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { count: 100, age: 24 * 3600 },
  removeOnFail: { count: 500 },
};

export const notificationQueue = new Queue('notifications', {
  connection: bullRedis,
  defaultJobOptions,
});

export const pdfQueue = new Queue('pdf-generation', {
  connection: bullRedis,
  defaultJobOptions,
});

export const reportDeliveryQueue = new Queue('report-delivery', {
  connection: bullRedis,
  defaultJobOptions,
});

export const reminderQueue = new Queue('reminders', {
  connection: bullRedis,
  defaultJobOptions,
});

export const inventoryQueue = new Queue('inventory-alerts', {
  connection: bullRedis,
  defaultJobOptions: { ...defaultJobOptions, attempts: 1 },
});

export const analyticsQueue = new Queue('analytics-rollup', {
  connection: bullRedis,
  defaultJobOptions: { ...defaultJobOptions, attempts: 2 },
});

export const cleanupQueue = new Queue('cleanup', {
  connection: bullRedis,
  defaultJobOptions: { ...defaultJobOptions, attempts: 1 },
});

export const allQueues = [
  notificationQueue,
  pdfQueue,
  reportDeliveryQueue,
  reminderQueue,
  inventoryQueue,
  analyticsQueue,
  cleanupQueue,
];
