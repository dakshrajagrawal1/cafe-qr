import { z } from 'zod';

export const createPlanSchema = z.object({
  name: z.string().min(2).max(100),
  pricePaise: z.number().int().min(0),
  billingPeriod: z.enum(['monthly', 'quarterly', 'yearly', 'custom']),
  billingDays: z.number().int().min(1).optional().nullable(),
  trialDays: z.number().int().min(0).default(14),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  features: z.record(z.string()).default({}),
});

export const updatePlanSchema = createPlanSchema.partial();

export const extendSubscriptionSchema = z.object({
  days: z.number().int().min(1).max(3650), // up to 10 years
  reason: z.string().min(2).max(500),
});

export const changePlanSchema = z.object({
  planId: z.string().min(1),
  convertLeftoverDays: z.boolean().default(true),
  customPricePaise: z.number().int().min(0).optional().nullable(),
  reason: z.string().min(2).max(500),
});

export const recordOfflinePaymentSchema = z.object({
  amountPaise: z.number().int().min(0),
  mode: z.enum(['cash', 'upi', 'bank']),
  extendDays: z.number().int().min(0).default(30),
  notes: z.string().max(500).optional(),
});

export const updatePlatformSettingsSchema = z.object({
  defaultTrialDays: z.number().int().min(0).max(90).optional(),
  defaultGraceDays: z.number().int().min(0).max(30).optional(),
  razorpayKeyId: z.string().max(255).optional().nullable(),
  razorpayKeySecret: z.string().max(255).optional().nullable(),
  razorpayWebhookSecret: z.string().max(255).optional().nullable(),
  otpProvider: z.enum(['console', 'msg91']).optional(),
  gstNumber: z.string().max(50).optional().nullable(),
  platformName: z.string().max(100).optional(),
  supportEmail: z.string().email().optional().nullable(),
});
