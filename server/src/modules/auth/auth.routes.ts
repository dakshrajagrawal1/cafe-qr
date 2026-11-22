// ============================================================
// Auth Routes
// ============================================================

import { Router } from 'express';
import * as authCtrl from './auth.controller.js';
import { requireAuth, validate, loginLimiter, otpLimiter } from '../../middleware/index.js';
import { z } from 'zod';

const router = Router();

// ---- Validation Schemas ----

const registerSchema = z.object({
  cafeName: z.string().min(2).max(255),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9][a-z0-9-]*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  ownerName: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number'),
  password: z.string().min(8).max(128),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  currency: z.string().length(3).default('INR'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  twoFactorCode: z.string().length(6).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const sendOtpSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/),
});

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/),
  otp: z.string().length(6),
  name: z.string().min(1).max(255).optional(),
  consentGiven: z.boolean().optional(),
});

// ---- Routes ----

router.post('/register', validate({ body: registerSchema }), authCtrl.register);
router.post('/login', loginLimiter, validate({ body: loginSchema }), authCtrl.login);
router.post('/refresh', authCtrl.refresh);
router.post('/logout', authCtrl.logout);
router.post('/change-password', requireAuth, validate({ body: changePasswordSchema }), authCtrl.changePassword);

// Customer OTP
router.post('/customer/otp/send', otpLimiter, validate({ body: sendOtpSchema }), authCtrl.sendCustomerOtp);
router.post('/customer/otp/verify', validate({ body: verifyOtpSchema }), authCtrl.verifyCustomerOtp);

export default router;

