export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  HOSPITAL_ADMIN: 'hospital_admin',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  RECEPTIONIST: 'receptionist',
  PHARMACIST: 'pharmacist',
  LAB_TECHNICIAN: 'lab_technician',
  RADIOLOGIST: 'radiologist',
  ACCOUNTANT: 'accountant',
  PATIENT: 'patient',
  AMBULANCE_DRIVER: 'ambulance_driver',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  // Patient
  PATIENT_CREATE: 'patient:create',
  PATIENT_READ: 'patient:read',
  PATIENT_UPDATE: 'patient:update',
  PATIENT_DELETE: 'patient:delete',
  // Appointment
  APPOINTMENT_CREATE: 'appointment:create',
  APPOINTMENT_READ: 'appointment:read',
  APPOINTMENT_UPDATE: 'appointment:update',
  APPOINTMENT_CANCEL: 'appointment:cancel',
  // Encounter / Consultation
  ENCOUNTER_CREATE: 'encounter:create',
  ENCOUNTER_READ: 'encounter:read',
  ENCOUNTER_UPDATE: 'encounter:update',
  // Prescription
  PRESCRIPTION_CREATE: 'prescription:create',
  PRESCRIPTION_SIGN: 'prescription:sign',
  PRESCRIPTION_READ: 'prescription:read',
  // Lab
  LAB_ORDER_CREATE: 'lab_order:create',
  LAB_ORDER_READ: 'lab_order:read',
  LAB_RESULT_ENTER: 'lab_result:enter',
  LAB_RESULT_VERIFY: 'lab_result:verify',
  // Pharmacy
  PHARMACY_DISPENSE: 'pharmacy:dispense',
  PHARMACY_STOCK_MANAGE: 'pharmacy:stock_manage',
  PHARMACY_READ: 'pharmacy:read',
  // IPD
  IPD_ADMIT: 'ipd:admit',
  IPD_DISCHARGE: 'ipd:discharge',
  IPD_READ: 'ipd:read',
  IPD_UPDATE: 'ipd:update',
  // Billing
  BILLING_CREATE: 'billing:create',
  BILLING_READ: 'billing:read',
  BILLING_UPDATE: 'billing:update',
  BILLING_REFUND: 'billing:refund',
  // Admin
  ADMIN_USERS: 'admin:users',
  ADMIN_SETTINGS: 'admin:settings',
  ADMIN_REPORTS: 'admin:reports',
  ADMIN_TENANTS: 'admin:tenants',
  // Vitals
  VITALS_RECORD: 'vitals:record',
  VITALS_READ: 'vitals:read',
  // OT
  OT_SCHEDULE: 'ot:schedule',
  OT_READ: 'ot:read',
  // Radiology
  RADIOLOGY_ORDER_CREATE: 'radiology_order:create',
  RADIOLOGY_REPORT_ENTER: 'radiology_report:enter',
  // Insurance
  INSURANCE_MANAGE: 'insurance:manage',
  INSURANCE_READ: 'insurance:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: Object.values(PERMISSIONS) as Permission[],
  hospital_admin: [
    'patient:create', 'patient:read', 'patient:update', 'patient:delete',
    'appointment:create', 'appointment:read', 'appointment:update', 'appointment:cancel',
    'encounter:create', 'encounter:read', 'encounter:update',
    'prescription:create', 'prescription:sign', 'prescription:read',
    'lab_order:create', 'lab_order:read', 'lab_result:enter', 'lab_result:verify',
    'pharmacy:dispense', 'pharmacy:stock_manage', 'pharmacy:read',
    'ipd:admit', 'ipd:discharge', 'ipd:read', 'ipd:update',
    'billing:create', 'billing:read', 'billing:update', 'billing:refund',
    'admin:users', 'admin:settings', 'admin:reports',
    'vitals:record', 'vitals:read',
    'ot:schedule', 'ot:read',
    'radiology_order:create', 'radiology_report:enter',
    'insurance:manage', 'insurance:read',
  ] as Permission[],
  doctor: [
    'patient:create', 'patient:read', 'patient:update',
    'appointment:create', 'appointment:read', 'appointment:update', 'appointment:cancel',
    'encounter:create', 'encounter:read', 'encounter:update',
    'prescription:create', 'prescription:sign', 'prescription:read',
    'lab_order:create', 'lab_order:read',
    'pharmacy:read',
    'ipd:admit', 'ipd:discharge', 'ipd:read', 'ipd:update',
    'billing:read',
    'vitals:read',
    'ot:schedule', 'ot:read',
    'radiology_order:create',
    'insurance:read',
  ] as Permission[],
  nurse: [
    'patient:read', 'patient:update',
    'appointment:read',
    'encounter:read',
    'prescription:read',
    'lab_order:read',
    'pharmacy:read',
    'ipd:read', 'ipd:update',
    'billing:read',
    'vitals:record', 'vitals:read',
    'ot:read',
  ] as Permission[],
  receptionist: [
    'patient:create', 'patient:read', 'patient:update',
    'appointment:create', 'appointment:read', 'appointment:update', 'appointment:cancel',
    'encounter:read',
    'billing:create', 'billing:read',
    'ipd:read',
  ] as Permission[],
  pharmacist: [
    'patient:read',
    'prescription:read',
    'pharmacy:dispense', 'pharmacy:stock_manage', 'pharmacy:read',
    'billing:create', 'billing:read',
  ] as Permission[],
  lab_technician: [
    'patient:read',
    'lab_order:read', 'lab_result:enter',
    'billing:create', 'billing:read',
  ] as Permission[],
  radiologist: [
    'patient:read',
    'radiology_order:create', 'radiology_report:enter',
  ] as Permission[],
  accountant: [
    'billing:create', 'billing:read', 'billing:update', 'billing:refund',
    'insurance:manage', 'insurance:read',
    'admin:reports',
  ] as Permission[],
  patient: [
    'appointment:create', 'appointment:read', 'appointment:cancel',
    'prescription:read',
    'lab_order:read',
    'billing:read',
    'vitals:read',
    'insurance:read',
  ] as Permission[],
  ambulance_driver: [] as Permission[],
};

