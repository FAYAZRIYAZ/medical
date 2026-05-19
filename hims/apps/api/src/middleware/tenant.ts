import type { Request, Response, NextFunction } from 'express';
import type { ITenant } from '../modules/tenants/tenant.model.js';
import { TenantModel } from '../modules/tenants/tenant.model.js';
import { TenantError } from '../utils/errors.js';
import { cacheGet, cacheSet } from '../config/redis.js';

export async function tenantContext(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const tenantId = req.tenantId ?? req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      next(new TenantError('Tenant ID required'));
      return;
    }

    const cacheKey = `tenant:${tenantId}`;
    let tenant = await cacheGet(cacheKey);

    if (!tenant) {
      const dbTenant = await TenantModel.findById(tenantId).lean();
      if (!dbTenant || !dbTenant.isActive) {
        next(new TenantError('Tenant not found or inactive'));
        return;
      }
      tenant = dbTenant;
      await cacheSet(cacheKey, dbTenant, 300);
    }

    req.tenant = tenant as unknown as ITenant;
    req.tenantId = tenantId;
    next();
  } catch (err) {
    next(err);
  }
}
