export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown> | unknown[];
  };
  meta?: {
    pagination?: PaginationMeta;
    [key: string]: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  tenantId: string;
  avatar?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  is2faEnabled: boolean;
  permissions: string[];
  tenant?: {
    id: string;
    name: string;
    logo?: string;
    currency: string;
    timezone: string;
  };
}

export interface TenantSettings {
  name: string;
  logo?: string;
  tagline?: string;
  phone: string;
  email: string;
  address: string;
  website?: string;
  registrationNumber?: string;
  gstNumber?: string;
  currency: 'INR' | 'USD';
  timezone: string;
  uhidPrefix: string;
  uhidFormat: string;
  enabledModules: string[];
  features: Record<string, boolean>;
}
