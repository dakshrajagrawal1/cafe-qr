import prisma from '../../lib/prisma.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
import { generateSecretSync } from '../../lib/id.js';
import { generateTableQR, generateTableQRSvg } from '../../lib/qr.js';
import { verifyTableToken } from '../../lib/hmac.js';
import { publishEvent } from '../../lib/realtime.js';

export async function listTables(cafeId: string) {
  return prisma.table.findMany({
    where: { cafeId, deletedAt: null },
    orderBy: { sortOrder: 'asc' },
    include: {
      sessions: {
        where: { status: { in: ['open', 'bill_requested'] } },
        take: 1,
      },
    },
  });
}

export async function createTable(
  cafeId: string,
  data: { tableNumber: string; label?: string; capacity?: number; sortOrder?: number },
) {
  const existing = await prisma.table.findFirst({
    where: { cafeId, tableNumber: data.tableNumber, deletedAt: null },
  });
  if (existing) {
    throw new ConflictError(`Table number ${data.tableNumber} already exists`);
  }

  const qrSecret = generateSecretSync(32);

  return prisma.table.create({
    data: {
      cafeId,
      tableNumber: data.tableNumber,
      label: data.label,
      capacity: data.capacity,
      sortOrder: data.sortOrder ?? 0,
      qrSecret,
    },
  });
}

export async function updateTable(
  cafeId: string,
  tableId: string,
  data: { tableNumber?: string; label?: string; capacity?: number; isActive?: boolean; sortOrder?: number },
) {
  const table = await prisma.table.findFirst({
    where: { id: tableId, cafeId, deletedAt: null },
  });
  if (!table) throw new NotFoundError('Table');

  return prisma.table.update({
    where: { id: tableId },
    data,
  });
}

export async function deleteTable(cafeId: string, tableId: string) {
  const table = await prisma.table.findFirst({
    where: { id: tableId, cafeId, deletedAt: null },
  });
  if (!table) throw new NotFoundError('Table');

  return prisma.table.update({
    where: { id: tableId },
    data: { deletedAt: new Date() },
  });
}

export async function getTableQRDetails(cafeId: string, tableId: string) {
  const table = await prisma.table.findFirst({
    where: { id: tableId, cafeId, deletedAt: null },
    include: { cafe: { select: { slug: true, name: true } } },
  });
  if (!table) throw new NotFoundError('Table');

  const qrDataUrl = await generateTableQR({
    cafeSlug: table.cafe.slug,
    cafeId: table.cafeId,
    tableId: table.id,
  });

  const qrSvg = await generateTableQRSvg({
    cafeSlug: table.cafe.slug,
    cafeId: table.cafeId,
    tableId: table.id,
  });

  return {
    table,
    qrDataUrl,
    qrSvg,
  };
}

/**
 * Verify a table token scanned by a customer.
 * URL: /c/:slug?t=:token
 */
export async function verifyCustomerTableToken(token: string) {
  const verified = verifyTableToken(token);
  if (!verified) {
    return { valid: false, error: 'Invalid or tampered table token' };
  }

  const table = await prisma.table.findFirst({
    where: { id: verified.tableId, cafeId: verified.cafeId, deletedAt: null },
    include: {
      cafe: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          fssaiNumber: true,
          logoUrl: true,
          coverUrl: true,
          currency: true,
          settings: true,
        },
      },
      sessions: {
        where: { status: { in: ['open', 'bill_requested'] } },
        take: 1,
      },
    },
  });

  if (!table) {
    return { valid: false, error: 'Table not found or deactivated' };
  }

  return {
    valid: true,
    data: {
      table: {
        id: table.id,
        tableNumber: table.tableNumber,
        label: table.label,
        capacity: table.capacity,
      },
      cafe: table.cafe,
      activeSession: table.sessions[0] ?? null,
    },
  };
}



/**
 * Live Table Grid: Aggregates real-time state across all tables in the cafe.
 * Status: 'free' | 'occupied' | 'bill_requested' | 'waiter_called'
 */
export async function getLiveTableGrid(cafeId: string) {
  const tables = await prisma.table.findMany({
    where: { cafeId, deletedAt: null },
    orderBy: { sortOrder: 'asc' },
    include: {
      sessions: {
        where: { status: { in: ['open', 'bill_requested'] } },
        take: 1,
        include: {
          members: { include: { customer: { select: { name: true, phone: true } } } },
          orders: {
            where: { status: { in: ['pending_approval', 'approved'] } },
            include: { items: true },
          },
        },
      },
      waiterCalls: {
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const now = Date.now();

  return tables.map((t) => {
    const activeSession = t.sessions[0];
    const activeCall = t.waiterCalls[0];

    let status: 'free' | 'occupied' | 'bill_requested' | 'waiter_called' = 'free';

    if (activeCall) {
      status = 'waiter_called';
    } else if (activeSession?.status === 'bill_requested') {
      status = 'bill_requested';
    } else if (activeSession) {
      status = 'occupied';
    }

    let elapsedMinutes = 0;
    let orderCount = 0;
    let dishCount = 0;
    let totalPaise = 0;

    if (activeSession) {
      elapsedMinutes = Math.floor((now - activeSession.startedAt.getTime()) / 60000);
      orderCount = activeSession.orders.length;

      for (const ord of activeSession.orders) {
        for (const item of ord.items) {
          if (item.status !== 'cancelled') {
            dishCount += item.quantity;
            totalPaise += item.itemPriceSnapshot * item.quantity;
          }
        }
      }
    }

    return {
      tableId: t.id,
      tableNumber: t.tableNumber,
      label: t.label,
      capacity: t.capacity,
      status,
      session: activeSession
        ? {
            id: activeSession.id,
            pin: activeSession.pin,
            color: activeSession.color,
            startedAt: activeSession.startedAt.toISOString(),
            elapsedMinutes,
            memberCount: activeSession.members.length,
            customers: activeSession.members.map((m) => m.customer.name),
            orderCount,
            dishCount,
            totalPaise,
          }
        : null,
      activeWaiterCall: activeCall
        ? {
            id: activeCall.id,
            type: activeCall.type,
            message: activeCall.message,
            createdAt: activeCall.createdAt.toISOString(),
          }
        : null,
    };
  });
}

/**
 * Force-close an idle table session with confirmation and logged reason.
 */
export async function forceCloseSession(
  cafeId: string,
  sessionId: string,
  reason: string,
  closedBy: string,
  req?: any,
) {
  const session = await prisma.tableSession.findFirst({
    where: { id: sessionId, cafeId },
    include: { table: true },
  });

  if (!session) throw new NotFoundError('Session');

  const updated = await prisma.tableSession.update({
    where: { id: sessionId },
    data: {
      status: 'closed',
      endedAt: new Date(),
      closeReason: reason,
      closedBy,
    },
  });

  // Release table color and update table status
  await publishEvent(`cafe:${cafeId}:tables`, 'table.status_changed', {
    tableId: session.tableId,
    tableNumber: session.table.tableNumber,
    status: 'free',
  });

  await publishEvent(`session:${sessionId}:status`, 'session.closed', {
    reason,
  });

  const { logAudit } = await import('../../lib/audit.js');
  await logAudit({
    cafeId,
    userId: closedBy,
    action: 'session.force_closed',
    entityType: 'table_session',
    entityId: sessionId,
    newValue: { reason, tableNumber: session.table.tableNumber },
    req,
  });

  return updated;
}
