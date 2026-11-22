import prisma from '../../lib/prisma.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { logAudit } from '../../lib/audit.js';
import { publishEvent } from '../../lib/realtime.js';
import type { Request } from 'express';

export async function listVerificationQueue(params: { page?: number; limit?: number }) {
  const page = params.page || 1;
  const limit = params.limit || 20;

  const [cafes, total] = await Promise.all([
    prisma.cafe.findMany({
      where: { status: 'pending_verification' },
      include: {
        documents: true,
        _count: { select: { tables: true, items: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.cafe.count({ where: { status: 'pending_verification' } }),
  ]);

  return {
    data: cafes,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getCafeForVerification(cafeId: string) {
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    include: {
      documents: true,
      users: {
        where: { role: 'owner' },
        select: { id: true, name: true, email: true, phone: true, createdAt: true },
      },
      settings: true,
    },
  });

  if (!cafe) throw new NotFoundError('Cafe');
  return cafe;
}

export async function approveCafe(cafeId: string, superAdminId: string, req?: Request) {
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    include: { documents: true },
  });

  if (!cafe) throw new NotFoundError('Cafe');
  if (cafe.status === 'approved') {
    throw new ValidationError('Cafe is already approved');
  }

  // Find default or lowest trial plan
  const defaultPlan = await prisma.plan.findFirst({
    where: { isActive: true, isArchived: false },
    orderBy: { sortOrder: 'asc' },
  });

  const trialDays = defaultPlan?.trialDays || 14;
  const now = new Date();
  const trialEnds = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update cafe status
    const updatedCafe = await tx.cafe.update({
      where: { id: cafeId },
      data: {
        status: 'approved',
        rejectionReason: null,
      },
    });

    // 2. Mark documents approved
    await tx.cafeDocument.updateMany({
      where: { cafeId, status: 'pending' },
      data: {
        status: 'approved',
        reviewedBy: superAdminId,
        reviewedAt: now,
      },
    });

    // 3. Create initial trial subscription if not already exists
    let sub = await tx.subscription.findFirst({ where: { cafeId } });
    if (!sub && defaultPlan) {
      sub = await tx.subscription.create({
        data: {
          cafeId,
          planId: defaultPlan.id,
          status: 'trial',
          startsAt: now,
          expiresAt: trialEnds,
          trialEndsAt: trialEnds,
        },
      });
    }

    return { updatedCafe, sub };
  });

  await logAudit({
    cafeId,
    userId: superAdminId,
    action: 'cafe.approved',
    entityType: 'cafe',
    entityId: cafeId,
    oldValue: { status: cafe.status },
    newValue: { status: 'approved' },
    req,
  });

  await publishEvent(`cafe:${cafeId}:subscription`, 'subscription.renewed', {
    status: 'trial',
    trialEnds: trialEnds.toISOString(),
  });

  return result;
}

export async function rejectCafe(
  cafeId: string,
  reason: string,
  superAdminId: string,
  req?: Request,
) {
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) throw new NotFoundError('Cafe');

  const updated = await prisma.$transaction(async (tx) => {
    const updatedCafe = await tx.cafe.update({
      where: { id: cafeId },
      data: {
        status: 'rejected',
        rejectionReason: reason,
      },
    });

    await tx.cafeDocument.updateMany({
      where: { cafeId, status: 'pending' },
      data: {
        status: 'rejected',
        rejectionReason: reason,
        reviewedBy: superAdminId,
        reviewedAt: new Date(),
      },
    });

    return updatedCafe;
  });

  await logAudit({
    cafeId,
    userId: superAdminId,
    action: 'cafe.rejected',
    entityType: 'cafe',
    entityId: cafeId,
    oldValue: { status: cafe.status },
    newValue: { status: 'rejected', reason },
    req,
  });

  return updated;
}

