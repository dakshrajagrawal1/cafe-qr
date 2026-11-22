import type { Request, Response } from 'express';
import * as waiterService from './waiter.service.js';
import { ValidationError } from '../../lib/errors.js';

export async function getTables(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const tables = await waiterService.listWaiterTables(cafeId);
  res.json({ data: tables });
}

export async function getTableDishes(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const tableId = req.params.tableId as string;
  const result = await waiterService.getTableDishes(cafeId, tableId);
  res.json({ data: result });
}

export async function markServed(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const dishId = req.params.dishId as string;
  const updated = await waiterService.markDishServed(cafeId, dishId, req.user!.id, req);
  res.json({ data: updated });
}

export async function undoServed(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const dishId = req.params.dishId as string;
  const { reason } = req.body;
  const updated = await waiterService.undoDishServed(
    cafeId,
    dishId,
    req.user!.id,
    reason || 'Reverted by waiter',
    req,
  );
  res.json({ data: updated });
}

export async function getCalls(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const calls = await waiterService.listWaiterCalls(cafeId);
  res.json({ data: calls });
}

export async function acknowledgeCall(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const callId = req.params.callId as string;
  const updated = await waiterService.acknowledgeWaiterCall(cafeId, callId, req.user!.id);
  res.json({ data: updated });
}

export async function resolveCall(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const callId = req.params.callId as string;
  const updated = await waiterService.resolveWaiterCall(cafeId, callId, req.user!.id);
  res.json({ data: updated });
}

export async function createOrder(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const { tableId, items } = req.body;

  if (!tableId || !items || !Array.isArray(items)) {
    throw new ValidationError('tableId and items array are required');
  }

  const order = await waiterService.waiterCreateOrder(
    cafeId,
    tableId as string,
    items,
    req.user!.id,
    req.user!.name || 'Waiter',
    req,
  );

  res.status(201).json({ data: order });
}
