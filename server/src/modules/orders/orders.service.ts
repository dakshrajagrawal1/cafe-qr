import prisma from '../../lib/prisma.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../lib/errors.js';
import { publishEvent } from '../../lib/realtime.js';
import { logAudit } from '../../lib/audit.js';
import type { Request } from 'express';

/**
 * List orders for a cafe with filtering.
 */
export async function listCafeOrders(
  cafeId: string,
  filters: {
    status?: any;
    sessionId?: string;
    todayOnly?: boolean;
    page?: number;
    limit?: number;
  },
) {
  const page = filters.page || 1;
  const limit = filters.limit || 50;

  const where: any = { cafeId };
  if (filters.status) where.status = filters.status;
  if (filters.sessionId) where.sessionId = filters.sessionId;

  if (filters.todayOnly) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    where.createdAt = { gte: startOfDay };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        table: { select: { id: true, tableNumber: true, label: true } },
        customer: { select: { id: true, name: true, phone: true } },
        session: { select: { id: true, pin: true, color: true } },
        items: {
          orderBy: { createdAt: 'asc' },
          include: { item: { select: { prepTimeMin: true } } },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data: orders,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Approve an incoming order (full or partial approval).
 */
export async function approveOrder(
  cafeId: string,
  orderId: string,
  approvedBy: string,
  itemDecisions?: { orderItemId: string; approved: boolean; cancelReason?: string }[],
  req?: Request,
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, cafeId },
    include: {
      items: true,
      table: true,
      session: true,
      customer: true,
    },
  });

  if (!order) throw new NotFoundError('Order');
  if (order.status !== 'pending_approval') {
    throw new ValidationError(`Order is already ${order.status}`);
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Process per-dish decisions if partial approval
    let hasApprovedItems = false;

    if (itemDecisions && itemDecisions.length > 0) {
      for (const dec of itemDecisions) {
        if (dec.approved) {
          hasApprovedItems = true;
          await tx.orderItem.update({
            where: { id: dec.orderItemId },
            data: { status: 'confirmed', statusChangedAt: new Date() },
          });
        } else {
          await tx.orderItem.update({
            where: { id: dec.orderItemId },
            data: {
              status: 'cancelled',
              cancelReason: dec.cancelReason || 'Rejected by cafe manager',
              statusChangedAt: new Date(),
            },
          });
        }
      }
    } else {
      // Full approval: all items confirmed
      hasApprovedItems = true;
      await tx.orderItem.updateMany({
        where: { orderId: order.id },
        data: { status: 'confirmed', statusChangedAt: new Date() },
      });
    }

    // 2. Update order status
    const newOrderStatus = hasApprovedItems ? 'approved' : 'rejected';
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        status: newOrderStatus,
        approvedBy,
        ...(newOrderStatus === 'rejected' && { rejectionReason: 'All items unavailable' }),
      },
      include: { items: true, table: true, session: true, customer: true },
    });

    return updatedOrder;
  });

  // 3. Realtime event notifications
  // To kitchen screen: new approved dishes to prepare
  if (result.status === 'approved') {
    const confirmedDishes = result.items.filter((i) => i.status === 'confirmed');

    await publishEvent(`cafe:${cafeId}:kitchen`, 'kitchen.new_order', {
      orderId: result.id,
      orderNumber: result.orderNumber,
      tableNumber: result.table.tableNumber,
      sessionColor: result.session.color,
      dishes: confirmedDishes.map((d) => ({
        id: d.id,
        name: d.itemNameSnapshot,
        quantity: d.quantity,
        isVeg: d.isVegSnapshot,
        options: d.selectedOptionsSnapshot,
        notes: d.specialInstructions,
      })),
      soundAlert: true,
    });
  }

  // To customer session: order approved/confirmed
  await publishEvent(`session:${order.sessionId}:status`, 'order.status_changed', {
    orderId: result.id,
    orderNumber: result.orderNumber,
    newStatus: result.status,
    items: result.items.map((i) => ({ id: i.id, status: i.status })),
  });

  // To staff orders screen
  await publishEvent(`cafe:${cafeId}:orders`, 'order.approved', {
    orderId: result.id,
    orderNumber: result.orderNumber,
    approvedBy,
  });

  await logAudit({
    cafeId,
    userId: approvedBy,
    action: 'order.approved',
    entityType: 'order',
    entityId: order.id,
    newValue: { status: result.status, itemCount: result.items.length },
    req,
  });

  return result;
}

