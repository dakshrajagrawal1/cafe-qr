import type { Request, Response } from 'express';
import * as offersService from './offers.service.js';

export async function list(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const promoOnly = req.query.promotions === 'true';
  const offers = await offersService.listCafeOffers(cafeId, promoOnly);
  res.json({ data: offers });
}

export async function create(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const offer = await offersService.createCafeOffer(cafeId, req.body, req.user!.id, req);
  res.status(201).json({ data: offer });
}

export async function update(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const offerId = req.params.offerId as string;
  const updated = await offersService.updateCafeOffer(cafeId, offerId, req.body, req.user!.id, req);
  res.json({ data: updated });
}

export async function remove(req: Request, res: Response) {
  const cafeId = req.cafeId!;
  const offerId = req.params.offerId as string;
  const result = await offersService.deleteCafeOffer(cafeId, offerId, req.user!.id, req);
  res.json({ data: result, message: 'Offer deleted successfully' });
}
