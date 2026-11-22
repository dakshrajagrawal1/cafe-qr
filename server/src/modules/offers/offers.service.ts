import prisma from '../../lib/prisma.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { logAudit } from '../../lib/audit.js';
import type { Request } from 'express';

export interface CreateOfferInput {
  title: string;
  description?: string;
  imageUrl?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderPaise?: number;
  applicableItems?: string[];
  applicableCategories?: string[];
  validFrom?: string;
  validUntil?: string;
  isPromotion?: boolean;
  isActive?: boolean;
}

export async function listCafeOffers(cafeId: string, promotionsOnly: boolean = false) {
  const where: any = { cafeId };
  if (promotionsOnly) {
    where.isActive = true;
    where.isPromotion = true;
  }

  return prisma.offer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export async function createCafeOffer(
  cafeId: string,
  input: CreateOfferInput,
  userId: string,
  req?: Request,
) {
  if (!input.title) {
    throw new ValidationError('Offer title is required');
  }

  const offer = await prisma.offer.create({
    data: {
      cafeId,
      title: input.title,
      description: input.description,
      imageUrl: input.imageUrl,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minOrderPaise: input.minOrderPaise || 0,
      applicableItems: input.applicableItems || undefined,
      applicableCategories: input.applicableCategories || undefined,
      validFrom: input.validFrom ? new Date(input.validFrom) : new Date(),
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
      isPromotion: input.isPromotion ?? false,
      isActive: input.isActive ?? true,
    },
  });

  await logAudit({
    cafeId,
    userId,
    action: 'offer.created',
    entityType: 'offer',
    entityId: offer.id,
    newValue: offer,
    req,
  });

  return offer;
}

export async function updateCafeOffer(
  cafeId: string,
  offerId: string,
  input: Partial<CreateOfferInput>,
  userId: string,
  req?: Request,
) {
  const existing = await prisma.offer.findFirst({
    where: { id: offerId, cafeId },
  });

  if (!existing) throw new NotFoundError('Offer');

  const updated = await prisma.offer.update({
    where: { id: offerId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
      ...(input.discountType !== undefined && { discountType: input.discountType }),
      ...(input.discountValue !== undefined && { discountValue: input.discountValue }),
      ...(input.minOrderPaise !== undefined && { minOrderPaise: input.minOrderPaise }),
      ...(input.validFrom && { validFrom: new Date(input.validFrom) }),
      ...(input.validUntil !== undefined && {
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
      }),
      ...(input.isPromotion !== undefined && { isPromotion: input.isPromotion }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });

  await logAudit({
    cafeId,
    userId,
    action: 'offer.updated',
    entityType: 'offer',
    entityId: offerId,
    oldValue: existing,
    newValue: updated,
    req,
  });

  return updated;
}

export async function deleteCafeOffer(
  cafeId: string,
  offerId: string,
  userId: string,
  req?: Request,
) {
  const existing = await prisma.offer.findFirst({
    where: { id: offerId, cafeId },
  });

  if (!existing) throw new NotFoundError('Offer');

  await prisma.offer.delete({ where: { id: offerId } });

  await logAudit({
    cafeId,
    userId,
    action: 'offer.deleted',
    entityType: 'offer',
    entityId: offerId,
    oldValue: existing,
    req,
  });

  return { success: true };
}
