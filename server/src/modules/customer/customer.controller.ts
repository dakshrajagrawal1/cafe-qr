import type { Request, Response, NextFunction } from 'express';
import * as customerService from './customer.service.js';
import { ValidationError } from '../../lib/errors.js';

export async function initSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { tableToken, deviceToken, pin, forceIndependent } = req.body;
    if (!tableToken || !deviceToken) {
      throw new ValidationError('tableToken and deviceToken are required');
    }

    const result = await customerService.initCustomerSession({
      tableToken,
      customerId: req.customer!.id,
      deviceToken,
      pin,
      forceIndependent: Boolean(forceIndependent),
    });

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function getCart(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    if (!sessionId) throw new ValidationError('x-session-id header is required');

    const cart = await customerService.getSessionCart(sessionId);
    res.json({ data: cart });
  } catch (error) {
    next(error);
  }
}

export async function addCartItem(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    const memberId = req.headers['x-member-id'] as string;
    if (!sessionId || !memberId) throw new ValidationError('x-session-id and x-member-id headers required');

    const item = await customerService.addCartItem(sessionId, memberId, req.body);
    res.status(201).json({ message: 'Item added to cart', data: item });
  } catch (error) {
    next(error);
  }
}

export async function updateCartItem(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    const cartItemId = req.params.cartItemId as string;
    if (!sessionId) throw new ValidationError('x-session-id header required');

    const result = await customerService.updateCartItem(cartItemId, sessionId, req.body);
    res.json({ message: 'Cart item updated', data: result });
  } catch (error) {
    next(error);
  }
}

export async function removeCartItem(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    const cartItemId = req.params.cartItemId as string;
    if (!sessionId) throw new ValidationError('x-session-id header required');

    await customerService.removeCartItem(cartItemId, sessionId);
    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    next(error);
  }
}

export async function placeOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    if (!sessionId) throw new ValidationError('x-session-id header required');

    const order = await customerService.placeSessionOrder(
      sessionId,
      req.customer!.id,
      req.body,
    );

    res.status(201).json({
      message: 'Order placed successfully. Waiting for cafe to confirm.',
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    if (!sessionId) throw new ValidationError('x-session-id header required');

    const orders = await customerService.getSessionOrders(sessionId);
    res.json({ data: orders });
  } catch (error) {
    next(error);
  }
}

export async function callWaiter(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    const memberId = req.headers['x-member-id'] as string;
    if (!sessionId || !memberId) throw new ValidationError('x-session-id and x-member-id headers required');

    const call = await customerService.createWaiterCall(sessionId, memberId, req.body);
    res.status(201).json({ message: 'Waiter called successfully', data: call });
  } catch (error) {
    next(error);
  }
}

export async function requestBill(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    const memberId = req.headers['x-member-id'] as string;
    if (!sessionId) throw new ValidationError('x-session-id header required');

    const result = await customerService.customerRequestBill(sessionId, memberId || 'customer');
    res.json({ message: 'Bill requested. Staff has been notified.', data: result });
  } catch (error) {
    next(error);
  }
}
