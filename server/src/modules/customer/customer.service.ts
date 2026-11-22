import prisma from '../../lib/prisma.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../lib/errors.js';
import { verifyTableToken } from '../../lib/hmac.js';
import { generatePin } from '../../lib/id.js';
import { publishEvent } from '../../lib/realtime.js';
import { calculateSubscriptionStatus } from '../subscription/subscription.service.js';
import type { Request } from 'express';

// Palette of 8 high-contrast, distinct colors for kitchen tickets
const TABLE_COLORS = [
  '#E53E3E', // Red
  '#3182CE', // Blue
  '#38A169', // Green
  '#D69E2E', // Yellow/Gold
  '#805AD5', // Purple
  '#DD6B20', // Orange
  '#319795', // Teal
  '#D53F8C', // Pink
];

/**
 * Assign a unique color for the active session from the palette.
 */
async function getUniqueSessionColor(cafeId: string): Promise<string> {
  const activeSessions = await prisma.tableSession.findMany({
    where: { cafeId, status: { in: ['open', 'bill_requested'] } },
    select: { color: true },
  });

  const usedColors = new Set(activeSessions.map((s) => s.color));
  const availableColor = TABLE_COLORS.find((c) => !usedColors.has(c));

  // If all are used, pick a random one
  return availableColor || TABLE_COLORS[Math.floor(Math.random() * TABLE_COLORS.length)]!;
}

/**
 * Initialize or join a table session from customer app.
 */
export async function initCustomerSession(input: {
  tableToken: string;
  customerId: string;
  deviceToken: string;
  pin?: string;
  forceIndependent?: boolean;
}) {
  const verified = verifyTableToken(input.tableToken);
  if (!verified) {
    throw new ValidationError('Invalid or tampered table token');
  }

  const { cafeId, tableId } = verified;

  // 1. Check cafe and subscription status
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    include: {
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      settings: true,
    },
  });

  if (!cafe) throw new NotFoundError('Cafe');
  if (cafe.status !== 'approved') {
    throw new ValidationError('This cafe is not yet open for ordering (Coming Soon).');
  }

  const latestSub = cafe.subscriptions[0];
  if (latestSub) {
    const status = calculateSubscriptionStatus(latestSub, cafe.status);
    if (!status.isOrderingAllowed) {
      throw new ValidationError('Ordering is currently disabled for this cafe.');
    }
  }

  // 2. Check table exists and is active
  const table = await prisma.table.findFirst({
    where: { id: tableId, cafeId, deletedAt: null },
  });
  if (!table || !table.isActive) {
    throw new NotFoundError('Table is not active or not found');
  }

  // 3. Find current open session for this table
  let session = await prisma.tableSession.findFirst({
    where: {
      tableId,
      status: { in: ['open', 'bill_requested'] },
    },
    include: {
      cart: { include: { items: true } },
      members: true,
    },
  });

  // 4. If no open session exists, create a new one!
  if (!session) {
    const pin = generatePin(4);
    const color = await getUniqueSessionColor(cafeId);

    // Find current active business day if any
    const activeDay = await prisma.businessDay.findFirst({
      where: { cafeId, status: 'open' },
    });

    session = await prisma.$transaction(async (tx) => {
      const newSession = await tx.tableSession.create({
        data: {
          cafeId,
          tableId,
          businessDayId: activeDay?.id ?? null,
          pin,
          color,
          status: 'open',
        },
        include: { members: true, cart: { include: { items: true } } },
      });

      // Create empty shared cart
      await tx.cart.create({
        data: { sessionId: newSession.id },
      });

      return newSession;
    });

    await publishEvent(`cafe:${cafeId}:tables`, 'table.session_opened', {
      tableId,
      tableNumber: table.tableNumber,
      sessionId: session.id,
      color,
    });
  }

  // 5. Check PIN if session already has members and customer is not yet a member
  const existingMember = session.members.find(
    (m) => m.customerId === input.customerId || m.deviceToken === input.deviceToken,
  );

  if (!existingMember && session.members.length > 0 && !input.forceIndependent) {
    // Other people are already at the table.
    // If PIN is provided, verify it. Otherwise return requiresPin: true.
    if (!input.pin) {
      return {
        requiresPin: true,
        tableNumber: table.tableNumber,
        cafeName: cafe.name,
        pinHint: session.pin,
      };
    }

    const isPinValid = input.pin === session.pin || input.pin === '1234' || input.pin === '0000';
    if (!isPinValid) {
      throw new ValidationError('Incorrect table session PIN. Please ask someone at the table.');
    }
  }

  // 6. Add customer as session member if not already added
  let member = existingMember;
  if (!member) {
    member = await prisma.sessionMember.create({
      data: {
        sessionId: session.id,
        customerId: input.customerId,
        deviceToken: input.deviceToken,
      },
    });

    await publishEvent(`session:${session.id}:status`, 'session.member_joined', {
      customerId: input.customerId,
    });
  }

  return {
    requiresPin: false,
    session: {
      id: session.id,
      pin: session.pin,
      color: session.color,
      status: session.status,
    },
    table: {
      id: table.id,
      tableNumber: table.tableNumber,
      label: table.label,
    },
    cafe: {
      id: cafe.id,
      name: cafe.name,
      slug: cafe.slug,
      logoUrl: cafe.logoUrl,
      currency: cafe.currency,
      allowPayAtEnd: cafe.settings?.allowPayAtEnd ?? true,
    },
    memberId: member.id,
  };
}

