// ============================================================
// JWT Token Service
// ============================================================

import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import type { UserRole } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  cafeId: string | null;
  name: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
}

export interface CustomerTokenPayload {
  sub: string; // customer id
  phone: string;
  name: string;
  deviceToken: string;
  type: 'customer';
}

/**
 * Sign an access token for staff users.
 */
export function signAccessToken(payload: Omit<AccessTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as any,
  });
}

/**
 * Sign a refresh token.
 */
export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as any,
  });
}

/**
 * Sign a customer token (device-bound, long-lived).
 */
export function signCustomerToken(payload: Omit<CustomerTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'customer' }, env.JWT_ACCESS_SECRET, {
    expiresIn: '90d' as any,
  });
}

/**
 * Verify an access token.
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (decoded.type !== 'access') return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verify a refresh token.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    if (decoded.type !== 'refresh') return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verify a customer token.
 */
export function verifyCustomerToken(token: string): CustomerTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as CustomerTokenPayload;
    if (decoded.type !== 'customer') return null;
    return decoded;
  } catch {
    return null;
  }
}