/**
 * Reject an incoming order with a reason.
 */
export async function rejectOrder(
  cafeId: string,
  orderId: string,
  reason: string,
  rejectedBy: string,
  req?: Request,
) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, cafeId },
    include: { table: true },
  });

  if (!order) throw new NotFoundError('Order');
  if (order.status !== 'pending_approval') {
    throw new ValidationError(`Order is already ${order.status}`);
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Cancel all items
    await tx.orderItem.updateMany({
      where: { orderId: order.id },
      data: { status: 'cancelled', cancelReason: reason, statusChangedAt: new Date() },
    });

    // 2. Reject order
    return tx.order.update({
      where: { id: order.id },
      data: {
        status: 'rejected',
        rejectionReason: reason,
        approvedBy: rejectedBy,
      },
      include: { items: true, table: true },
    });
  });

  // Notify customer
  await publishEvent(`session:${order.sessionId}:status`, 'order.rejected', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    reason,
  });

  // Notify staff
  await publishEvent(`cafe:${cafeId}:orders`, 'order.rejected', {
    orderId: order.id,
    reason,
    rejectedBy,
  });

  await logAudit({
    cafeId,
    userId: rejectedBy,
    action: 'order.rejected',
    entityType: 'order',
    entityId: order.id,
    newValue: { reason },
    req,
  });

  return result;
}

/**
 * Manager action: add forgotten dish directly to an open session.
 * Created directly as approved & confirmed so it routes straight to the kitchen.
 */
export async function addForgottenDishToSession(
  cafeId: string,
  sessionId: string,
  input: {
    itemId: string;
    quantity: number;
    selectedOptions?: any[];
    specialInstructions?: string;
  },
  addedBy: string,
  req?: Request,
) {
  const session = await prisma.tableSession.findFirst({
    where: { id: sessionId, cafeId, status: { in: ['open', 'bill_requested'] } },
    include: { table: true },
  });

  if (!session) throw new NotFoundError('Active table session');

  const item = await prisma.item.findFirst({
    where: { id: input.itemId, cafeId, deletedAt: null },
  });

  if (!item) throw new NotFoundError('Menu item');

  // Calculate snapshot price
  let unitPrice = item.pricePaise;
  if (input.selectedOptions && Array.isArray(input.selectedOptions)) {
    for (const opt of input.selectedOptions) {
      unitPrice += opt.extraPricePaise || 0;
    }
  }

  const orderCount = await prisma.order.count({ where: { cafeId } });
  const orderNumber = `#${101 + orderCount} (Staff)`;

  const result = await prisma.$transaction(async (tx) => {
    // Create pre-approved order
    const order = await tx.order.create({
      data: {
        cafeId,
        sessionId: session.id,
        tableId: session.tableId,
        businessDayId: session.businessDayId,
        orderNumber,
        status: 'approved',
        approvedBy: addedBy,
      },
    });

    const orderItem = await tx.orderItem.create({
      data: {
        orderId: order.id,
        itemId: item.id,
        itemNameSnapshot: item.name,
        itemPriceSnapshot: unitPrice,
        quantity: input.quantity || 1,
        selectedOptionsSnapshot: input.selectedOptions || [],
        specialInstructions: input.specialInstructions || 'Added by manager',
        isVegSnapshot: item.isVeg,
        status: 'confirmed',
        statusChangedAt: new Date(),
      },
    });

    return { order, orderItem };
  });

  // Push to kitchen screen
  await publishEvent(`cafe:${cafeId}:kitchen`, 'kitchen.new_order', {
    orderId: result.order.id,
    orderNumber,
    tableNumber: session.table.tableNumber,
    sessionColor: session.color,
    dishes: [
      {
        id: result.orderItem.id,
        name: result.orderItem.itemNameSnapshot,
        quantity: result.orderItem.quantity,
        isVeg: result.orderItem.isVegSnapshot,
        options: result.orderItem.selectedOptionsSnapshot,
        notes: result.orderItem.specialInstructions,
      },
    ],
    soundAlert: true,
  });

  // Push to customer screen
  await publishEvent(`session:${session.id}:status`, 'order.status_changed', {
    orderId: result.order.id,
    orderNumber,
    newStatus: 'approved',
  });

  await logAudit({
    cafeId,
    userId: addedBy,
    action: 'order.item_added_by_staff',
    entityType: 'order_item',
    entityId: result.orderItem.id,
    newValue: { itemName: item.name, quantity: input.quantity },
    req,
  });

  return result;
}
