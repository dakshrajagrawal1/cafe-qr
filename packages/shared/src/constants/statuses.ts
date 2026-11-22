export const CafeStatus = {
  PENDING_VERIFICATION: 'pending_verification',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
} as const;
export type CafeStatus = (typeof CafeStatus)[keyof typeof CafeStatus];

export const DocumentType = {
  BUSINESS_REGISTRATION: 'business_registration',
  FSSAI: 'fssai',
  GSTIN: 'gstin',
  OWNER_ID_PROOF: 'owner_id_proof',
  CAFE_PHOTO: 'cafe_photo',
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export const DocumentStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const OrderStatus = {
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const DishStatus = {
  PLACED: 'placed',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
  CANCELLED: 'cancelled',
} as const;
export type DishStatus = (typeof DishStatus)[keyof typeof DishStatus];

export const SessionStatus = {
  OPEN: 'open',
  BILL_REQUESTED: 'bill_requested',
  CLOSED: 'closed',
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const SubscriptionStatus = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  EXPIRING: 'expiring',
  GRACE: 'grace',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const BillingPeriod = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
  CUSTOM: 'custom',
} as const;
export type BillingPeriod = (typeof BillingPeriod)[keyof typeof BillingPeriod];
