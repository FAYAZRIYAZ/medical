import type { JwtPayload } from '@hims/shared';
import type { IUser } from '../modules/users/user.model.js';
import type { ITenant } from '../modules/tenants/tenant.model.js';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      jwtPayload?: JwtPayload;
      tenant?: ITenant;
      tenantId?: string;
      sessionId?: string;
    }
  }
}