export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  RESCHEDULED: 'rescheduled',
} as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];

export const APPOINTMENT_TYPE = {
  IN_PERSON: 'in_person',
  TELEMEDICINE: 'telemedicine',
  WALK_IN: 'walk_in',
} as const;

export const BED_STATUS = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  RESERVED: 'reserved',
  MAINTENANCE: 'maintenance',
} as const;

export const WARD_TYPE = {
  GENERAL: 'general',
  SEMI_PRIVATE: 'semi_private',
  PRIVATE: 'private',
  ICU: 'icu',
  NICU: 'nicu',
  HDU: 'hdu',
  EMERGENCY: 'emergency',
  OT: 'ot',
} as const;

export const TRIAGE_LEVEL = {
  IMMEDIATE: 1,
  EMERGENT: 2,
  URGENT: 3,
  SEMI_URGENT: 4,
  NON_URGENT: 5,
} as const;

export const INVOICE_STATUS = {
  DRAFT: 'draft',
  ISSUED: 'issued',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export const PAYMENT_METHOD = {
  CASH: 'cash',
  CARD: 'card',
  UPI: 'upi',
  NET_BANKING: 'net_banking',
  CHEQUE: 'cheque',
  WALLET: 'wallet',
  INSURANCE: 'insurance',
} as const;

export const LAB_ORDER_STATUS = {
  ORDERED: 'ordered',
  SAMPLE_COLLECTED: 'sample_collected',
  IN_PROGRESS: 'in_progress',
  RESULT_ENTERED: 'result_entered',
  VERIFIED: 'verified',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export const NOTIFICATION_CHANNEL = {
  EMAIL: 'email',
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
  IN_APP: 'in_app',
  PUSH: 'push',
} as const;

export const BLOOD_GROUP = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = (typeof BLOOD_GROUP)[number];

export const GENDER = ['male', 'female', 'other', 'prefer_not_to_say'] as const;
export type Gender = (typeof GENDER)[number];

export const DRUG_SCHEDULE = ['general', 'H', 'H1', 'X', 'G', 'J', 'L'] as const;
export const DOSAGE_FREQUENCY = ['OD', 'BD', 'TDS', 'QID', 'SOS', 'STAT', 'HS', 'AC', 'PC'] as const;
export const DOSAGE_ROUTE = ['oral', 'iv', 'im', 'sc', 'topical', 'inhalation', 'sublingual', 'rectal'] as const;

export const CLAIM_STATUS = {
  SUBMITTED: 'submitted',
  PENDING: 'pending',
  PRE_AUTH_REQUESTED: 'pre_auth_requested',
  PRE_AUTH_APPROVED: 'pre_auth_approved',
  PRE_AUTH_REJECTED: 'pre_auth_rejected',
  SETTLED: 'settled',
  REJECTED: 'rejected',
  UNDER_QUERY: 'under_query',
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const API_RESPONSE_CODES = {
  SUCCESS: 'SUCCESS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
} as const;

export const CURRENCIES = {
  INR: { code: 'INR', symbol: '₹', locale: 'en-IN' },
  USD: { code: 'USD', symbol: '$', locale: 'en-US' },
} as const;

export const TIMEZONES = {
  IST: 'Asia/Kolkata',
  UTC: 'UTC',
} as const;
