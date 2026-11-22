import type { Request, Response } from 'express';
import * as kitchenService from './kitchen.service.js';
import { ValidationError } from '../../lib/errors.js';

export async function getTickets(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const tickets = await kitchenService.listKitchenTickets(cafeId);
  res.json({ data: tickets });
}

export async function updateStatus(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const ticketId = req.params.ticketId as string;
  const { status } = req.body;

  if (!status || !['preparing', 'ready'].includes(status)) {
    throw new ValidationError('Status must be either preparing or ready');
  }

  const updated = await kitchenService.updateTicketStatus(
    cafeId,
    ticketId,
    status,
    req.user!.id,
    req,
  );

  res.json({ data: updated });
}

export async function undoStatus(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const ticketId = req.params.ticketId as string;
  const { reason } = req.body;

  const updated = await kitchenService.undoTicketStatus(
    cafeId,
    ticketId,
    req.user!.id,
    reason || 'Reverted by user',
    req,
  );

  res.json({ data: updated, message: 'Dish status reverted successfully' });
}