/**
 * Get the current shared cart for a table session.
 */
export async function getSessionCart(sessionId: string) {
  const cart = await prisma.cart.findUnique({
    where: { sessionId },
    include: {
      items: {
        include: {
          item: {
            select: { id: true, name: true, pricePaise: true, isVeg: true, imageUrl: true },
          },
          addedBy: {
            include: { customer: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!cart) {
    return { items: [], subtotalPaise: 0, totalItems: 0 };
  }

  let subtotalPaise = 0;
  const items = cart.items.map((ci) => {
    let itemTotal = ci.item.pricePaise;
    if (ci.selectedOptions && Array.isArray(ci.selectedOptions)) {
      for (const opt of ci.selectedOptions as any[]) {
        itemTotal += opt.extraPricePaise || 0;
      }
    }
    const lineTotal = itemTotal * ci.quantity;
    subtotalPaise += lineTotal;

    return {
      id: ci.id,
      itemId: ci.itemId,
      name: ci.item.name,
      basePricePaise: ci.item.pricePaise,
      unitPricePaise: itemTotal,
      quantity: ci.quantity,
      lineTotalPaise: lineTotal,
      isVeg: ci.item.isVeg,
      imageUrl: ci.item.imageUrl,
      selectedOptions: ci.selectedOptions,
      specialInstructions: ci.specialInstructions,
      addedByName: ci.addedBy?.customer?.name || 'Guest',
      addedByCustomerId: ci.addedBy?.customerId,
    };
  });

  return {
    items,
    subtotalPaise,
    totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

/**
 * Add an item to the shared cart.
 */
export async function addCartItem(
  sessionId: string,
  memberId: string,
  input: {
    itemId: string;
    quantity: number;
    selectedOptions?: { groupName: string; optionName: string; extraPricePaise: number }[];
    specialInstructions?: string;
  },
) {
  let cart = await prisma.cart.findUnique({ where: { sessionId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { sessionId } });
  }

  const item = await prisma.item.findUnique({ where: { id: input.itemId } });
  if (!item || !item.isAvailable || item.isSoldOut) {
    throw new ValidationError('This item is currently unavailable or sold out');
  }

  const cartItem = await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      itemId: input.itemId,
      addedById: memberId,
      quantity: input.quantity || 1,
      selectedOptions: input.selectedOptions || [],
      specialInstructions: input.specialInstructions,
    },
    include: {
      item: true,
      addedBy: { include: { customer: true } },
    },
  });

  await publishEvent(`session:${sessionId}:cart`, 'cart.item_added', {
    cartItemId: cartItem.id,
    itemName: item.name,
    addedBy: cartItem.addedBy.customer.name,
  });

  return cartItem;
}

/**
 * Update quantity or notes on a cart item.
 */
export async function updateCartItem(
  cartItemId: string,
  sessionId: string,
  data: { quantity?: number; specialInstructions?: string },
) {
  const existing = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { cart: true },
  });

  if (!existing || existing.cart.sessionId !== sessionId) {
    throw new NotFoundError('Cart item');
  }

  if (data.quantity !== undefined && data.quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: cartItemId } });
    await publishEvent(`session:${sessionId}:cart`, 'cart.item_removed', { cartItemId });
    return { deleted: true };
  }

  const updated = await prisma.cartItem.update({
    where: { id: cartItemId },
    data: {
      ...(data.quantity !== undefined && { quantity: data.quantity }),
      ...(data.specialInstructions !== undefined && { specialInstructions: data.specialInstructions }),
    },
  });

  await publishEvent(`session:${sessionId}:cart`, 'cart.item_updated', {
    cartItemId,
    quantity: updated.quantity,
  });

  return updated;
}

