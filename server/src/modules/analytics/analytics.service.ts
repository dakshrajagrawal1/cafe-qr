import prisma from '../../lib/prisma.js';

export async function getCafeAnalytics(
  cafeId: string,
  range: 'today' | 'week' | 'month' = 'today',
) {
  const now = new Date();
  let startDate = new Date();

  if (range === 'today') {
    startDate.setHours(0, 0, 0, 0);
  } else if (range === 'week') {
    startDate.setDate(now.getDate() - 7);
  } else if (range === 'month') {
    startDate.setDate(now.getDate() - 30);
  }

  // 1. Fetch settled bills in this date range
  const bills = await prisma.bill.findMany({
    where: {
      cafeId,
      status: 'paid',
      settledAt: { gte: startDate },
    },
    include: {
      payments: true,
      lines: true,
    },
    orderBy: { settledAt: 'asc' },
  });

  // 2. Fetch approved orders count
  const totalOrders = await prisma.order.count({
    where: {
      cafeId,
      status: 'approved',
      createdAt: { gte: startDate },
    },
  });

  let totalRevenuePaise = 0;
  let cashPaise = 0;
  let onlinePaise = 0;

  for (const bill of bills) {
    totalRevenuePaise += bill.totalPaise;
    for (const payment of bill.payments) {
      if (payment.status === 'completed') {
        if (payment.mode === 'cash') {
          cashPaise += payment.amountPaise;
        } else {
          onlinePaise += payment.amountPaise;
        }
      }
    }
  }

  const avgTicketPaise =
    totalOrders > 0 ? Math.round(totalRevenuePaise / totalOrders) : 0;

  // 3. Most ordered items ranking
  const itemCounts = new Map<string, { name: string; quantity: number; revenuePaise: number }>();

  for (const bill of bills) {
    for (const line of bill.lines) {
      const existing = itemCounts.get(line.description) || {
        name: line.description,
        quantity: 0,
        revenuePaise: 0,
      };
      existing.quantity += line.quantity;
      existing.revenuePaise += line.totalPaise;
      itemCounts.set(line.description, existing);
    }
  }

  const topItems = Array.from(itemCounts.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // 4. Timeline chart data points
  const timeline: { label: string; revenuePaise: number; ordersCount: number }[] = [];

  if (range === 'today') {
    // Bucket by 4-hour slots
    const slots = [
      { start: 0, end: 6, label: 'Early Morning' },
      { start: 6, end: 12, label: 'Breakfast / Noon' },
      { start: 12, end: 16, label: 'Lunch / Afternoon' },
      { start: 16, end: 20, label: 'Evening Snacks' },
      { start: 20, end: 24, label: 'Dinner / Late Night' },
    ];

    for (const slot of slots) {
      let slotRev = 0;
      let slotOrders = 0;

      for (const bill of bills) {
        if (bill.settledAt) {
          const hour = bill.settledAt.getHours();
          if (hour >= slot.start && hour < slot.end) {
            slotRev += bill.totalPaise;
            slotOrders++;
          }
        }
      }

      timeline.push({ label: slot.label, revenuePaise: slotRev, ordersCount: slotOrders });
    }
  } else {
    // Bucket by days
    const daysMap = new Map<string, { revenuePaise: number; ordersCount: number }>();

    for (const bill of bills) {
      if (bill.settledAt) {
        const dateKey = bill.settledAt.toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
        });
        const current = daysMap.get(dateKey) || { revenuePaise: 0, ordersCount: 0 };
        current.revenuePaise += bill.totalPaise;
        current.ordersCount++;
        daysMap.set(dateKey, current);
      }
    }

    for (const [label, data] of daysMap.entries()) {
      timeline.push({ label, revenuePaise: data.revenuePaise, ordersCount: data.ordersCount });
    }
  }

  return {
    range,
    totalRevenuePaise,
    totalOrders,
    avgTicketPaise,
    paymentSplit: {
      cashPaise,
      onlinePaise,
      cashPercent:
        totalRevenuePaise > 0 ? Math.round((cashPaise / totalRevenuePaise) * 100) : 0,
      onlinePercent:
        totalRevenuePaise > 0 ? Math.round((onlinePaise / totalRevenuePaise) * 100) : 0,
    },
    topItems,
    timeline,
  };
}
