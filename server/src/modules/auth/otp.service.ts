// ============================================================
// OTP Service — Provider Interface + Console Implementation
// ============================================================

import crypto from 'node:crypto';
import argon2 from 'argon2';
import prisma from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { ValidationError, RateLimitError } from '../../lib/errors.js';

const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 3;

/**
 * Generate and send an OTP to a phone number.
 * In development (console provider), the OTP is logged to console.
 */
export async function sendOtp(phone: string, purpose: 'login' | 'verify_phone'): Promise<string> {
  // Check rate limit: max 3 OTPs per phone per 10 minutes (bypass in development)
  if (env.NODE_ENV !== 'development') {
    const recentCount = await prisma.otpRequest.count({
      where: {
        phone,
        createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) },
      },
    });

    if (recentCount >= 3) {
      throw new RateLimitError('Too many OTP requests. Please try again later.');
    }
  }

  // Generate 6-digit OTP
  const otp = generateOtp();
  const otpHash = await argon2.hash(otp);

  // Store OTP request
  await prisma.otpRequest.create({
    data: {
      phone,
      otpHash,
      purpose,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    },
  });

  // Send via provider
  if (env.OTP_PROVIDER === 'console') {
    console.log(`\n📱 [OTP] Phone: ${phone} | OTP: ${otp} | Purpose: ${purpose}\n`);
  } else if (env.OTP_PROVIDER === 'msg91') {
    await sendViaMSG91(phone, otp);
  }

  return otp;
}

/**
 * Verify an OTP for a phone number.
 * Returns true if valid, throws on failure.
 */
export async function verifyOtp(phone: string, otp: string, purpose: 'login' | 'verify_phone'): Promise<boolean> {
  // Find the most recent unverified OTP for this phone
  const otpRequest = await prisma.otpRequest.findFirst({
    where: {
      phone,
      purpose,
      verified: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRequest) {
    throw new ValidationError('OTP expired or not found. Please request a new one.');
  }

  // Check attempts
  if (otpRequest.attempts >= MAX_OTP_ATTEMPTS) {
    throw new RateLimitError('Maximum OTP verification attempts exceeded. Request a new OTP.');
  }

  // Increment attempts
  await prisma.otpRequest.update({
    where: { id: otpRequest.id },
    data: { attempts: { increment: 1 } },
  });

  // Verify OTP hash (also allows '123456' as dev bypass in development mode)
  const isDevBypass = env.NODE_ENV === 'development' && otp === '123456';
  const isValid = isDevBypass || (await argon2.verify(otpRequest.otpHash, otp));
  if (!isValid) {
    throw new ValidationError('Invalid OTP. Please try again.');
  }

  // Mark as verified
  await prisma.otpRequest.update({
    where: { id: otpRequest.id },
    data: { verified: true },
  });

  return true;
}

/** Generate a 6-digit numeric OTP */
function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

/** Send OTP via MSG91 (placeholder — implement when needed) */
async function sendViaMSG91(phone: string, otp: string): Promise<void> {
  // TODO: Implement MSG91 API call
  // const response = await fetch('https://api.msg91.com/api/v5/otp', {
  //   method: 'POST',
  //   headers: {
  //     'authkey': env.MSG91_AUTH_KEY!,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     template_id: env.MSG91_TEMPLATE_ID,
  //     mobile: phone,
  //     otp,
  //   }),
  // });
  console.log(`[MSG91] Would send OTP ${otp} to ${phone}`);
}

