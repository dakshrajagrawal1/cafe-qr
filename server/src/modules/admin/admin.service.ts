import prisma from '../../lib/prisma.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../lib/errors.js';
import { logAudit } from '../../lib/audit.js';
import { signAccessToken } from '../auth/token.service.js';
import { parsePlanFeatures } from '../subscription/subscription.service.js';
import { generateSecretSync } from '../../lib/id.js';
import { signTableToken } from '../../lib/hmac.js';
import { generateTableQR, generateTableQRSvg } from '../../lib/qr.js';
import { env } from '../../config/env.js';
import type { Request } from 'express';

/**
 * Super Admin Overview: aggregates platform-wide stats.
 */
export async function getPlatformOverview() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalCafes,
    pendingVerification,
    approvedCafes,
    suspendedCafes,
    signupsThisMonth,
    totalOrders,
    paymentsThisMonth,
    activeSubscriptions,
  ] = await Promise.all([
    prisma.cafe.count(),
    prisma.cafe.count({ where: { status: 'pending_verification' } }),
    prisma.cafe.count({ where: { status: 'approved' } }),
    prisma.cafe.count({ where: { status: 'suspended' } }),
    prisma.cafe.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.order.count(),
    prisma.subscriptionPayment.aggregate({
      where: {
        status: 'completed',
        paidAt: { gte: startOfMonth },
      },
      _sum: { amountPaise: true },
    }),
    prisma.subscription.findMany({
      where: {
        status: { in: ['active', 'trial', 'expiring', 'grace'] },
        expiresAt: { gt: now },
      },
      include: { plan: true },
    }),
  ]);

  // Calculate MRR: normalize active plans to monthly price in paise
  let mrrPaise = 0;
  for (const sub of activeSubscriptions) {
    const price = sub.customPricePaise ?? sub.plan.pricePaise;
    if (sub.plan.billingPeriod === 'monthly') {
      mrrPaise += price;
    } else if (sub.plan.billingPeriod === 'quarterly') {
      mrrPaise += Math.round(price / 3);
    } else if (sub.plan.billingPeriod === 'yearly') {
      mrrPaise += Math.round(price / 12);
    }
  }

  // Active / Trial / Expired counts
  let trialCount = 0;
  let activeCount = 0;
  let expiredCount = 0;

  const allSubs = await prisma.subscription.findMany({
    orderBy: { createdAt: 'desc' },
  });

  for (const s of allSubs) {
    if (s.expiresAt < now) {
      expiredCount++;
    } else if (s.trialEndsAt && now <= s.trialEndsAt) {
      trialCount++;
    } else {
      activeCount++;
    }
  }

  return {
    totalCafes,
    pendingVerification,
    approvedCafes,
    suspendedCafes,
    signupsThisMonth,
    totalOrders,
    incomeThisMonthPaise: paymentsThisMonth._sum.amountPaise ?? 0,
    mrrPaise,
    subscriptions: {
      trial: trialCount,
      active: activeCount,
      expired: expiredCount,
    },
  };
}

/**
 * List cafes with search, status/city filters, and pagination.
 */
export async function listCafes(params: {
  search?: string;
  status?: any;
  city?: string;
  page?: number;
  limit?: number;
}) {
  const page = params.page || 1;
  const limit = params.limit || 20;

  const where: any = {};
  if (params.status) where.status = params.status;
  if (params.city) where.city = { contains: params.city };
  if (params.search) {
    where.OR = [
      { name: { contains: params.search } },
      { slug: { contains: params.search } },
      { email: { contains: params.search } },
      { phone: { contains: params.search } },
    ];
  }

  const [cafes, total] = await Promise.all([
    prisma.cafe.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
        _count: {
          select: { tables: true, items: true, orders: true },
        },
      },
    }),
    prisma.cafe.count({ where }),
  ]);

  return {
    data: cafes.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      ownerName: c.ownerName,
      email: c.email,
      phone: c.phone,
      city: c.city,
      status: c.status,
      tablesCount: c._count.tables,
      itemsCount: c._count.items,
      ordersCount: c._count.orders,
      currentPlan: c.subscriptions[0]?.plan?.name ?? 'None',
      expiresAt: c.subscriptions[0]?.expiresAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Detailed view of a single cafe for super admin.
 */
export async function getCafeDetail(cafeId: string) {
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    include: {
      settings: true,
      documents: true,
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        include: {
          plan: { include: { features: true } },
          payments: { orderBy: { createdAt: 'desc' } },
        },
      },
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      },
      _count: {
        select: { tables: true, items: true, orders: true, bills: true },
      },
    },
  });

  if (!cafe) throw new NotFoundError('Cafe');

  return cafe;
}

/**
 * Super Admin: suspend a cafe.
 */
