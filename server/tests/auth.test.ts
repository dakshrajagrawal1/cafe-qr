import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  signCustomerToken,
  verifyCustomerToken,
} from '../src/modules/auth/token.service.js';

describe('Auth Token Service', () => {
  it('generates and verifies valid access token', () => {
    const payload = {
      sub: 'usr_123',
      email: 'owner@test.com',
      role: 'owner' as const,
      cafeId: 'cafe_abc',
      name: 'Test Owner',
    };

    const token = signAccessToken(payload);
    expect(token).toBeDefined();

    const decoded = verifyAccessToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe(payload.sub);
    expect(decoded?.email).toBe(payload.email);
    expect(decoded?.role).toBe(payload.role);
    expect(decoded?.cafeId).toBe(payload.cafeId);
  });

  it('generates and verifies customer token with device token', () => {
    const payload = {
      sub: 'cust_999',
      phone: '+919999999999',
      name: 'John Doe',
      deviceToken: 'device_secret_token_123',
    };

    const token = signCustomerToken(payload);
    expect(token).toBeDefined();

    const decoded = verifyCustomerToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe(payload.sub);
    expect(decoded?.phone).toBe(payload.phone);
    expect(decoded?.deviceToken).toBe(payload.deviceToken);
  });

  it('returns null on invalid token signature', () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
    expect(verifyAccessToken(invalidToken)).toBeNull();
    expect(verifyRefreshToken(invalidToken)).toBeNull();
    expect(verifyCustomerToken(invalidToken)).toBeNull();
  });
});

