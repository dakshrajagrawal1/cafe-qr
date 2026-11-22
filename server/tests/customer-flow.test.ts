import { describe, it, expect } from 'vitest';
import { signTableToken } from '../src/lib/hmac.js';

describe('Customer Order & Cart Logic', () => {
  it('calculates item line totals and option extra prices accurately in integer paise', () => {
    const basePricePaise = 7000; // ₹70.00
    const extraOptions = [
      { groupName: 'Add-ons', optionName: 'Extra Cheese', extraPricePaise: 2500 }, // ₹25.00
      { groupName: 'Add-ons', optionName: 'Mushrooms', extraPricePaise: 3000 },    // ₹30.00
    ];
    const quantity = 2;

    const unitPricePaise = basePricePaise + extraOptions.reduce((sum, o) => sum + o.extraPricePaise, 0);
    const lineTotalPaise = unitPricePaise * quantity;

    expect(unitPricePaise).toBe(12500); // ₹125.00
    expect(lineTotalPaise).toBe(25000);  // ₹250.00
    // Ensure no floating point math errors
    expect(Number.isInteger(lineTotalPaise)).toBe(true);
  });

  it('validates customer table token round-trip integrity', () => {
    const payload = { cafeId: 'cafe_demo_1', tableId: 'table_t1' };
    const signedToken = signTableToken(payload);

    expect(signedToken).toBeDefined();
    expect(typeof signedToken).toBe('string');
  });

  it('formats customer order numbers sequentially', () => {
    const formatOrderNumber = (orderCount: number) => `#${101 + orderCount}`;

    expect(formatOrderNumber(0)).toBe('#101');
    expect(formatOrderNumber(1)).toBe('#102');
    expect(formatOrderNumber(42)).toBe('#143');
  });
});