export async function suspendCafe(cafeId: string, reason: string, adminId: string, req?: Request) {
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) throw new NotFoundError('Cafe');

  const updated = await prisma.cafe.update({
    where: { id: cafeId },
    data: { status: 'suspended', rejectionReason: reason },
  });

  await logAudit({
    cafeId,
    userId: adminId,
    action: 'cafe.suspended',
    entityType: 'cafe',
    entityId: cafeId,
    oldValue: { status: cafe.status },
    newValue: { status: 'suspended', reason },
    req,
  });

  return updated;
}

/**
 * Super Admin: reactivate a suspended cafe.
 */
export async function reactivateCafe(cafeId: string, adminId: string, req?: Request) {
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) throw new NotFoundError('Cafe');

  const updated = await prisma.cafe.update({
    where: { id: cafeId },
    data: { status: 'approved', rejectionReason: null },
  });

  await logAudit({
    cafeId,
    userId: adminId,
    action: 'cafe.reactivated',
    entityType: 'cafe',
    entityId: cafeId,
    oldValue: { status: cafe.status },
    newValue: { status: 'approved' },
    req,
  });

  return updated;
}

/**
 * Super Admin: impersonate cafe owner.
 * Issues a token allowing the admin to view the cafe as owner. Always logged in audit log!
 */
export async function impersonateCafeOwner(cafeId: string, adminId: string, req?: Request) {
  const owner = await prisma.user.findFirst({
    where: { cafeId, role: 'owner', deletedAt: null },
  });

  if (!owner) throw new NotFoundError('Cafe owner');

  const token = signAccessToken({
    sub: owner.id,
    email: owner.email,
    role: 'owner',
    cafeId: owner.cafeId,
    name: `[Impersonated] ${owner.name}`,
  });

  await logAudit({
    cafeId,
    userId: adminId,
    action: 'admin.impersonated_owner',
    entityType: 'user',
    entityId: owner.id,
    newValue: { targetUser: owner.email, targetCafeId: cafeId },
    req,
  });

  return {
    accessToken: token,
    owner: {
      id: owner.id,
      name: owner.name,
      email: owner.email,
    },
  };
}

/**
 * Plans Management: CRUD for super admin.
 */
export async function createPlan(data: {
  name: string;
  pricePaise: number;
  billingPeriod: any;
  billingDays?: number | null;
  trialDays?: number;
  isActive?: boolean;
  sortOrder?: number;
  features?: Record<string, string>;
}) {
  return prisma.plan.create({
    data: {
      name: data.name,
      pricePaise: data.pricePaise,
      billingPeriod: data.billingPeriod,
      billingDays: data.billingDays,
      trialDays: data.trialDays ?? 14,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
      features: data.features
        ? {
            create: Object.entries(data.features).map(([key, val]) => ({
              featureKey: key,
              featureValue: String(val),
            })),
          }
        : undefined,
    },
    include: { features: true },
  });
}

export async function updatePlan(planId: string, data: any) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new NotFoundError('Plan');

  // If features provided, delete existing and re-insert
  if (data.features) {
    await prisma.planFeature.deleteMany({ where: { planId } });
    await prisma.planFeature.createMany({
      data: Object.entries(data.features).map(([key, val]) => ({
        planId,
        featureKey: key,
        featureValue: String(val),
      })),
    });
    delete data.features;
  }

  return prisma.plan.update({
    where: { id: planId },
    data,
    include: { features: true },
  });
}

export async function archivePlan(planId: string) {
  return prisma.plan.update({
    where: { id: planId },
    data: { isArchived: true, isActive: false },
  });
}

/**
 * Platform Settings: get & update.
 */
export async function getPlatformSettings() {
  let settings = await prisma.platformSettings.findUnique({ where: { id: 'singleton' } });
  if (!settings) {
    settings = await prisma.platformSettings.create({ data: { id: 'singleton' } });
  }
  return settings;
}

export async function updatePlatformSettings(data: any, adminId: string, req?: Request) {
  const current = await getPlatformSettings();
  const updated = await prisma.platformSettings.update({
    where: { id: 'singleton' },
    data,
  });

  await logAudit({
    userId: adminId,
    action: 'platform_settings.updated',
    entityType: 'platform_settings',
    entityId: 'singleton',
    oldValue: current,
    newValue: updated,
    req,
  });

  return updated;
}

/**
 * Audit Log Viewer.
 */
