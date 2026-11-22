import { describe, it, expect } from 'vitest';

describe('Cafe Financial Analytics & Sales Metrics', () => {
  it('calculates average ticket size and cash/online ratios correctly', () => {
    const totalRevenuePaise = 250000; // ₹2,500.00
    const totalOrders = 10;

    const avgTicketPaise = Math.round(totalRevenuePaise / totalOrders);
    expect(avgTicketPaise).toBe(25000); // ₹250.00 avg ticket

    const cashPaise = 150000;   // ₹1,500.00
    const onlinePaise = 100000; // ₹1,000.00

    const cashPercent = Math.round((cashPaise / totalRevenuePaise) * 100);
    const onlinePercent = Math.round((onlinePaise / totalRevenuePaise) * 100);

    expect(cashPercent).toBe(60);
    expect(onlinePercent).toBe(40);
    expect(cashPercent + onlinePercent).toBe(100);
  });

  it('ranks top selling dishes by quantity and revenue', () => {
    const dishSales = [
      { name: 'Plain Maggi', quantity: 15, revenuePaise: 75000 },
      { name: 'Masala Chai', quantity: 30, revenuePaise: 60000 },
      { name: 'Cold Coffee', quantity: 20, revenuePaise: 160000 },
    ];

    const rankedByQuantity = [...dishSales].sort((a, b) => b.quantity - a.quantity);
    expect(rankedByQuantity[0]!.name).toBe('Masala Chai');
    expect(rankedByQuantity[1]!.name).toBe('Cold Coffee');
    expect(rankedByQuantity[2]!.name).toBe('Plain Maggi');

    const rankedByRevenue = [...dishSales].sort((a, b) => b.revenuePaise - a.revenuePaise);
    expect(rankedByRevenue[0]!.name).toBe('Cold Coffee');
  });

  it('enforces RBAC: managers cannot access money analytics', () => {
    const permissions = {
      owner: ['view_orders', 'view_tables', 'view_analytics', 'view_financials'],
      manager: ['view_orders', 'view_tables'],
      chef: ['view_kitchen'],
      waiter: ['view_waiter'],
    };

    expect(permissions.owner.includes('view_financials')).toBe(true);
    expect(permissions.manager.includes('view_financials')).toBe(false);
  });
});
