import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@hims/shared';
import type { IUser } from '../modules/users/user.model.js';
import { env } from '../config/env.js';
import { redisClient } from '../config/redis.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { UserModel } from '../modules/users/user.model.js';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken as string;
    }

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    const revoked = await redisClient.get(`revoked:session:${payload.sessionId}`);
    if (revoked) {
      throw new UnauthorizedError('Session has been revoked');
    }

    const user = await UserModel.findById(payload.userId).select('-password').lean();
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    req.user = user as unknown as IUser;
    req.jwtPayload = payload;
    req.tenantId = payload.tenantId;
    req.sessionId = payload.sessionId;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      next(new ForbiddenError(`Required role: ${roles.join(' or ')}`));
      return;
    }
    next();
  };
}

export function requirePermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userPermissions = (req.user?.permissions ?? []) as string[];
    const hasAll = permissions.every((p) => userPermissions.includes(p));
    if (!hasAll) {
      next(new ForbiddenError(`Missing permissions: ${permissions.join(', ')}`));
      return;
    }
    next();
  };
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!token) { next(); return; }

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    const user = await UserModel.findById(payload.userId).select('-password').lean();
    if (user?.isActive) {
      req.user = user as unknown as IUser;
      req.jwtPayload = payload;
      req.tenantId = payload.tenantId;
    }
  } catch {
    // silently skip
  }
  next();
}
