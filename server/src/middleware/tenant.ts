// ============================================================
// Tenant Isolation Middleware
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';

/**
 * Middleware: Inject cafeId from the authenticated user's JWT.
 * NEVER trusts cafeId from request params, body, or query.
 * Must be used AFTER requireAuth.
 *
 * For super_admin: allows cafeId from params (for admin operations).
 * For cafe staff: always uses the cafeId from the JWT.
 */
export function injectCafeId(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError());
  }

  if (req.user.role === 'super_admin') {
    // Super admin can operate on any cafe via URL params
    // But the cafeId must be explicitly provided in the route
    req.cafeId = (req.params.cafeId as string) || undefined;
  } else {
    // All cafe staff get their cafeId from the JWT — NEVER from request
    if (!req.user.cafeId) {
      return next(new ForbiddenError('User is not associated with a cafe'));
    }
    req.cafeId = req.user.cafeId;
  }

  next();
}

/**
 * Middleware: Require that cafeId is set (after injectCafeId).
 * Use on routes that need a cafe context.
 */
export function requireCafeContext(req: Request, _res: Response, next: NextFunction): void {
  if (!req.cafeId) {
    return next(new ForbiddenError('Cafe context required'));
  }
  next();
}

