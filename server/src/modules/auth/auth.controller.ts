// ============================================================
// Auth Controller — HTTP Handlers
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import * as authService from './auth.service.js';
import * as otpService from './otp.service.js';
import { verifyRefreshToken, signAccessToken } from './token.service.js';
import prisma from '../../lib/prisma.js';
import { UnauthorizedError } from '../../lib/errors.js';
import { env } from '../../config/env.js';

/** POST /api/auth/register */
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.registerCafe(req.body, req);

    // Set cookies
    setTokenCookies(res, result.accessToken, result.refreshToken);

    res.status(201).json({
      message: 'Cafe registered successfully. Pending verification.',
      data: {
        cafe: result.cafe,
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

/** POST /api/auth/login */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.loginUser(req.body, req);

    setTokenCookies(res, result.accessToken, result.refreshToken);

    res.json({
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

/** POST /api/auth/refresh */
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedError('No refresh token provided');
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Fetch user to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, cafeId: true, name: true, isActive: true, deletedAt: true },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedError('User not found or deactivated');
    }

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      cafeId: user.cafeId,
      name: user.name,
    });

    res.cookie('access_token', accessToken, cookieOptions());

    res.json({
      data: { accessToken },
    });
  } catch (error) {
    next(error);
  }
}

/** POST /api/auth/logout */
export async function logout(_req: Request, res: Response) {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.clearCookie('csrf_token');
  res.json({ message: 'Logged out successfully' });
}

/** POST /api/auth/change-password */
export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.changePassword(
      req.user!.id,
      req.body.currentPassword,
      req.body.newPassword,
      req,
    );

    // Clear tokens — user must re-login
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    res.json({ message: 'Password changed. Please log in again.' });
  } catch (error) {
    next(error);
  }
}

/** POST /api/customer/otp/send */
export async function sendCustomerOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const otp = await otpService.sendOtp(req.body.phone, 'login');
    res.json({
      message: 'OTP sent successfully',
      ...(env.NODE_ENV === 'development' && { devOtp: otp }),
    });
  } catch (error) {
    next(error);
  }
}

/** POST /api/customer/otp/verify */
export async function verifyCustomerOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { phone, otp, name, consentGiven } = req.body;

    await otpService.verifyOtp(phone, otp, 'login');

    // Find or create customer
    let customer = await prisma.customer.findUnique({ where: { phone } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          phone,
          name: name || 'Guest',
          consentGiven: consentGiven ?? false,
          consentText: consentGiven ? 'I consent to sharing my phone number with the cafe for order-related communication.' : null,
        },
      });
    } else {
      // Update last seen and name if provided
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          lastSeenAt: new Date(),
          ...(name && { name }),
        },
      });
    }

    // Generate device token (random, stored with session membership)
    const deviceToken = crypto.randomBytes(32).toString('hex');

    // Sign customer token
    const { signCustomerToken } = await import('./token.service.js');
    const token = signCustomerToken({
      sub: customer.id,
      phone: customer.phone,
      name: customer.name,
      deviceToken,
    });

    res.json({
      message: 'Phone verified successfully',
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
        },
        token,
        deviceToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Helper: set auth cookies
function setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('access_token', accessToken, cookieOptions());
  res.cookie('refresh_token', refreshToken, {
    ...cookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth/refresh',
  });

  // CSRF token for cookie-based auth
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie('csrf_token', csrfToken, {
    ...cookieOptions(),
    httpOnly: false, // Client needs to read this
  });
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 15 * 60 * 1000, // 15 minutes (matches access token)
  };
}

