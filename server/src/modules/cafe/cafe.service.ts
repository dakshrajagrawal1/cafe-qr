import prisma from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError } from '../../lib/errors.js';
import { logAudit } from '../../lib/audit.js';
import type { Request } from 'express';

export async function getCafeProfile(cafeId: string) {
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    include: {
      settings: true,
      subscriptions: {
        where: { status: { in: ['trial', 'active', 'grace'] } },
        include: { plan: true },
        take: 1,
      },
    },
  });

  if (!cafe) {
    throw new NotFoundError('Cafe');
  }

  return cafe;
}

export async function updateCafeProfile(
  cafeId: string,
  data: {
    name?: string;
    address?: string | null;
    city?: string | null;
    phone?: string;
    fssaiNumber?: string | null;
    logoUrl?: string | null;
    coverUrl?: string | null;
  },
  req?: Request,
) {
  const current = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!current) throw new NotFoundError('Cafe');

  const updated = await prisma.cafe.update({
    where: { id: cafeId },
    data,
  });

  await logAudit({
    cafeId,
    userId: req?.user?.id,
    action: 'cafe.profile_updated',
    entityType: 'cafe',
    entityId: cafeId,
    oldValue: current,
    newValue: updated,
    req,
  });

  return updated;
}

export async function getCafeSettings(cafeId: string) {
  const settings = await prisma.cafeSettings.findUnique({
    where: { cafeId },
  });

  if (!settings) {
    return prisma.cafeSettings.create({
      data: { cafeId },
    });
  }

  return settings;
}

export async function updateCafeSettings(cafeId: string, data: any, req?: Request) {
  const current = await getCafeSettings(cafeId);

  const updated = await prisma.cafeSettings.update({
    where: { cafeId },
    data,
  });

  await logAudit({
    cafeId,
    userId: req?.user?.id,
    action: 'cafe.settings_updated',
    entityType: 'cafe_settings',
    entityId: updated.id,
    oldValue: current,
    newValue: updated,
    req,
  });

  return updated;
}

export async function uploadCafeDocument(
  cafeId: string,
  file: Express.Multer.File,
  metadata: {
    type: any;
    documentNumber?: string;
    expiryDate?: Date | null;
  },
  req?: Request,
) {
  const doc = await prisma.cafeDocument.create({
    data: {
      cafeId,
      type: metadata.type,
      documentNumber: metadata.documentNumber,
      expiryDate: metadata.expiryDate,
      filePath: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      status: 'pending',
    },
  });

  await logAudit({
    cafeId,
    userId: req?.user?.id,
    action: 'cafe.document_uploaded',
    entityType: 'cafe_document',
    entityId: doc.id,
    newValue: { type: doc.type, originalName: doc.originalName },
    req,
  });

  return doc;
}

export async function listCafeDocuments(cafeId: string) {
  return prisma.cafeDocument.findMany({
    where: { cafeId },
    orderBy: { createdAt: 'desc' },
  });
}

