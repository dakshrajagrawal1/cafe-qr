import { describe, it, expect } from 'vitest';
import {
  calculateSubscriptionStatus,
  parsePlanFeatures,
} from '../src/modules/subscription/subscription.service.js';

describe('Subscription Lifecycle & Expiry Engine', () => {
  const now = new Date('2026-11-22T12:00:00Z');

  it('blocks ordering when cafe is pending verification', () => {
    const sub = {
      startsAt: new Date('2026-11-01T00:00:00Z'),
      expiresAt: new Date('2026-12-01T00:00:00Z'),
      graceDays: 3,
      status: 'trial',
    };

    const status = calculateSubscriptionStatus(sub, 'pending_verification', now);
    expect(status.effectiveStatus).toBe('pending_verification');
    expect(status.isOrderingAllowed).toBe(false);
  });

  it('blocks ordering when cafe is suspended', () => {
    const sub = {
      startsAt: new Date('2026-11-01T00:00:00Z'),
      expiresAt: new Date('2026-12-01T00:00:00Z'),
      graceDays: 3,
      status: 'active',
    };

    const status = calculateSubscriptionStatus(sub, 'suspended', now);
    expect(status.effectiveStatus).toBe('suspended');
    expect(status.isOrderingAllowed).toBe(false);
  });

  it('marks active when validity is more than 7 days ahead', () => {
    const sub = {
      startsAt: new Date('2026-11-01T00:00:00Z'),
      expiresAt: new Date('2026-12-10T00:00:00Z'), // ~18 days left
      graceDays: 3,
      status: 'active',
    };

    const status = calculateSubscriptionStatus(sub, 'approved', now);
    expect(status.effectiveStatus).toBe('active');
    expect(status.isOrderingAllowed).toBe(true);
    expect(status.isGracePeriod).toBe(false);
    expect(status.daysRemaining).toBeGreaterThan(7);
  });

  it('marks expiring when validity has 7 or fewer days left', () => {
    const sub = {
      startsAt: new Date('2026-11-01T00:00:00Z'),
      expiresAt: new Date('2026-11-25T00:00:00Z'), // ~3 days left
      graceDays: 3,
      status: 'active',
    };

    const status = calculateSubscriptionStatus(sub, 'approved', now);
    expect(status.effectiveStatus).toBe('expiring');
    expect(status.isOrderingAllowed).toBe(true);
    expect(status.isGracePeriod).toBe(false);
    expect(status.daysRemaining).toBeLessThanOrEqual(7);
  });

  it('CRITICAL: keeps orders working during the grace period (expiry rule)', () => {
    // Expired 1 day ago (2026-11-21), with 3 days grace (ends 2026-11-24)
    const sub = {
      startsAt: new Date('2026-10-21T00:00:00Z'),
      expiresAt: new Date('2026-11-21T00:00:00Z'),
      graceDays: 3,
      status: 'active',
    };

    const status = calculateSubscriptionStatus(sub, 'approved', now);
    expect(status.effectiveStatus).toBe('grace');
    // Orders keep working normally during the grace period!
    expect(status.isOrderingAllowed).toBe(true);
    expect(status.isGracePeriod).toBe(true);
  });

  it('CRITICAL: blocks ordering once grace period has ended', () => {
    // Expired 5 days ago (2026-11-17), with 3 days grace (ended 2026-11-20)
    const sub = {
      startsAt: new Date('2026-10-17T00:00:00Z'),
      expiresAt: new Date('2026-11-17T00:00:00Z'),
      graceDays: 3,
      status: 'active',
    };

    const status = calculateSubscriptionStatus(sub, 'approved', now);
    expect(status.effectiveStatus).toBe('expired');
    // Ordering blocked! Customer still sees menu with ordering unavailable.
    expect(status.isOrderingAllowed).toBe(false);
    expect(status.isGracePeriod).toBe(false);
  });

  it('identifies trial period correctly', () => {
    const sub = {
      startsAt: new Date('2026-11-20T00:00:00Z'),
      expiresAt: new Date('2026-12-04T00:00:00Z'),
      trialEndsAt: new Date('2026-12-04T00:00:00Z'),
      graceDays: 3,
      status: 'trial',
    };

    const status = calculateSubscriptionStatus(sub, 'approved', now);
    expect(status.effectiveStatus).toBe('trial');
    expect(status.isOrderingAllowed).toBe(true);
  });
});

describe('Plan Features Parser', () => {
  it('parses strings into typed numbers, booleans, and strings', () => {
    const rawFeatures = [
      { id: '1', planId: 'p1', featureKey: 'max_tables', featureValue: '25' },
      { id: '2', planId: 'p1', featureKey: 'kitchen_screen', featureValue: 'true' },
      { id: '3', planId: 'p1', featureKey: 'waiter_screen', featureValue: 'false' },
      { id: '4', planId: 'p1', featureKey: 'analytics_level', featureValue: 'advanced' },
    ];

    const parsed = parsePlanFeatures(rawFeatures as any);
    expect(parsed.max_tables).toBe(25);
    expect(parsed.kitchen_screen).toBe(true);
    expect(parsed.waiter_screen).toBe(false);
    expect(parsed.analytics_level).toBe('advanced');
    // Default fallback
    expect(parsed.shared_cart).toBe(false);
  });
});
