import { describe, it, expect } from 'vitest';
import { injectCafeId } from '../src/middleware/tenant.js';
import type { Request, Response } from 'express';

describe('Tenant Isolation Middleware', () => {
  it('throws UnauthorizedError if req.user is missing', () => {
    const req = {} as Request;
    const res = {} as Response;
    let error: any;
    const next = (err?: any) => { error = err; };

    injectCafeId(req, res, next);
    expect(error).toBeDefined();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('enforces cafeId from JWT for cafe staff and ignores route or body tampering', () => {
    const req = {
      user: {
        id: 'usr_1',
        email: 'staff@cafeA.com',
        role: 'owner',
        cafeId: 'cafe_A',
        name: 'Staff A',
        permissions: null,
      },
      params: { cafeId: 'cafe_B_ATTACKER' },
      body: { cafeId: 'cafe_B_ATTACKER' },
      query: { cafeId: 'cafe_B_ATTACKER' },
    } as unknown as Request;
    const res = {} as Response;
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    injectCafeId(req, res, next);
    expect(nextCalled).toBe(true);
    // Crucial check: cafeId is strictly 'cafe_A' from JWT, NOT the tampered params/body
    expect(req.cafeId).toBe('cafe_A');
  });

  it('allows super_admin to operate across cafes via explicit route params', () => {
    const req = {
      user: {
        id: 'admin_1',
        email: 'admin@platform.com',
        role: 'super_admin',
        cafeId: null,
        name: 'Super Admin',
        permissions: null,
      },
      params: { cafeId: 'cafe_target' },
    } as unknown as Request;
    const res = {} as Response;
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    injectCafeId(req, res, next);
    expect(nextCalled).toBe(true);
    expect(req.cafeId).toBe('cafe_target');
  });

  it('rejects staff user who has no cafeId assigned', () => {
    const req = {
      user: {
        id: 'usr_orphan',
        email: 'orphan@test.com',
        role: 'manager',
        cafeId: null,
        name: 'Orphan Staff',
        permissions: null,
      },
      params: {},
    } as unknown as Request;
    const res = {} as Response;
    let error: any;
    const next = (err?: any) => { error = err; };

    injectCafeId(req, res, next);
    expect(error).toBeDefined();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });
});
