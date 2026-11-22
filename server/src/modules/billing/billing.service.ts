import prisma from '../../lib/prisma.js';
import { NotFoundError, ValidationError, ConflictError } from '../../lib/errors.js';
import { publishEvent } from '../../lib/realtime.js';
import { logAudit } from '../../lib/audit.js';
import { generateId } from '../../lib/id.js';
import type { Request } from 'express';

export interface SettleBillInput {
  mode: 'cash' | 'online' | 'upi_counter' | 'split';
  cashReceivedPaise?: number;
  cashAmountPaise?: number;
  onlineAmountPaise?: number;
  gatewayRef?: string;
  notes?: string;
}

/**
 * Preview bill calculation for an active session with GST and service charges.
 */
export async function getSessionBillPreview(cafeId: string, sessionId: string) {
  const session = await prisma.tableSession.findFirst({
    where: { id: sessionId, cafeId },
    include: {
      table: true,
      orders: {
        where: { status: 'approved' },
        include: {
          items: {
            where: { status: { not: 'cancelled' } },
            include: { item: { select: { isVeg: true } } },
          },
        },
      },
    },
  });

  if (!session) throw new NotFoundError('Table session');

  const settings = await prisma.cafeSettings.findUnique({
    where: { cafeId },
  });

  // 1. Calculate subtotal from all approved order items
  let subtotalPaise = 0;
  const lines: {
    orderItemId: string;
    itemName: string;
    quantity: number;
    unitPricePaise: number;
    totalPaise: number;
    options: any;
    isVeg: boolean;
  }[] = [];

  for (const order of session.orders) {
    for (const item of order.items) {
      const lineTotal = item.itemPriceSnapshot * item.quantity;
      subtotalPaise += lineTotal;
      lines.push({
        orderItemId: item.id,
        itemName: item.itemNameSnapshot,
        quantity: item.quantity,
        unitPricePaise: item.itemPriceSnapshot,
        totalPaise: lineTotal,
        options: item.selectedOptionsSnapshot,
        isVeg: item.isVegSnapshot,
      });
    }
  }

  // 2. Calculate Tax / GST (basis points, e.g. 500 = 5%)
  let taxPaise = 0;
  if (settings?.gstEnabled && settings.gstRate > 0) {
    taxPaise = Math.round((subtotalPaise * settings.gstRate) / 10000);
  }

  // 3. Service Charge (basis points)
  let serviceChargePaise = 0;
  if (settings?.serviceChargeEnabled && settings.serviceChargeRate > 0) {
    serviceChargePaise = Math.round((subtotalPaise * settings.serviceChargeRate) / 10000);
  }

  const totalPaise = subtotalPaise + taxPaise + serviceChargePaise;

  return {
    sessionId: session.id,
    tableId: session.tableId,
    tableNumber: session.table.tableNumber,
    tableLabel: session.table.label,
    lines,
    subtotalPaise,
    taxPaise,
    gstRate: settings?.gstEnabled ? settings.gstRate : 0,
    gstNumber: null,
    serviceChargePaise,
    totalPaise,
  };
}

/**
 * Create or update a Bill record for a session before settling.
 */
export async function createOrUpdateBill(
  cafeId: string,
  sessionId: string,
  discountPaise: number = 0,
  notes?: string,
) {
  const preview = await getSessionBillPreview(cafeId, sessionId);

  if (preview.lines.length === 0) {
    throw new ValidationError('Cannot generate bill for a session with no ordered items');
  }

  const session = await prisma.tableSession.findUnique({
    where: { id: sessionId },
  });

  const finalTotalPaise = Math.max(0, preview.totalPaise - discountPaise);

  // Check if a bill already exists for this session
  const existingBill = await prisma.bill.findFirst({
    where: { sessionId, cafeId, status: { in: ['draft', 'issued'] } },
  });

  if (existingBill) {
    return prisma.$transaction(async (tx) => {
      await tx.billLine.deleteMany({ where: { billId: existingBill.id } });

      const updated = await tx.bill.update({
        where: { id: existingBill.id },
        data: {
          subtotalPaise: preview.subtotalPaise,
          taxPaise: preview.taxPaise,
          serviceChargePaise: preview.serviceChargePaise,
          discountPaise,
          totalPaise: finalTotalPaise,
          notes,
          status: 'issued',
          issuedAt: new Date(),
        },
      });

      for (const line of preview.lines) {
        await tx.billLine.create({
          data: {
            billId: updated.id,
            orderItemId: line.orderItemId,
            description: line.itemName,
            quantity: line.quantity,
            unitPricePaise: line.unitPricePaise,
            totalPaise: line.totalPaise,
          },
        });
      }

      return tx.bill.findUnique({
        where: { id: updated.id },
        include: { lines: true, session: { include: { table: true } } },
      });
    });
  }

  return prisma.$transaction(async (tx) => {
    const bill = await tx.bill.create({
      data: {
        cafeId,
        sessionId,
        tableId: preview.tableId,
        businessDayId: session?.businessDayId,
        subtotalPaise: preview.subtotalPaise,
        taxPaise: preview.taxPaise,
        serviceChargePaise: preview.serviceChargePaise,
        discountPaise,
        totalPaise: finalTotalPaise,
        notes,
        status: 'issued',
        issuedAt: new Date(),
      },
    });

    for (const line of preview.lines) {
      await tx.billLine.create({
        data: {
          billId: bill.id,
          orderItemId: line.orderItemId,
          description: line.itemName,
          quantity: line.quantity,
          unitPricePaise: line.unitPricePaise,
          totalPaise: line.totalPaise,
        },
      });
    }

    return tx.bill.findUnique({
      where: { id: bill.id },
      include: { lines: true, session: { include: { table: true } } },
    });
  });
}

