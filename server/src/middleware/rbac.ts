// ============================================================
// RBAC Middleware — Role & Permission Checking
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';
import prisma from '../lib/prisma.js';

/** Manager permission toggle keys */
export type ManagerPermission =
  | 'can_edit_menu'
  | 'can_manage_tables'
  | 'can_manage_offers'
  | 'can_see_daily_total'
  | 'can_issue_refunds'
  | 'can_manage_staff'
  | 'can_view_reports'
  | 'can_manage_settings';

/**
 * Middleware factory: require one of the specified roles.
 * Must be used AFTER requireAuth.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError());
    }

    next();
  };
}

/**
 * Middleware factory: require a specific manager permission.
 * Owners always pass. Managers need the specific toggle.
 * Must be used AFTER requireAuth + requireRole('owner', 'manager').
 */
export function requirePermission(permission: ManagerPermission) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    // Owner always has all permissions
    if (req.user.role === 'owner' || req.user.role === 'super_admin') {
      return next();
    }

    // For managers, check the specific permission toggle
    if (req.user.role === 'manager') {
      // Load permissions from DB if not already loaded
      if (!req.user.permissions) {
        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { permissions: true },
        });
        req.user.permissions = (user?.permissions as Record<string, boolean>) ?? {};
      }

      if (req.user.permissions[permission] === true) {
        return next();
      }
    }

    next(new ForbiddenError());
  };
}

/**
 * Check if user has a specific permission (non-middleware, for conditional logic).
 */
export function hasPermission(
  user: Express.Request['user'],
  permission: ManagerPermission,
): boolean {
  if (!user) return false;
  if (user.role === 'owner' || user.role === 'super_admin') return true;
  if (user.role === 'manager' && user.permissions) {
    return user.permissions[permission] === true;
  }
  return false;
}

