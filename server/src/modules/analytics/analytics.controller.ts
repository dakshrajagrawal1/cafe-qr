import type { Request, Response } from 'express';
import * as analyticsService from './analytics.service.js';

export async function getOverview(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const range = (req.query.range as any) || 'today';
  const data = await analyticsService.getCafeAnalytics(cafeId, range);
  res.json({ data });
}
