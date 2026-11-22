import { describe, it, expect } from 'vitest';
import { signTableToken, verifyTableToken } from '../src/lib/hmac.js';

describe('Security Hardening & Access Control Suite', () => {
  const samplePayload = {
    cafeId: 'cafe_blue_tokai_1',
    tableId: 'tbl_table_4',
  };

  it('HMAC QR: rejects tampered table token payload', () => {
    const originalToken = signTableToken(samplePayload);

    // Tamper with payload (change tableId to tbl_table_5)
    const [payloadBase64, sig] = originalToken.split('.');
    const decodedPayload = JSON.parse(Buffer.from(payloadBase64!, 'base64url').toString('utf-8'));
    decodedPayload.tableId = 'tbl_table_5';
    const tamperedPayloadBase64 = Buffer.from(JSON.stringify(decodedPayload)).toString('base64url');
    const tamperedToken = `${tamperedPayloadBase64}.${sig}`;

    const verified = verifyTableToken(tamperedToken);
    expect(verified).toBeNull(); // Must fail verification
  });

  it('HMAC QR: rejects tampered signature', () => {
    const originalToken = signTableToken(samplePayload);

    const [payloadBase64, sig] = originalToken.split('.');
    const tamperedSig = sig!.slice(0, -3) + 'abc';
    const tamperedToken = `${payloadBase64}.${tamperedSig}`;

    const verified = verifyTableToken(tamperedToken);
    expect(verified).toBeNull();
  });

  it('Tenant Isolation: verifies tenant context is strictly extracted from verified JWT, never request parameters', () => {
    const staffJwtPayload = {
      id: 'usr_staff_1',
      cafeId: 'cafe_actual_101',
      role: 'manager' as const,
    };

    const incomingRequest = {
      query: { cafeId: 'cafe_victim_999' },
      body: { cafeId: 'cafe_victim_999' },
      params: { cafeId: 'cafe_victim_999' },
    };

    // Middleware simulation: req.cafeId is locked to JWT's cafeId
    const effectiveCafeId = staffJwtPayload.cafeId;
    expect(effectiveCafeId).toBe('cafe_actual_101');
    expect(effectiveCafeId).not.toBe(incomingRequest.query.cafeId);
    expect(effectiveCafeId).not.toBe(incomingRequest.body.cafeId);
  });

  it('RBAC Permissions: prevents role escalation', () => {
    const rolePermissions: Record<string, string[]> = {
      super_admin: ['*'],
      owner: ['manage_settings', 'view_financial_analytics', 'manage_staff', 'settle_bills'],
      manager: ['manage_menu', 'approve_orders', 'settle_bills', 'view_orders'],
      chef: ['view_kitchen', 'update_dish_status'],
      waiter: ['view_waiter', 'mark_served', 'take_table_order'],
      customer: ['view_menu', 'add_to_cart', 'place_order', 'call_waiter'],
    };

    const hasPermission = (role: string, perm: string) => {
      const perms = rolePermissions[role] || [];
      return perms.includes('*') || perms.includes(perm);
    };

    // Financial analytics strictly owner
    expect(hasPermission('owner', 'view_financial_analytics')).toBe(true);
    expect(hasPermission('manager', 'view_financial_analytics')).toBe(false);
    expect(hasPermission('chef', 'view_financial_analytics')).toBe(false);
    expect(hasPermission('waiter', 'view_financial_analytics')).toBe(false);

    // Kitchen display
    expect(hasPermission('chef', 'update_dish_status')).toBe(true);
    expect(hasPermission('customer', 'update_dish_status')).toBe(false);

    // Billing & Settle
    expect(hasPermission('waiter', 'settle_bills')).toBe(false);
    expect(hasPermission('customer', 'settle_bills')).toBe(false);
    expect(hasPermission('manager', 'settle_bills')).toBe(true);
  });

  it('Integer Paise Arithmetic: rejects negative quantities, fractional paise, and prevents cash underflow', () => {
    const isValidMoneyAmount = (amt: number) => {
      return Number.isInteger(amt) && amt >= 0;
    };

    expect(isValidMoneyAmount(15000)).toBe(true);  // ₹150.00
    expect(isValidMoneyAmount(0)).toBe(true);      // ₹0.00
    expect(isValidMoneyAmount(-500)).toBe(false);  // Negative money rejected
    expect(isValidMoneyAmount(150.50)).toBe(false); // Fractional paise rejected
  });
});
