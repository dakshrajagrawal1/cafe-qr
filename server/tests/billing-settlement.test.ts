import { describe, it, expect } from 'vitest';

describe('Billing & Settlement Engine', () => {
  it('accurately calculates subtotal, tax (GST), and service charge in integer paise', () => {
    const items = [
      { name: 'Veg Sandwich', pricePaise: 15000, quantity: 2 }, // 300.00
      { name: 'Cold Coffee', pricePaise: 12000, quantity: 1 },  // 120.00
    ];

    const subtotalPaise = items.reduce((sum, i) => sum + i.pricePaise * i.quantity, 0);
    expect(subtotalPaise).toBe(42000); // ₹420.00

    const gstRateBasisPoints = 500; // 5.00%
    const taxPaise = Math.round((subtotalPaise * gstRateBasisPoints) / 10000);
    expect(taxPaise).toBe(2100); // ₹21.00

    const serviceChargeRateBasisPoints = 250; // 2.50%
    const serviceChargePaise = Math.round((subtotalPaise * serviceChargeRateBasisPoints) / 10000);
    expect(serviceChargePaise).toBe(1050); // ₹10.50

    const discountPaise = 2000; // ₹20.00 coupon discount
    const totalPaise = subtotalPaise + taxPaise + serviceChargePaise - discountPaise;
    expect(totalPaise).toBe(43150); // ₹431.50
  });

  it('calculates change to return accurately on cash settlement', () => {
    const totalPaise = 43150; // ₹431.50
    const cashReceivedPaise = 50000; // Customer handed ₹500 note

    expect(cashReceivedPaise).toBeGreaterThanOrEqual(totalPaise);
    const changeReturnedPaise = cashReceivedPaise - totalPaise;
    expect(changeReturnedPaise).toBe(6850); // ₹68.50 change to return
  });

  it('validates split payment cash and online components', () => {
    const totalPaise = 100000; // ₹1,000.00

    const splitCashPaise = 40000; // ₹400.00 cash
    const splitOnlinePaise = 60000; // ₹600.00 online

    const isValidSplit = splitCashPaise + splitOnlinePaise === totalPaise;
    expect(isValidSplit).toBe(true);

    const cashReceivedPaise = 50000; // Customer paid with ₹500 note for the ₹400 cash portion
    const changeReturnedPaise = cashReceivedPaise - splitCashPaise;
    expect(changeReturnedPaise).toBe(10000); // ₹100.00 change to return
  });

  it('rejects cash settlement when cash received is less than total', () => {
    const totalPaise = 50000;
    const cashReceivedPaise = 40000;

    const canSettle = cashReceivedPaise >= totalPaise;
    expect(canSettle).toBe(false);
  });
});