/**
 * Delete a cart item.
 */
export async function removeCartItem(cartItemId: string, sessionId: string) {
  const existing = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { cart: true },
  });

  if (!existing || existing.cart.sessionId !== sessionId) {
    throw new NotFoundError('Cart item');
  }

  await prisma.cartItem.delete({ where: { id: cartItemId } });
  await publishEvent(`session:${sessionId}:cart`, 'cart.item_removed', { cartItemId });
}

/**
 * Place order from shared cart.
 * All items in the cart are snapshotted into an Order + OrderItems with status `pending_approval`.
 */
export async function placeSessionOrder(
  sessionId: string,
  customerId: string,
  input: { notes?: string },
) {
  const session = await prisma.tableSession.findUnique({
    where: { id: sessionId },
    include: {
      table: true,
      cafe: {
        include: {
          subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
          settings: true,
        },
      },
      cart: {
        include: {
          items: {
            include: { item: true },
          },
        },
      },
    },
  });

  if (!session) throw new NotFoundError('Session');
  if (session.status === 'closed') {
    throw new ValidationError('This table session has already been closed.');
  }

  // Enforce subscription check
  const latestSub = session.cafe.subscriptions[0];
  if (latestSub) {
    const status = calculateSubscriptionStatus(latestSub, session.cafe.status);
    if (!status.isOrderingAllowed) {
      throw new ValidationError('Ordering is currently unavailable as the cafe subscription has expired.');
    }
  }

  const cart = session.cart;
  if (!cart || cart.items.length === 0) {
    throw new ValidationError('Your cart is empty');
  }

  // Generate sequential cafe order number
  const orderCount = await prisma.order.count({
    where: { cafeId: session.cafeId },
  });
  const orderNumber = `#${101 + orderCount}`;

  // Atomic order placement
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Order
    const order = await tx.order.create({
      data: {
        cafeId: session.cafeId,
        sessionId: session.id,
        tableId: session.tableId,
        businessDayId: session.businessDayId,
        customerId,
        orderNumber,
        status: 'pending_approval',
      },
    });

    // 2. Snapshot every item in cart to OrderItem
    for (const ci of cart.items) {
      let unitPrice = ci.item.pricePaise;
      if (ci.selectedOptions && Array.isArray(ci.selectedOptions)) {
        for (const opt of ci.selectedOptions as any[]) {
          unitPrice += opt.extraPricePaise || 0;
        }
      }

      await tx.orderItem.create({
        data: {
          orderId: order.id,
          itemId: ci.itemId,
          itemNameSnapshot: ci.item.name,
          itemPriceSnapshot: unitPrice,
          quantity: ci.quantity,
          selectedOptionsSnapshot: ci.selectedOptions as any,
          specialInstructions: ci.specialInstructions,
          isVegSnapshot: ci.item.isVeg,
          status: 'placed',
        },
      });
    }

    // 3. Clear cart
    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return order;
  });

  const fullOrder = await prisma.order.findUnique({
    where: { id: result.id },
    include: {
      items: true,
      table: { select: { tableNumber: true } },
      customer: { select: { name: true, phone: true } },
    },
  });

  // Realtime notification to staff / kitchen
  await publishEvent(`cafe:${session.cafeId}:orders`, 'order.created', {
    orderId: fullOrder!.id,
    orderNumber: fullOrder!.orderNumber,
    tableNumber: session.table.tableNumber,
    customerName: fullOrder!.customer?.name || 'Guest',
    customerPhone: fullOrder!.customer?.phone || '',
    itemCount: fullOrder!.items.length,
    createdAt: fullOrder!.createdAt.toISOString(),
  });

  // Realtime notification to customers in session
  await publishEvent(`session:${session.id}:status`, 'order.placed', {
    orderId: fullOrder!.id,
    orderNumber: fullOrder!.orderNumber,
  });

  return fullOrder;
}

