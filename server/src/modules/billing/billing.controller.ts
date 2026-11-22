import type { Request, Response } from 'express';
import * as billingService from './billing.service.js';
import { ValidationError } from '../../lib/errors.js';

export async function getPreview(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const sessionId = req.params.sessionId as string;
  const preview = await billingService.getSessionBillPreview(cafeId, sessionId);
  res.json({ data: preview });
}

export async function createBill(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const sessionId = req.params.sessionId as string;
  const { discountPaise, notes } = req.body;

  const bill = await billingService.createOrUpdateBill(
    cafeId,
    sessionId,
    discountPaise || 0,
    notes,
  );

  res.status(201).json({ data: bill });
}

export async function settle(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const billId = req.params.billId as string;
  const { mode, cashReceivedPaise, cashAmountPaise, onlineAmountPaise, gatewayRef, notes } =
    req.body;

  if (!mode || !['cash', 'online', 'upi_counter', 'split'].includes(mode)) {
    throw new ValidationError('Valid payment mode is required (cash, online, upi_counter, split)');
  }

  const bill = await billingService.settleBill(
    cafeId,
    billId,
    {
      mode,
      cashReceivedPaise,
      cashAmountPaise,
      onlineAmountPaise,
      gatewayRef,
      notes,
    },
    req.user!.id,
    req,
  );

  res.json({ data: bill, message: 'Bill settled successfully and table session closed' });
}
