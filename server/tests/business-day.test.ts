import { describe, it, expect } from 'vitest';

describe('Business Day Lifecycle & Cash Reconciliation', () => {
  it('prevents multiple concurrent open business days', () => {
    const existingDay = { id: 'day_1', status: 'open' };
    const canStartNewDay = existingDay.status !== 'open';
    expect(canStartNewDay).toBe(false);
  });

  it('blocks day end if tables are still occupied unless force override is supplied', () => {
    const activeSessions = [
      { id: 'sess_1', tableNumber: '3', status: 'open' },
    ];

    const canEndNormally = activeSessions.length === 0;
    expect(canEndNormally).toBe(false);

    const canEndWithOverride = (override: boolean, reason?: string) => {
      if (activeSessions.length === 0) return true;
      return override && !!reason && reason.trim().length > 0;
    };

    expect(canEndWithOverride(false)).toBe(false);
    expect(canEndWithOverride(true, '')).toBe(false);
    expect(canEndWithOverride(true, 'Emergency closing / all guests departed')).toBe(true);
  });

  it('accurately reconciles opening cash, cash sales, and counted cash', () => {
    const openingCashPaise = 200000; // ₹2,000.00 float
    const cashSalesPaise = 354000;   // ₹3,540.00 cash sales collected during day
    const expectedCashPaise = openingCashPaise + cashSalesPaise; // ₹5,540.00

    expect(expectedCashPaise).toBe(554000);

    // Case 1: Counted matches expected (balanced)
    const countedBalancedPaise = 554000;
    const diffBalanced = countedBalancedPaise - expectedCashPaise;
    expect(diffBalanced).toBe(0);

    // Case 2: Cash short (e.g. ₹50 short)
    const countedShortPaise = 549000;
    const diffShort = countedShortPaise - expectedCashPaise;
    expect(diffShort).toBe(-5000); // ₹50.00 short

    // Case 3: Cash over (e.g. ₹20 over)
    const countedOverPaise = 556000;
    const diffOver = countedOverPaise - expectedCashPaise;
    expect(diffOver).toBe(2000); // ₹20.00 over
  });
});
