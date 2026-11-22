import type { Request, Response, NextFunction } from 'express';
import * as subService from './subscription.service.js';

/**
 * GET /api/subscription/current
 * Owner only (Manager gets 403 via RBAC).
 */
export async function getCurrent(req: Request, res: Response, next: NextFunction) {
  try {
    const details = await subService.getCafeSubscriptionDetails(req.cafeId!);
    res.json({ data: details });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/subscription/plans
 * List all active plans for upgrade comparison.
 */
export async function getPlans(_req: Request, res: Response, next: NextFunction) {
  try {
    const plans = await subService.listActivePlans();
    res.json({ data: plans });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/subscription/payments
 * Payment history for cafe subscription.
 */
export async function getPayments(req: Request, res: Response, next: NextFunction) {
  try {
    const payments = await subService.listCafePayments(req.cafeId!);
    res.json({ data: payments });
  } catch (error) {
    next(error);
  }
}
