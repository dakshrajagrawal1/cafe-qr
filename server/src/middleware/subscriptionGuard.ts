import type { Request, Response, NextFunction } from 'express';
import { getCafeSubscriptionDetails } from '../modules/subscription/subscription.service.js';
import { SubscriptionError, ForbiddenError, UnauthorizedError } from '../lib/errors.js';
import prisma from '../lib/prisma.js';

/**
 * Middleware: Enforces that new customer orders can only be placed
 * if the cafe subscription is currently active, in trial, or within grace period.
 *
 * If the grace period has ended:
 * - Block new orders
 * - Return 402 with code 'ORDERING_UNAVAILABLE'
 * - Customer can still view the menu
 */
export async function requireActiveSubscriptionForOrdering(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const cafeId = req.cafeId || (req.body?.cafeId as string);

  if (!cafeId) {
    return next(new ForbiddenError('Cafe context missing'));
  }

  try {
    const subDetails = await getCafeSubscriptionDetails(cafeId);

    if (!subDetails.isOrderingAllowed) {
      return next(
        new SubscriptionError(
          subDetails.effectiveStatus === 'expired'
            ? 'Ordering is currently unavailable as the cafe subscription has expired.'
            : 'Ordering is currently disabled for this cafe.',
        ),
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware factory: Ensures the cafe has not exceeded a numeric limit
 * in their plan (e.g. max_tables, max_menu_items, max_staff).
 */
export function enforcePlanLimit(limitKey: 'max_tables' | 'max_menu_items' | 'max_staff') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.cafeId) {
      return next(new UnauthorizedError('Cafe context required'));
    }

    try {
      const sub = await getCafeSubscriptionDetails(req.cafeId);
      const limit = sub.features[limitKey] ?? 10;

      let currentCount = 0;
      if (limitKey === 'max_tables') {
        currentCount = await prisma.table.count({
          where: { cafeId: req.cafeId, deletedAt: null },
        });
      } else if (limitKey === 'max_menu_items') {
        currentCount = await prisma.item.count({
          where: { cafeId: req.cafeId, deletedAt: null },
        });
      } else if (limitKey === 'max_staff') {
        currentCount = await prisma.user.count({
          where: { cafeId: req.cafeId, deletedAt: null, role: { in: ['manager', 'chef', 'waiter'] } },
        });
      }

      if (currentCount >= limit) {
        return next(
          new ForbiddenError(
            `Plan limit reached for ${limitKey.replace('_', ' ')} (Max: ${limit}). Please upgrade your plan.`,
          ),
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware factory: Ensures a feature toggle is enabled in the cafe's plan.
 */
export function requirePlanFeature(featureKey: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.cafeId) {
      return next(new UnauthorizedError('Cafe context required'));
    }

    try {
      const sub = await getCafeSubscriptionDetails(req.cafeId);
      const isEnabled = sub.features[featureKey] === true;

      if (!isEnabled) {
        return next(
          new ForbiddenError(
            `Feature '${featureKey}' is not enabled on your current plan. Please upgrade to access it.`,
          ),
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
