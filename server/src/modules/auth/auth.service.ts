// ============================================================
// Auth Service — Registration, Login, Password Management
// ============================================================

import argon2 from 'argon2';
import prisma from '../../lib/prisma.js';
import { signAccessToken, signRefreshToken } from './token.service.js';
import {
  AppError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../lib/errors.js';
import { logAudit } from '../../lib/audit.js';
import type { Request } from 'express';

interface RegisterCafeInput {
  cafeName: string;
  slug: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
  city?: string;
  currency?: string;
}

interface LoginInput {
  email: string;
  password: string;
  twoFactorCode?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Register a new cafe with its owner account.
 * Creates: Cafe (pending_verification) + CafeSettings + Owner User
 */
export async function registerCafe(input: RegisterCafeInput, req?: Request) {
  // Check for duplicate email
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) {
    throw new ConflictError('An account with this email already exists');
  }

  // Check for duplicate slug
  const existingCafe = await prisma.cafe.findUnique({ where: { slug: input.slug } });
  if (existingCafe) {
    throw new ConflictError('This cafe URL is already taken');
  }

  // Hash password
  const passwordHash = await argon2.hash(input.password);

  // Create cafe + settings + owner in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create cafe
    const cafe = await tx.cafe.create({
      data: {
        name: input.cafeName,
        slug: input.slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        ownerName: input.ownerName,
        email: input.email,
        phone: input.phone,
        address: input.address,
        city: input.city,
        currency: input.currency ?? 'INR',
        status: 'pending_verification',
      },
    });

    // Create default settings
    await tx.cafeSettings.create({
      data: { cafeId: cafe.id },
    });

    // Create owner user
    const user = await tx.user.create({
      data: {
        cafeId: cafe.id,
        email: input.email,
        phone: input.phone,
        passwordHash,
        name: input.ownerName,
        role: 'owner',
      },
    });

    return { cafe, user };
  });

  // Audit log
  await logAudit({
    cafeId: result.cafe.id,
    userId: result.user.id,
    action: 'cafe.registered',
    entityType: 'cafe',
    entityId: result.cafe.id,
    newValue: { name: result.cafe.name, slug: result.cafe.slug, email: input.email },
    req,
  });

  // Generate tokens
  const tokens = generateTokens(result.user);

  return {
    cafe: {
      id: result.cafe.id,
      name: result.cafe.name,
      slug: result.cafe.slug,
      status: result.cafe.status,
    },
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
    },
    ...tokens,
  };
}

/**
 * Login a staff user (owner, manager, chef, waiter, super_admin).
 */
export async function loginUser(input: LoginInput, req?: Request): Promise<AuthTokens & { user: any }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { cafe: { select: { id: true, name: true, slug: true, status: true } } },
  });

  if (!user || user.deletedAt) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Check lockout
  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
    throw new UnauthorizedError(`Account locked. Try again in ${minutesLeft} minutes.`);
  }

  // Check active status
  if (!user.isActive) {
    throw new UnauthorizedError('Account is deactivated');
  }

  // Verify password
  const passwordValid = await argon2.verify(user.passwordHash, input.password);
  if (!passwordValid) {
    // Increment failed login count
    const newCount = user.failedLoginCount + 1;
    const lockoutUntil = newCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: newCount,
        lockoutUntil,
      },
    });

    throw new UnauthorizedError('Invalid email or password');
  }

  // Check 2FA if enabled
  if (user.twoFactorEnabled) {
    if (!input.twoFactorCode) {
      throw new ValidationError('Two-factor authentication code required', {
        twoFactor: ['2FA code is required'],
      });
    }
    // TODO: Verify 2FA code with otplib
  }

  // Reset failed login count and update last login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockoutUntil: null,
      lastLoginAt: new Date(),
    },
  });

  // Audit log
  await logAudit({
    cafeId: user.cafeId,
    userId: user.id,
    action: 'auth.login',
    entityType: 'user',
    entityId: user.id,
    req,
  });

  const tokens = generateTokens(user);

  return {
    ...tokens,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      cafeId: user.cafeId,
      cafe: user.cafe,
    },
  };
}

/**
 * Change password for authenticated user.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  req?: Request,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  // Verify current password
  const valid = await argon2.verify(user.passwordHash, currentPassword);
  if (!valid) {
    throw new ValidationError('Current password is incorrect');
  }

  // Hash new password
  const passwordHash = await argon2.hash(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await logAudit({
    cafeId: user.cafeId,
    userId: user.id,
    action: 'auth.password_changed',
    entityType: 'user',
    entityId: user.id,
    req,
  });
}

function generateTokens(user: { id: string; email: string; role: any; cafeId: string | null; name: string }): AuthTokens {
  return {
    accessToken: signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      cafeId: user.cafeId,
      name: user.name,
    }),
    refreshToken: signRefreshToken(user.id),
  };
}