export async function getAuditLogs(params: {
  action?: string;
  cafeId?: string;
  userId?: string;
  entityType?: string;
  page?: number;
  limit?: number;
}) {
  const page = params.page || 1;
  const limit = params.limit || 50;

  const where: any = {};
  if (params.action) where.action = { contains: params.action };
  if (params.cafeId) where.cafeId = params.cafeId;
  if (params.userId) where.userId = params.userId;
  if (params.entityType) where.entityType = params.entityType;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        cafe: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs.map((l) => ({
      ...l,
      id: l.id.toString(),
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Platform Owner: List all tables with permanent fixed QR details for a specific cafe.
 */
export async function getCafeTablesWithFixedQR(cafeId: string) {
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    select: { id: true, name: true, slug: true, city: true, status: true, logoUrl: true },
  });
  if (!cafe) throw new NotFoundError('Cafe');

  const tables = await prisma.table.findMany({
    where: { cafeId, deletedAt: null },
    orderBy: { sortOrder: 'asc' },
  });

  const customerBase = env.CUSTOMER_APP_URL || 'http://localhost:5173';

  const enrichedTables = await Promise.all(
    tables.map(async (table) => {
      const token = signTableToken({ cafeId: cafe.id, tableId: table.id });
      const qrUrl = `${customerBase}/c/${cafe.slug}?t=${token}`;
      const qrDataUrl = await generateTableQR({
        cafeSlug: cafe.slug,
        cafeId: cafe.id,
        tableId: table.id,
        baseUrl: customerBase,
      });
      const qrSvg = await generateTableQRSvg({
        cafeSlug: cafe.slug,
        cafeId: cafe.id,
        tableId: table.id,
        baseUrl: customerBase,
      });

      return {
        id: table.id,
        tableNumber: table.tableNumber,
        label: table.label,
        capacity: table.capacity,
        isActive: table.isActive,
        createdAt: table.createdAt,
        qrToken: token,
        qrUrl,
        qrDataUrl,
        qrSvg,
        isFixed: true,
      };
    }),
  );

  return {
    cafe,
    tables: enrichedTables,
  };
}

/**
 * Platform Owner: Generate or retrieve a fixed Table QR for a particular cafe and table number.
 * If the table exists, it returns the existing permanently fixed QR code without changing anything.
 * If it does not exist, it creates it and signs its permanent QR token.
 */
export async function generateFixedTableQR(
  cafeId: string,
  data: { tableNumber: string; label?: string; capacity?: number },
  adminId: string,
  req?: Request,
) {
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    select: { id: true, name: true, slug: true },
  });
  if (!cafe) throw new NotFoundError('Cafe');

  const cleanTableNumber = data.tableNumber.trim();
  if (!cleanTableNumber) throw new ValidationError('Table number is required');

  // Check if table already exists for this cafe
  let table = await prisma.table.findFirst({
    where: { cafeId, tableNumber: cleanTableNumber, deletedAt: null },
  });

  let isExisting = false;

  if (table) {
    isExisting = true;
  } else {
    const qrSecret = generateSecretSync(32);
    table = await prisma.table.create({
      data: {
        cafeId,
        tableNumber: cleanTableNumber,
        label: data.label?.trim() || null,
        capacity: data.capacity ? Number(data.capacity) : 4,
        qrSecret,
      },
    });

    await logAudit({
      userId: adminId,
      cafeId,
      action: 'table.fixed_qr_generated',
      entityType: 'table',
      entityId: table.id,
      newValue: { tableNumber: cleanTableNumber, label: data.label, capacity: data.capacity },
      req,
    });
  }

  const customerBase = env.CUSTOMER_APP_URL || 'http://localhost:5173';
  const token = signTableToken({ cafeId: cafe.id, tableId: table.id });
  const qrUrl = `${customerBase}/c/${cafe.slug}?t=${token}`;

  const qrDataUrl = await generateTableQR({
    cafeSlug: cafe.slug,
    cafeId: cafe.id,
    tableId: table.id,
    baseUrl: customerBase,
  });

  const qrSvg = await generateTableQRSvg({
    cafeSlug: cafe.slug,
    cafeId: cafe.id,
    tableId: table.id,
    baseUrl: customerBase,
  });

  return {
    cafe,
    table: {
      id: table.id,
      tableNumber: table.tableNumber,
      label: table.label,
      capacity: table.capacity,
      isActive: table.isActive,
      createdAt: table.createdAt,
    },
    qrToken: token,
    qrUrl,
    qrDataUrl,
    qrSvg,
    isExisting,
    isFixed: true,
    message: isExisting
      ? `Table ${cleanTableNumber} already exists. Retrieved permanent fixed QR.`
      : `Table ${cleanTableNumber} created and fixed permanent QR generated.`,
  };
}

/**
 * Platform Owner: Bulk generate fixed QRs for multiple tables for a cafe at once.
 */
export async function bulkGenerateFixedTableQRs(
  cafeId: string,
  data: { prefix?: string; startNumber: number; endNumber: number; capacity?: number },
  adminId: string,
  req?: Request,
) {
  const { startNumber, endNumber, prefix = 'Table ', capacity = 4 } = data;
  if (!startNumber || !endNumber || startNumber > endNumber) {
    throw new ValidationError('Valid startNumber and endNumber are required');
  }

  if (endNumber - startNumber > 100) {
    throw new ValidationError('Cannot generate more than 100 tables in one batch');
  }

  const results = [];
  for (let i = startNumber; i <= endNumber; i++) {
    const tableNum = `${prefix}${i < 10 ? '0' + i : i}`.trim();
    const res = await generateFixedTableQR(cafeId, { tableNumber: tableNum, capacity }, adminId, req);
    results.push(res);
  }

  return results;
}
