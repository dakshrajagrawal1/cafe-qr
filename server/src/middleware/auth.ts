// ============================================================
// Auth Middleware — JWT Verification
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifyCustomerToken } from '../modules/auth/token.service.js';
import { UnauthorizedError } from '../lib/errors.js';
import prisma from '../lib/prisma.js';

/**
 * Middleware: Require a valid staff JWT access token.
 * Sets req.user with { id, email, role, cafeId, name, permissions }.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    return next(new UnauthorizedError('No authentication token provided'));
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return next(new UnauthorizedError('Invalid or expired token'));
  }

  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    cafeId: payload.cafeId,
    name: payload.name,
    permissions: null, // Loaded by RBAC middleware if needed
  };

  next();
}

/**
 * Middleware: Require a valid customer token.
 * Sets req.customer with { id, phone, name, deviceToken }.
 */
export function requireCustomerAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    return next(new UnauthorizedError('No authentication token provided'));
  }

  const payload = verifyCustomerToken(token);
  if (!payload) {
    return next(new UnauthorizedError('Invalid or expired token'));
  }

  req.customer = {
    id: payload.sub,
    phone: payload.phone,
    name: payload.name,
    deviceToken: payload.deviceToken,
  };

  next();
}

/**
 * Middleware: Optional auth — sets req.user if token is present and valid,
 * but doesn't block if missing.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) return next();

  const payload = verifyAccessToken(token);
  if (payload) {
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      cafeId: payload.cafeId,
      name: payload.name,
      permissions: null,
    };
  }

  next();
}

/**
 * Extract Bearer token from Authorization header or cookie.
 */
function extractBearerToken(req: Request): string | null {
  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Fallback to cookie
  const cookieToken = req.cookies?.access_token;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