/**
 * Manager action: Settle Bill and Close Table Session.
 * Handles cash with change return calculator, online/counter UPI, and split payment.
 * Automatically releases table and table session color.
 */
export async function settleBill(
  cafeId: string,
  billId: string,
  input: SettleBillInput,
  settledBy: string,
  req?: Request,
) {
  const bill = await prisma.bill.findFirst({
    where: { id: billId, cafeId },
    include: {
      session: { include: { table: true } },
      payments: true,
    },
  });

  if (!bill) throw new NotFoundError('Bill');
  if (bill.status === 'paid') {
    throw new ConflictError('Bill is already paid and settled');
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Process payment mode and calculate change if cash
    if (input.mode === 'cash') {
      const received = input.cashReceivedPaise || 0;
      if (received < bill.totalPaise) {
        throw new ValidationError(
          `Cash received (₹${(received / 100).toFixed(2)}) is less than total bill (₹${(bill.totalPaise / 100).toFixed(2)})`,
        );
      }

      const changeReturned = received - bill.totalPaise;

      await tx.custPayment.create({
        data: {
          billId: bill.id,
          cafeId,
          mode: 'cash',
          amountPaise: bill.totalPaise,
          cashReceivedPaise: received,
          changeReturnedPaise: changeReturned,
          idempotencyKey: `cash_${bill.id}_${generateId()}`,
          status: 'completed',
        },
      });
    } else if (input.mode === 'online' || input.mode === 'upi_counter') {
      await tx.custPayment.create({
        data: {
          billId: bill.id,
          cafeId,
          mode: input.mode,
          amountPaise: bill.totalPaise,
          gatewayRef: input.gatewayRef || 'Counter UPI/Card',
          idempotencyKey: `online_${bill.id}_${generateId()}`,
          status: 'completed',
        },
      });
    } else if (input.mode === 'split') {
      const cashPart = input.cashAmountPaise || 0;
      const onlinePart = input.onlineAmountPaise || 0;

      if (cashPart + onlinePart !== bill.totalPaise) {
        throw new ValidationError(
          `Split cash (₹${(cashPart / 100).toFixed(2)}) and online (₹${(onlinePart / 100).toFixed(2)}) must sum exactly to total (₹${(bill.totalPaise / 100).toFixed(2)})`,
        );
      }

      const received = input.cashReceivedPaise || cashPart;
      if (received < cashPart) {
        throw new ValidationError(
          `Cash received (₹${(received / 100).toFixed(2)}) is less than cash share (₹${(cashPart / 100).toFixed(2)})`,
        );
      }

      const changeReturned = received - cashPart;

      // Cash payment line
      await tx.custPayment.create({
        data: {
          billId: bill.id,
          cafeId,
          mode: 'cash',
          amountPaise: cashPart,
          cashReceivedPaise: received,
          changeReturnedPaise: changeReturned,
          idempotencyKey: `split_cash_${bill.id}_${generateId()}`,
          status: 'completed',
        },
      });

      // Online payment line
      await tx.custPayment.create({
        data: {
          billId: bill.id,
          cafeId,
          mode: 'online',
          amountPaise: onlinePart,
          gatewayRef: input.gatewayRef || 'Split Online Portion',
          idempotencyKey: `split_online_${bill.id}_${generateId()}`,
          status: 'completed',
        },
      });
    }

    // 2. Mark Bill as Paid
    const updatedBill = await tx.bill.update({
      where: { id: bill.id },
      data: {
        status: 'paid',
        settledAt: new Date(),
        settledBy,
      },
      include: {
        lines: true,
        payments: true,
        session: { include: { table: true } },
      },
    });

    // 3. Close the Table Session (frees table and releases table color)
    await tx.tableSession.update({
      where: { id: bill.sessionId },
      data: {
        status: 'closed',
        endedAt: new Date(),
      },
    });

    return updatedBill;
  });

  // 4. Realtime Events: broadcast to customer, table grid, and orders screens
  await publishEvent(`session:${bill.sessionId}:status`, 'session.closed', {
    billId: result.id,
    totalPaise: result.totalPaise,
    status: 'paid',
  });

  await publishEvent(`cafe:${cafeId}:tables`, 'table.freed', {
    tableId: bill.tableId,
    tableNumber: bill.session.table.tableNumber,
    freedAt: new Date().toISOString(),
  });

  await publishEvent(`cafe:${cafeId}:orders`, 'session.settled', {
    billId: result.id,
    tableNumber: bill.session.table.tableNumber,
    totalPaise: result.totalPaise,
    mode: input.mode,
  });

  await logAudit({
    cafeId,
    userId: settledBy,
    action: 'bill.settled',
    entityType: 'bill',
    entityId: bill.id,
    newValue: {
      mode: input.mode,
      totalPaise: result.totalPaise,
      tableNumber: bill.session.table.tableNumber,
    },
    req,
  });

  return result;
}
