import type { Request, Response, NextFunction } from 'express';
import * as orderService from './orders.service.js';
import { ValidationError } from '../../lib/errors.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const status = req.query.status as string;
    const sessionId = req.query.sessionId as string;
    const todayOnly = req.query.today === 'true';

    const result = await orderService.listCafeOrders(req.cafeId!, {
      page,
      limit,
      status,
      sessionId,
      todayOnly,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = req.params.orderId as string;
    const { itemDecisions } = req.body;

    const result = await orderService.approveOrder(
      req.cafeId!,
      orderId,
      req.user!.id,
      itemDecisions,
      req,
    );

    res.json({ message: 'Order approved successfully', data: result });
  } catch (error) {
    next(error);
  }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = req.params.orderId as string;
    const { reason } = req.body;

    if (!reason) {
      throw new ValidationError('Rejection reason is required');
    }

    const result = await orderService.rejectOrder(
      req.cafeId!,
      orderId,
      reason,
      req.user!.id,
      req,
    );

    res.json({ message: 'Order rejected', data: result });
  } catch (error) {
    next(error);
  }
}

export async function addDishToSession(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.params.sessionId as string;
    const result = await orderService.addForgottenDishToSession(
      req.cafeId!,
      sessionId,
      req.body,
      req.user!.id,
      req,
    );

    res.status(201).json({ message: 'Dish added to session and sent to kitchen', data: result });
  } catch (error) {
    next(error);
  }
}
