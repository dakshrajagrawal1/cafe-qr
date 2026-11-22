import type { Request, Response, NextFunction } from 'express';
import * as adminService from './admin.service.js';
import * as subService from '../subscription/subscription.service.js';
import { ValidationError } from '../../lib/errors.js';

export async function getOverview(_req: Request, res: Response, next: NextFunction) {
  try {
    const overview = await adminService.getPlatformOverview();
    res.json({ data: overview });
  } catch (error) {
    next(error);
  }
}

export async function listCafes(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const city = req.query.city as string;

    const result = await adminService.listCafes({ page, limit, search, status, city });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCafe(req: Request, res: Response, next: NextFunction) {
  try {
    const cafe = await adminService.getCafeDetail(req.params.id as string);
    res.json({ data: cafe });
  } catch (error) {
    next(error);
  }
}

export async function suspendCafe(req: Request, res: Response, next: NextFunction) {
  try {
    const { reason } = req.body;
    if (!reason) throw new ValidationError('Suspension reason is required');

    const result = await adminService.suspendCafe(
      req.params.id as string,
      reason,
      req.user!.id,
      req,
    );
    res.json({ message: 'Cafe suspended successfully', data: result });
  } catch (error) {
    next(error);
  }
}

export async function reactivateCafe(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.reactivateCafe(
      req.params.id as string,
      req.user!.id,
      req,
    );
    res.json({ message: 'Cafe reactivated successfully', data: result });
  } catch (error) {
    next(error);
  }
}

export async function impersonate(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.impersonateCafeOwner(
      req.params.id as string,
      req.user!.id,
      req,
    );
    res.json({ message: 'Impersonation session created', data: result });
  } catch (error) {
    next(error);
  }
}

// ---- Subscription Actions ----

export async function extendDays(req: Request, res: Response, next: NextFunction) {
  try {
    const { days, reason } = req.body;
    const result = await subService.extendSubscriptionDays(
      req.params.subscriptionId as string,
      days,
      reason,
      req.user!.id,
      req,
    );
    res.json({ message: `Subscription extended by ${days} days`, data: result });
  } catch (error) {
    next(error);
  }
}

export async function changePlan(req: Request, res: Response, next: NextFunction) {
  try {
    const { planId, convertLeftoverDays, customPricePaise, reason } = req.body;
    const result = await subService.changeSubscriptionPlan(
      req.params.subscriptionId as string,
      planId,
      convertLeftoverDays,
      customPricePaise,
      reason,
      req.user!.id,
      req,
    );
    res.json({ message: 'Subscription plan updated', data: result });
  } catch (error) {
    next(error);
  }
}

export async function recordOfflinePayment(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await subService.recordOfflinePayment(
      req.params.subscriptionId as string,
      req.body,
      req.user!.id,
      req,
    );
    res.status(201).json({ message: 'Payment recorded and days extended', data: result });
  } catch (error) {
    next(error);
  }
}

// ---- Plans CRUD ----

export async function listPlans(_req: Request, res: Response, next: NextFunction) {
  try {
    const plans = await subService.listActivePlans();
    res.json({ data: plans });
  } catch (error) {
    next(error);
  }
}

export async function createPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await adminService.createPlan(req.body);
    res.status(201).json({ message: 'Plan created successfully', data: plan });
  } catch (error) {
    next(error);
  }
}

export async function updatePlan(req: Request, res: Response, next: NextFunction) {
  try {
    const plan = await adminService.updatePlan(req.params.id as string, req.body);
    res.json({ message: 'Plan updated successfully', data: plan });
  } catch (error) {
    next(error);
  }
}

export async function archivePlan(req: Request, res: Response, next: NextFunction) {
  try {
    await adminService.archivePlan(req.params.id as string);
    res.json({ message: 'Plan archived' });
  } catch (error) {
    next(error);
  }
}

// ---- Platform Settings ----

export async function getSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await adminService.getPlatformSettings();
    res.json({ data: settings });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await adminService.updatePlatformSettings(req.body, req.user!.id, req);
    res.json({ message: 'Platform settings updated', data: settings });
  } catch (error) {
    next(error);
  }
}

// ---- Audit Logs ----

export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const action = req.query.action as string;
    const cafeId = req.query.cafeId as string;
    const userId = req.query.userId as string;
    const entityType = req.query.entityType as string;

    const result = await adminService.getAuditLogs({ page, limit, action, cafeId, userId, entityType });
    res.json(result);
  } catch (error) {
    next(error);
  }
}
