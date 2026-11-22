import type { BillingPeriod, SubscriptionStatus } from '../constants/statuses.js';

export interface PlanFeatureMap {
  max_tables: number;
  max_menu_items: number;
  max_staff: number;
  kitchen_screen: boolean;
  waiter_screen: boolean;
  online_payments: boolean;
  shared_cart: boolean;
  analytics_level: 'basic' | 'advanced' | 'full';
  offers_coupons: boolean;
  remove_branding: boolean;
  order_history_days: number;
  [key: string]: any;
}

export interface PlanSummary {
  id: string;
  name: string;
  pricePaise: number;
  billingPeriod: BillingPeriod;
  billingDays?: number | null;
  trialDays: number;
  isActive: boolean;
  sortOrder: number;
  features: Record<string, string>;
}

export interface SubscriptionDetails {
  id: string;
  cafeId: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  effectiveStatus: SubscriptionStatus;
  isOrderingAllowed: boolean;
  isGracePeriod: boolean;
  startsAt: string;
  expiresAt: string;
  graceDays: number;
  graceEndsAt: string;
  daysRemaining: number;
  customPricePaise?: number | null;
  features: PlanFeatureMap;
}

export interface SubscriptionPaymentSummary {
  id: string;
  subscriptionId: string;
  amountPaise: number;
  mode: 'online' | 'cash' | 'upi' | 'bank';
  gatewayRef?: string | null;
  invoiceNumber?: string | null;
  paidAt?: string | null;
  status: 'pending' | 'completed' | 'failed';
  notes?: string | null;
}
