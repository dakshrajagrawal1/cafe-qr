// ============================================================
// Environment Configuration with Validation
// ============================================================

import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // Server
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),
  CUSTOMER_APP_URL: z.string().default('http://localhost:5173'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Table token signing
  TABLE_TOKEN_SECRET: z.string().min(16, 'TABLE_TOKEN_SECRET must be at least 16 characters'),

  // OTP
  OTP_PROVIDER: z.enum(['console', 'msg91']).default('console'),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),
  MSG91_SENDER_ID: z.string().default('CAFEQR'),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(''),

  // File uploads
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_IMAGE_SIZE_MB: z.string().default('5').transform(Number),
  MAX_DOCUMENT_SIZE_MB: z.string().default('10').transform(Number),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174,http://localhost:5175'),

  // Super Admin seed
  SUPER_ADMIN_EMAIL: z.string().email().default('admin@cafeqr.com'),
  SUPER_ADMIN_PASSWORD: z.string().min(8).default('change-this-password'),

  // Internal cron key
  INTERNAL_CRON_KEY: z.string().default('dev-cron-key'),
});

// Parse and validate — will throw on missing/invalid values
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export type Env = z.infer<typeof envSchema>;

