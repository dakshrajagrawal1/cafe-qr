import type { Request, Response } from 'express';
import * as dayService from './business-day.service.js';

export async function getCurrent(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const current = await dayService.getCurrentBusinessDay(cafeId);
  res.json({ data: current });
}

export async function startDay(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const { openingCashPaise, notes } = req.body;

  const day = await dayService.startBusinessDay(
    cafeId,
    openingCashPaise || 0,
    req.user!.id,
    notes,
    req,
  );

  res.status(201).json({ data: day, message: 'Business day started successfully' });
}

export async function endDay(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const { countedCashPaise, notes, forceOverride, overrideReason } = req.body;

  const result = await dayService.endBusinessDay(
    cafeId,
    {
      countedCashPaise,
      notes,
      forceOverride,
      overrideReason,
    },
    req.user!.id,
    req,
  );

  res.json({
    data: result.businessDay,
    report: result.report,
    message: 'Business day ended and day-end audit report generated',
  });
}
