import prisma from '../../lib/prisma.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../lib/errors.js';
import { publishEvent } from '../../lib/realtime.js';
import { logAudit } from '../../lib/audit.js';
import { generatePin } from '../../lib/id.js';
import type { Request } from 'express';

const SESSION_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16', '#e11d48',
];

/**
 * List all tables for the waiter screen with live status,
 * ready-to-serve dish counts, and active calls.
 */
export async function listWaiterTables(cafeId: string) {
  const tables = await prisma.table.findMany({
    where: { cafeId, deletedAt: null },
    orderBy: { sortOrder: 'asc' },
    include: {
      sessions: {
        where: { status: { in: ['open', 'bill_requested'] } },
        take: 1,
        include: {
          orders: {
            where: { status: 'approved' },
            include: {
              items: {
                where: { status: { in: ['confirmed', 'preparing', 'ready', 'served'] } },
              },
            },
          },
          waiterCalls: {
            where: { status: { in: ['active', 'acknowledged'] } },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });

  return tables.map((t) => {
    const session = t.sessions[0] || null;
    let readyDishesCount = 0;
    let totalDishesCount = 0;
    let activeCallsCount = 0;
    let latestCall = null;

    if (session) {
      for (const order of session.orders) {
        for (const item of order.items) {
          totalDishesCount++;
          if (item.status === 'ready') {
            readyDishesCount++;
          }
        }
      }
      activeCallsCount = session.waiterCalls.length;
      latestCall = session.waiterCalls[0] || null;
    }

    return {
      id: t.id,
      tableNumber: t.tableNumber,
      label: t.label,
      capacity: t.capacity,
      isOccupied: !!session,
      sessionId: session?.id || null,
      sessionColor: session?.color || null,
      sessionStatus: session?.status || null,
      readyDishesCount,
      totalDishesCount,
      activeCallsCount,
      latestCall: latestCall
        ? {
            id: latestCall.id,
            type: latestCall.type,
            status: latestCall.status,
            message: latestCall.message,
            createdAt: latestCall.createdAt.toISOString(),
          }
        : null,
    };
  });
}

/**
 * Get all ordered dishes for a specific table's active session.
 */
export async function getTableDishes(cafeId: string, tableId: string) {
  const table = await prisma.table.findFirst({
    where: { id: tableId, cafeId, deletedAt: null },
    include: {
      sessions: {
        where: { status: { in: ['open', 'bill_requested'] } },
        take: 1,
        include: {
          orders: {
            include: {
              items: {
                orderBy: { createdAt: 'asc' },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  });

  if (!table) throw new NotFoundError('Table');
  const session = table.sessions[0];
  if (!session) {
    return {
      table: { id: table.id, tableNumber: table.tableNumber, label: table.label },
      session: null,
      dishes: [],
    };
  }

  const dishes = session.orders.flatMap((order) =>
    order.items.map((item) => ({
      id: item.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      itemName: item.itemNameSnapshot,
      itemPricePaise: item.itemPriceSnapshot,
      quantity: item.quantity,
      isVeg: item.isVegSnapshot,
      selectedOptions: item.selectedOptionsSnapshot,
      specialInstructions: item.specialInstructions,
      status: item.status,
      statusChangedAt: item.statusChangedAt?.toISOString() || null,
      createdAt: item.createdAt.toISOString(),
      servedBy: item.servedBy,
    })),
  );

  return {
    table: { id: table.id, tableNumber: table.tableNumber, label: table.label },
    session: {
      id: session.id,
      color: session.color,
      status: session.status,
      startedAt: session.startedAt.toISOString(),
    },
    dishes,
  };
}

/**
 * Waiter action: Mark dish as served.
 * Transitions dish from 'ready' (or 'confirmed'/'preparing') to 'served'.
 */
export async function markDishServed(
  cafeId: string,
  dishId: string,
  waiterId: string,
  req?: Request,
) {
  const item = await prisma.orderItem.findFirst({
    where: {
      id: dishId,
      order: { cafeId },
    },
    include: {
      order: {
        include: {
          table: true,
          session: true,
        },
      },
    },
  });

  if (!item) throw new NotFoundError('Dish');
  if (item.status === 'served') {
    return item; // Idempotent
  }

  const oldStatus = item.status;
  const updatedItem = await prisma.orderItem.update({
    where: { id: dishId },
    data: {
      status: 'served',
      statusChangedAt: new Date(),
      servedBy: waiterId,
    },
  });

  // Realtime notification to customer session
  await publishEvent(`session:${item.order.sessionId}:status`, 'dish.status_changed', {
    dishId: updatedItem.id,
    orderId: item.orderId,
    newStatus: 'served',
    itemName: item.itemNameSnapshot,
  });

  // Realtime notification to staff / waiter
  await publishEvent(`cafe:${cafeId}:waiter`, 'waiter.dish_served', {
    dishId: updatedItem.id,
    tableNumber: item.order.table.tableNumber,
    itemName: item.itemNameSnapshot,
    servedBy: waiterId,
  });

  await logAudit({
    cafeId,
    userId: waiterId,
    action: 'waiter.dish_served',
    entityType: 'order_item',
    entityId: dishId,
    oldValue: { status: oldStatus },
    newValue: { status: 'served' },
    req,
  });

  return updatedItem;
}

/**
 * Waiter action: Undo mark served.
 * Reverts dish from 'served' back to 'ready'.
 */
export async function undoDishServed(
  cafeId: string,
  dishId: string,
  waiterId: string,
  reason: string,
  req?: Request,
) {
  const item = await prisma.orderItem.findFirst({
    where: {
      id: dishId,
      order: { cafeId },
    },
    include: {
      order: {
        include: {
          table: true,
          session: true,
        },
      },
    },
  });

  if (!item) throw new NotFoundError('Dish');
  if (item.status !== 'served') {
    throw new ValidationError(`Cannot undo dish in status '${item.status}'. Only served dishes can be reverted.`);
  }

  const updatedItem = await prisma.orderItem.update({
    where: { id: dishId },
    data: {
      status: 'ready',
      statusChangedAt: new Date(),
    },
  });

  // Realtime notifications
  await publishEvent(`session:${item.order.sessionId}:status`, 'dish.status_changed', {
    dishId: updatedItem.id,
    orderId: item.orderId,
    newStatus: 'ready',
    itemName: item.itemNameSnapshot,
    isUndo: true,
  });

  await publishEvent(`cafe:${cafeId}:waiter`, 'waiter.dish_updated', {
    dishId: updatedItem.id,
    tableNumber: item.order.table.tableNumber,
    newStatus: 'ready',
    isUndo: true,
  });

  await logAudit({
    cafeId,
    userId: waiterId,
    action: 'waiter.dish_undo',
    entityType: 'order_item',
    entityId: dishId,
    oldValue: { status: 'served' },
    newValue: { status: 'ready', reason: reason || 'Reverted by waiter' },
    req,
  });

  return updatedItem;
}

/**
 * List all active/acknowledged waiter calls for cafe.
 */
export async function listWaiterCalls(cafeId: string) {
  const calls = await prisma.waiterCall.findMany({
    where: {
      cafeId,
      status: { in: ['active', 'acknowledged'] },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      table: { select: { id: true, tableNumber: true, label: true } },
      session: { select: { id: true, color: true } },
    },
  });

  return calls.map((c) => ({
    id: c.id,
    tableId: c.tableId,
    tableNumber: c.table.tableNumber,
    tableLabel: c.table.label,
    sessionId: c.sessionId,
    sessionColor: c.session.color,
    type: c.type,
    message: c.message,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
  }));
}

/**
 * Waiter acknowledges a customer call.
 */
export async function acknowledgeWaiterCall(cafeId: string, callId: string, staffId: string) {
  const call = await prisma.waiterCall.findFirst({
    where: { id: callId, cafeId },
  });

  if (!call) throw new NotFoundError('Waiter call');

  const updated = await prisma.waiterCall.update({
    where: { id: callId },
    data: {
      status: 'acknowledged',
      acknowledgedBy: staffId,
    },
    include: { table: true },
  });

  await publishEvent(`cafe:${cafeId}:waiter_calls`, 'waiter_call.updated', {
    callId: updated.id,
    tableNumber: updated.table.tableNumber,
    status: 'acknowledged',
    staffId,
  });

  return updated;
}

/**
 * Waiter clears / resolves a customer call.
 */
export async function resolveWaiterCall(cafeId: string, callId: string, staffId: string) {
  const call = await prisma.waiterCall.findFirst({
    where: { id: callId, cafeId },
  });

  if (!call) throw new NotFoundError('Waiter call');

  const updated = await prisma.waiterCall.update({
    where: { id: callId },
    data: {
      status: 'resolved',
      resolvedAt: new Date(),
      acknowledgedBy: staffId,
    },
    include: { table: true },
  });

  await publishEvent(`cafe:${cafeId}:waiter_calls`, 'waiter_call.resolved', {
    callId: updated.id,
    tableNumber: updated.table.tableNumber,
    status: 'resolved',
    staffId,
  });

  return updated;
}

/**
 * Waiter adds an order tableside on behalf of the customer.
 * In accordance with Section 7 of master prompt:
 * "Waiter can add dishes (go through manager approval)".
 * Order is created with status 'pending_approval' so manager can review and approve it.
 */
export async function waiterCreateOrder(
  cafeId: string,
  tableId: string,
  items: {
    itemId: string;
    quantity: number;
    selectedOptions?: any[];
    specialInstructions?: string;
  }[],
  waiterId: string,
  waiterName: string,
  req?: Request,
) {
  if (!items || items.length === 0) {
    throw new ValidationError('Order must contain at least one item');
  }

  // 1. Verify table and active session
  const table = await prisma.table.findFirst({
    where: { id: tableId, cafeId, deletedAt: null },
    include: {
      sessions: {
        where: { status: { in: ['open', 'bill_requested'] } },
        take: 1,
      },
    },
  });

  if (!table) throw new NotFoundError('Table');

  let session = table.sessions[0];

  // If no session exists, waiter creates one
  if (!session) {
    const rawPin = generatePin(4);

    const activeSessions = await prisma.tableSession.findMany({
      where: { cafeId, status: { in: ['open', 'bill_requested'] } },
      select: { color: true },
    });
    const usedColors = new Set(activeSessions.map((s) => s.color));
    const availableColor =
      SESSION_COLORS.find((c) => !usedColors.has(c)) ||
      SESSION_COLORS[Math.floor(Math.random() * SESSION_COLORS.length)];

    session = await prisma.tableSession.create({
      data: {
        cafeId,
        tableId: table.id,
        pin: rawPin,
        color: availableColor,
        status: 'open',
      },
    });
  }

  // 2. Fetch menu items to validate prices and names
  const itemIds = items.map((i) => i.itemId);
  const dbItems = await prisma.item.findMany({
    where: { id: { in: itemIds }, cafeId, deletedAt: null },
  });
  const itemMap = new Map(dbItems.map((i) => [i.id, i]));

  const orderCount = await prisma.order.count({ where: { cafeId } });
  const orderNumber = `#${101 + orderCount}`;

  // 3. Create order with status 'pending_approval'
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        cafeId,
        sessionId: session.id,
        tableId: table.id,
        orderNumber,
        status: 'pending_approval',
        businessDayId: session.businessDayId,
      },
    });

    for (const input of items) {
      const dbItem = itemMap.get(input.itemId);
      if (!dbItem) continue;

      let unitPrice = dbItem.pricePaise;
      if (input.selectedOptions && Array.isArray(input.selectedOptions)) {
        for (const opt of input.selectedOptions) {
          unitPrice += opt.extraPricePaise || 0;
        }
      }

      await tx.orderItem.create({
        data: {
          orderId: order.id,
          itemId: dbItem.id,
          itemNameSnapshot: dbItem.name,
          itemPriceSnapshot: unitPrice,
          quantity: input.quantity || 1,
          selectedOptionsSnapshot: input.selectedOptions || [],
          specialInstructions: input.specialInstructions
            ? `${input.specialInstructions} (Taken by Waiter ${waiterName})`
            : `Taken by Waiter ${waiterName}`,
          isVegSnapshot: dbItem.isVeg,
          status: 'placed',
        },
      });
    }

    return tx.order.findUnique({
      where: { id: order.id },
      include: { items: true, table: true },
    });
  });

  // 4. Notify manager live orders screen
  await publishEvent(`cafe:${cafeId}:orders`, 'order.created', {
    orderId: result!.id,
    orderNumber: result!.orderNumber,
    tableNumber: table.tableNumber,
    itemCount: result!.items.length,
    soundAlert: true,
    placedByWaiter: waiterName,
  });

  await logAudit({
    cafeId,
    userId: waiterId,
    action: 'waiter.order_created',
    entityType: 'order',
    entityId: result!.id,
    newValue: { orderNumber, tableNumber: table.tableNumber, itemCount: items.length },
    req,
  });

  return result;
}
