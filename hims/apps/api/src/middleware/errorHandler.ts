import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';
import { sendError } from '../utils/response.js';

function isMongoConflict(e: unknown): e is { code: number; keyPattern?: Record<string, unknown> } {
  return typeof e === 'object' && e !== null && 'code' in e && (e as Record<string, unknown>)['code'] === 11000;
}

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    if (!err.isOperational || err.statusCode >= 500) {
      logger.error('Application error', { message: err.message, stack: err.stack, code: err.code });
    }
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
    sendError(res, 422, 'VALIDATION_ERROR', 'Validation failed', details);
    return;
  }

  if (isMongoConflict(err)) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'field';
    sendError(res, 409, 'CONFLICT', `${field} already exists`);
    return;
  }

  if (err instanceof Error) {
    logger.error('Unhandled error', { message: err.message, stack: err.stack });
  } else {
    logger.error('Unknown error', { err });
  }

  sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
};

export function notFound(_req: Request, res: Response): void {
  sendError(res, 404, 'NOT_FOUND', 'Route not found');
}
