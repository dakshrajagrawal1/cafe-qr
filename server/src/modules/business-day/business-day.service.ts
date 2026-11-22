import prisma from '../../lib/prisma.js';
import { NotFoundError, ValidationError, ConflictError } from '../../lib/errors.js';
import { logAudit } from '../../lib/audit.js';
import type { Request } from 'express';

export interface EndBusinessDayInput {
  countedCashPaise?: number;
  notes?: string;
  forceOverride?: boolean;
  overrideReason?: string;
}

/**
 * Get current open business day and live session/sales indicators.
 */
export async function getCurrentBusinessDay(cafeId: string) {
  const currentDay = await prisma.businessDay.findFirst({
    where: { cafeId, status: 'open' },
    orderBy: { startedAt: 'desc' },
    include: {
      sessions: {
        where: { status: { in: ['open', 'bill_requested'] } },
        include: { table: true },
      },
      orders: {
        select: { id: true, status: true },
      },
      bills: {
        where: { status: 'paid' },
        include: { payments: true },
      },
    },
  });

  if (!currentDay) {
    return {
      isOpen: false,
      businessDay: null,
      stats: null,
    };
  }

  // Calculate live numbers
  let totalSalesPaise = 0;
  let cashCollectedPaise = 0;
  let onlineCollectedPaise = 0;

  for (const bill of currentDay.bills) {
    totalSalesPaise += bill.totalPaise;
    for (const payment of bill.payments) {
      if (payment.status === 'completed') {
        if (payment.mode === 'cash') {
          cashCollectedPaise += payment.amountPaise;
        } else {
          onlineCollectedPaise += payment.amountPaise;
        }
      }
    }
  }

  const openingCash = currentDay.openingCashPaise || 0;
  const expectedCashPaise = openingCash + cashCollectedPaise;

  return {
    isOpen: true,
    businessDay: {
      id: currentDay.id,
      startedAt: currentDay.startedAt.toISOString(),
      startedBy: currentDay.startedBy,
      openingCashPaise: currentDay.openingCashPaise,
      notes: currentDay.notes,
    },
    stats: {
      openSessionsCount: currentDay.sessions.length,
      openSessions: currentDay.sessions.map((s) => ({
        id: s.id,
        tableNumber: s.table.tableNumber,
        status: s.status,
      })),
      totalOrdersCount: currentDay.orders.length,
      totalSalesPaise,
      cashCollectedPaise,
      onlineCollectedPaise,
      expectedCashPaise,
    },
  };
}

/**
 * Start a new business day for the cafe.
 * A business day never auto-closes at midnight, ensuring late-night orders
 * are attributed to the correct trading session.
 */
export async function startBusinessDay(
  cafeId: string,
  openingCashPaise: number = 0,
  userId: string,
  notes?: string,
  req?: Request,
) {
  const existingOpen = await prisma.businessDay.findFirst({
    where: { cafeId, status: 'open' },
  });

  if (existingOpen) {
    throw new ConflictError(
      `A business day is already open (started ${existingOpen.startedAt.toLocaleTimeString()}). Please end it first before starting a new one.`,
    );
  }

  const day = await prisma.businessDay.create({
    data: {
      cafeId,
      status: 'open',
      startedAt: new Date(),
      startedBy: userId,
      openingCashPaise,
      notes,
    },
  });

  await logAudit({
    cafeId,
    userId,
    action: 'business_day.started',
    entityType: 'business_day',
    entityId: day.id,
    newValue: { openingCashPaise, startedAt: day.startedAt },
    req,
  });

  return day;
}

/**
 * End the current business day with cash reconciliation and day-end audit report.
 * Blocked if open sessions or unpaid bills exist, unless explicit override is provided.
 */
export async function endBusinessDay(
  cafeId: string,
  input: EndBusinessDayInput,
  userId: string,
  req?: Request,
) {
  const currentDay = await prisma.businessDay.findFirst({
    where: { cafeId, status: 'open' },
    include: {
      sessions: {
        where: { status: { in: ['open', 'bill_requested'] } },
        include: { table: true },
      },
      orders: {
        include: { items: true },
      },
      bills: {
        include: { payments: true, lines: true },
      },
    },
  });

  if (!currentDay) {
    throw new NotFoundError('No open business day found to end');
  }

  // 1. Check open tables / active sessions rule
  if (currentDay.sessions.length > 0 && !input.forceOverride) {
    const tableNumbers = currentDay.sessions.map((s) => s.table.tableNumber).join(', ');
    throw new ValidationError(
      `Cannot end day: Tables ${tableNumbers} still have active sessions. Please settle or close all tables first, or provide forceOverride with a valid reason.`,
    );
  }

  // 2. Calculate day-end figures
  let totalSalesPaise = 0;
  let taxCollectedPaise = 0;
  let discountGivenPaise = 0;
  let cashCollectedPaise = 0;
  let onlineCollectedPaise = 0;
  let cancelledDishesCount = 0;

  for (const bill of currentDay.bills) {
    if (bill.status === 'paid') {
      totalSalesPaise += bill.totalPaise;
      taxCollectedPaise += bill.taxPaise;
      discountGivenPaise += bill.discountPaise;

      for (const payment of bill.payments) {
        if (payment.status === 'completed') {
          if (payment.mode === 'cash') {
            cashCollectedPaise += payment.amountPaise;
          } else {
            onlineCollectedPaise += payment.amountPaise;
          }
        }
      }
    }
  }

  for (const order of currentDay.orders) {
    for (const item of order.items) {
      if (item.status === 'cancelled') {
        cancelledDishesCount++;
      }
    }
  }

  // 3. Cash Reconciliation
  const openingCashPaise = currentDay.openingCashPaise || 0;
  const expectedCashPaise = openingCashPaise + cashCollectedPaise;
  const countedCashPaise = input.countedCashPaise ?? null;
  const cashDifferencePaise =
    countedCashPaise !== null ? countedCashPaise - expectedCashPaise : null;

  // 4. Close the day
  const updatedDay = await prisma.businessDay.update({
    where: { id: currentDay.id },
    data: {
      status: 'closed',
      endedAt: new Date(),
      endedBy: userId,
      countedCashPaise,
      expectedCashPaise,
      cashDifferencePaise,
      notes: input.notes
        ? input.overrideReason
          ? `${input.notes} [Override: ${input.overrideReason}]`
          : input.notes
        : input.overrideReason
        ? `[Override: ${input.overrideReason}]`
        : null,
    },
  });

  const report = {
    businessDayId: updatedDay.id,
    startedAt: updatedDay.startedAt.toISOString(),
    endedAt: updatedDay.endedAt?.toISOString(),
    totalOrdersCount: currentDay.orders.length,
    totalSalesPaise,
    taxCollectedPaise,
    discountGivenPaise,
    cashCollectedPaise,
    onlineCollectedPaise,
    cancelledDishesCount,
    reconciliation: {
      openingCashPaise,
      expectedCashPaise,
      countedCashPaise,
      cashDifferencePaise,
      isBalanced: cashDifferencePaise === 0,
    },
  };

  await logAudit({
    cafeId,
    userId,
    action: 'business_day.ended',
    entityType: 'business_day',
    entityId: updatedDay.id,
    newValue: report,
    req,
  });

  return { businessDay: updatedDay, report };
}
