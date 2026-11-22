import prisma from '../../lib/prisma.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../lib/errors.js';
import { publishEvent } from '../../lib/realtime.js';
import { logAudit } from '../../lib/audit.js';
import type { Request } from 'express';

export interface KitchenTicketItem {
  id: string;
  orderId: string;
  orderNumber: string;
  tableId: string;
  tableNumber: string;
  tableLabel?: string | null;
  sessionId: string;
  sessionColor: string;
  itemName: string;
  itemPricePaise: number;
  quantity: number;
  isVeg: boolean;
  selectedOptions: any;
  specialInstructions?: string | null;
  status: 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  prepTimeMin?: number | null;
  waitingMinutes: number;
  createdAt: string;
  statusChangedAt?: string | null;
  preparedBy?: string | null;
}

/**
 * List active dish tickets for kitchen screen (or manager view).
 * Tickets are items from confirmed/approved orders in active sessions
 * that are in 'confirmed', 'preparing', or 'ready' status.
 */
export async function listKitchenTickets(cafeId: string): Promise<KitchenTicketItem[]> {
  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        cafeId,
        status: 'approved',
        session: {
          status: { in: ['open', 'bill_requested'] },
        },
      },
      status: { in: ['confirmed', 'preparing', 'ready'] },
    },
    include: {
      order: {
        include: {
          table: true,
          session: true,
        },
      },
      item: {
        select: {
          prepTimeMin: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const now = Date.now();

  return items.map((i) => {
    const createdTime = new Date(i.createdAt).getTime();
    const waitingMinutes = Math.max(0, Math.floor((now - createdTime) / 60000));

    return {
      id: i.id,
      orderId: i.orderId,
      orderNumber: i.order.orderNumber,
      tableId: i.order.tableId,
      tableNumber: i.order.table.tableNumber,
      tableLabel: i.order.table.label,
      sessionId: i.order.sessionId,
      sessionColor: i.order.session.color,
      itemName: i.itemNameSnapshot,
      itemPricePaise: i.itemPriceSnapshot,
      quantity: i.quantity,
      isVeg: i.isVegSnapshot,
      selectedOptions: i.selectedOptionsSnapshot,
      specialInstructions: i.specialInstructions,
      status: i.status as any,
      prepTimeMin: i.item?.prepTimeMin,
      waitingMinutes,
      createdAt: i.createdAt.toISOString(),
      statusChangedAt: i.statusChangedAt?.toISOString() || null,
      preparedBy: i.preparedBy,
    };
  });
}

/**
 * Transition dish status in kitchen:
 * 'confirmed' -> 'preparing' -> 'ready'
 */
export async function updateTicketStatus(
  cafeId: string,
  ticketId: string,
  newStatus: 'preparing' | 'ready',
  userId: string,
  req?: Request,
) {
  const item = await prisma.orderItem.findFirst({
    where: {
      id: ticketId,
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

  if (!item) {
    throw new NotFoundError('Dish ticket');
  }

  const validTransitions: Record<string, string[]> = {
    confirmed: ['preparing', 'ready'],
    preparing: ['ready'],
  };

  const allowedNext = validTransitions[item.status] || [];
  if (!allowedNext.includes(newStatus)) {
    throw new ValidationError(
      `Cannot transition dish from '${item.status}' to '${newStatus}'. Allowed: ${allowedNext.join(', ') || 'none'}`,
    );
  }

  const oldStatus = item.status;
  const updatedItem = await prisma.orderItem.update({
    where: { id: ticketId },
    data: {
      status: newStatus,
      statusChangedAt: new Date(),
      preparedBy: userId,
    },
  });

  // Realtime notification to kitchen screen
  await publishEvent(`cafe:${cafeId}:kitchen`, 'kitchen.dish_updated', {
    ticketId: updatedItem.id,
    oldStatus,
    newStatus,
    tableNumber: item.order.table.tableNumber,
    itemName: item.itemNameSnapshot,
  });

  // Realtime notification to customer session
  await publishEvent(`session:${item.order.sessionId}:status`, 'dish.status_changed', {
    dishId: updatedItem.id,
    orderId: item.orderId,
    newStatus,
    itemName: item.itemNameSnapshot,
  });

  // If dish is ready, alert waiter screen
  if (newStatus === 'ready') {
    await publishEvent(`cafe:${cafeId}:waiter`, 'waiter.dish_ready', {
      dishId: updatedItem.id,
      orderId: item.orderId,
      tableId: item.order.tableId,
      tableNumber: item.order.table.tableNumber,
      itemName: item.itemNameSnapshot,
      quantity: item.quantity,
    });
  }

  // Audit log entry
  await logAudit({
    cafeId,
    userId,
    action: 'kitchen.dish_status_changed',
    entityType: 'order_item',
    entityId: ticketId,
    oldValue: { status: oldStatus },
    newValue: { status: newStatus },
    req,
  });

  return updatedItem;
}

/**
 * Chef/Manager action: Undo the last dish status transition.
 * Reverts 'ready' back to 'preparing', or 'preparing' back to 'confirmed'.
 * Always logged with timestamp, user ID, old state, new state, and reason.
 */
export async function undoTicketStatus(
  cafeId: string,
  ticketId: string,
  userId: string,
  reason: string,
  req?: Request,
) {
  const item = await prisma.orderItem.findFirst({
    where: {
      id: ticketId,
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

  if (!item) {
    throw new NotFoundError('Dish ticket');
  }

  const undoMap: Record<string, 'confirmed' | 'preparing'> = {
    ready: 'preparing',
    preparing: 'confirmed',
  };

  const revertedStatus = undoMap[item.status];
  if (!revertedStatus) {
    throw new ValidationError(
      `Cannot undo dish in '${item.status}' status. Only 'ready' or 'preparing' dishes can be undone.`,
    );
  }

  const oldStatus = item.status;
  const updatedItem = await prisma.orderItem.update({
    where: { id: ticketId },
    data: {
      status: revertedStatus,
      statusChangedAt: new Date(),
    },
  });

  // Audit log for UNDO action
  await logAudit({
    cafeId,
    userId,
    action: 'kitchen.dish_undo',
    entityType: 'order_item',
    entityId: ticketId,
    oldValue: { status: oldStatus },
    newValue: { status: revertedStatus, reason: reason || 'Reverted by chef/manager' },
    req,
  });

  // Broadcast realtime updates
  await publishEvent(`cafe:${cafeId}:kitchen`, 'kitchen.dish_updated', {
    ticketId: updatedItem.id,
    oldStatus,
    newStatus: revertedStatus,
    isUndo: true,
    reason,
    tableNumber: item.order.table.tableNumber,
    itemName: item.itemNameSnapshot,
  });

  await publishEvent(`session:${item.order.sessionId}:status`, 'dish.status_changed', {
    dishId: updatedItem.id,
    orderId: item.orderId,
    newStatus: revertedStatus,
    itemName: item.itemNameSnapshot,
    isUndo: true,
  });

  await publishEvent(`cafe:${cafeId}:waiter`, 'waiter.dish_updated', {
    dishId: updatedItem.id,
    tableNumber: item.order.table.tableNumber,
    newStatus: revertedStatus,
  });

  return updatedItem;
}