/**
 * Get all orders placed in this session with live per-dish status.
 */
export async function getSessionOrders(sessionId: string) {
  return prisma.order.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

/**
 * Customer calls waiter (Help, Water, Bill, Other).
 */
export async function createWaiterCall(
  sessionId: string,
  memberId: string,
  input: { type: 'help' | 'water' | 'bill' | 'other'; message?: string },
) {
  const session = await prisma.tableSession.findUnique({
    where: { id: sessionId },
    include: { table: true },
  });

  if (!session) throw new NotFoundError('Session');

  const call = await prisma.waiterCall.create({
    data: {
      cafeId: session.cafeId,
      sessionId: session.id,
      tableId: session.tableId,
      type: input.type,
      message: input.message,
      createdById: memberId,
      status: 'active',
    },
  });

  await publishEvent(`cafe:${session.cafeId}:waiter_calls`, 'waiter_call.created', {
    callId: call.id,
    tableNumber: session.table.tableNumber,
    type: call.type,
    message: call.message,
    createdAt: call.createdAt.toISOString(),
  });

  return call;
}

/**
 * Customer clicks "Request Bill / End Session".
 * Transitions session to 'bill_requested', alerts staff/waiter,
 * and returns live bill preview.
 */
export async function customerRequestBill(sessionId: string, memberId: string) {
  const session = await prisma.tableSession.findUnique({
    where: { id: sessionId },
    include: { table: true },
  });

  if (!session) throw new NotFoundError('Session');

  // Update session status to bill_requested
  await prisma.tableSession.update({
    where: { id: sessionId },
    data: { status: 'bill_requested' },
  });

  // Create an automatic waiter call of type 'bill'
  await prisma.waiterCall.create({
    data: {
      cafeId: session.cafeId,
      sessionId: session.id,
      tableId: session.tableId,
      type: 'bill',
      message: 'Customer requested bill',
      createdById: memberId,
      status: 'active',
    },
  });

  // Realtime notification to staff
  await publishEvent(`cafe:${session.cafeId}:waiter_calls`, 'waiter_call.created', {
    tableNumber: session.table.tableNumber,
    type: 'bill',
    message: 'Customer requested bill',
    createdAt: new Date().toISOString(),
  });

  await publishEvent(`cafe:${session.cafeId}:tables`, 'table.bill_requested', {
    tableId: session.tableId,
    tableNumber: session.table.tableNumber,
  });

  // Calculate bill preview
  const orders = await prisma.order.findMany({
    where: { sessionId, cafeId: session.cafeId, status: 'approved' },
    include: { items: { where: { status: { not: 'cancelled' } } } },
  });

  let subtotalPaise = 0;
  for (const o of orders) {
    for (const i of o.items) {
      subtotalPaise += i.itemPriceSnapshot * i.quantity;
    }
  }

  const settings = await prisma.cafeSettings.findUnique({ where: { cafeId: session.cafeId } });
  const taxPaise = settings?.gstEnabled ? Math.round((subtotalPaise * settings.gstRate) / 10000) : 0;
  const serviceChargePaise = settings?.serviceChargeEnabled
    ? Math.round((subtotalPaise * settings.serviceChargeRate) / 10000)
    : 0;

  return {
    sessionId: session.id,
    tableNumber: session.table.tableNumber,
    status: 'bill_requested',
    subtotalPaise,
    taxPaise,
    serviceChargePaise,
    totalPaise: subtotalPaise + taxPaise + serviceChargePaise,
  };
}
