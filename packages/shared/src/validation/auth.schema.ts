import { z } from 'zod';

export const registerCafeSchema = z.object({
  cafeName: z.string().min(2).max(255),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9][a-z0-9-]*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  ownerName: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number format'),
  password: z.string().min(8).max(128),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  currency: z.string().length(3).default('INR'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  twoFactorCode: z.string().length(6).optional(),
});

export const customerOtpSendSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number format'),
});

export const customerOtpVerifySchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number format'),
  otp: z.string().length(6),
  name: z.string().min(1).max(255).optional(),
  consentGiven: z.boolean().optional(),
});

