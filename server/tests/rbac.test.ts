import { describe, it, expect } from 'vitest';
import { requireRole, requirePermission } from '../src/middleware/rbac.js';
import type { Request, Response } from 'express';

describe('RBAC & Permission Checks Middleware', () => {
  it('requireRole allows matched role', () => {
    const middleware = requireRole('owner', 'manager');
    const req = {
      user: { id: 'u1', role: 'owner' },
    } as Request;
    let nextCalled = false;
    middleware(req, {} as Response, (err) => {
      expect(err).toBeUndefined();
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
  });

  it('requireRole rejects unmatched role with 403 Forbidden', () => {
    const middleware = requireRole('owner');
    const req = {
      user: { id: 'u1', role: 'waiter' },
    } as Request;
    let error: any;
    middleware(req, {} as Response, (err) => {
      error = err;
    });
    expect(error).toBeDefined();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });

  it('requirePermission always allows owner and super_admin', async () => {
    const middleware = requirePermission('can_edit_menu');
    const reqOwner = {
      user: { id: 'u1', role: 'owner', permissions: {} },
    } as Request;
    let nextOwner = false;
    await middleware(reqOwner, {} as Response, (err) => {
      expect(err).toBeUndefined();
      nextOwner = true;
    });
    expect(nextOwner).toBe(true);

    const reqAdmin = {
      user: { id: 'u2', role: 'super_admin' },
    } as Request;
    let nextAdmin = false;
    await middleware(reqAdmin, {} as Response, (err) => {
      expect(err).toBeUndefined();
      nextAdmin = true;
    });
    expect(nextAdmin).toBe(true);
  });

  it('requirePermission checks manager permission toggles', async () => {
    const middleware = requirePermission('can_edit_menu');

    // Manager with permission enabled
    const reqAllowed = {
      user: {
        id: 'mgr_1',
        role: 'manager',
        permissions: { can_edit_menu: true },
      },
    } as Request;
    let nextAllowed = false;
    await middleware(reqAllowed, {} as Response, (err) => {
      expect(err).toBeUndefined();
      nextAllowed = true;
    });
    expect(nextAllowed).toBe(true);

    // Manager with permission disabled
    const reqDenied = {
      user: {
        id: 'mgr_2',
        role: 'manager',
        permissions: { can_edit_menu: false },
      },
    } as Request;
    let error: any;
    await middleware(reqDenied, {} as Response, (err) => {
      error = err;
    });
    expect(error).toBeDefined();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });
});
