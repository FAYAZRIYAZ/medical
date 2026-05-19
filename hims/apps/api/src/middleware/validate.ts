import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodSchema, z } from 'zod';
import { ValidationError } from '../utils/errors.js';

type Source = 'body' | 'query' | 'params';

export function validate<T extends ZodSchema>(
  schema: T,
  source: Source = 'body'
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      next(new ValidationError('Validation failed', details));
      return;
    }
    req[source] = result.data as z.infer<T>;
    next();
  };
}
