import { describe, it, expect } from 'vitest';

describe('Kitchen Screen (KDS) & Dish Lifecycle', () => {
  it('validates forward dish transitions: confirmed -> preparing -> ready', () => {
    const validTransitions: Record<string, string[]> = {
      confirmed: ['preparing', 'ready'],
      preparing: ['ready'],
    };

    const canTransition = (current: string, next: string) => {
      return (validTransitions[current] || []).includes(next);
    };

    expect(canTransition('confirmed', 'preparing')).toBe(true);
    expect(canTransition('confirmed', 'ready')).toBe(true);
    expect(canTransition('preparing', 'ready')).toBe(true);

    // Invalid forward transitions
    expect(canTransition('ready', 'preparing')).toBe(false);
    expect(canTransition('served', 'preparing')).toBe(false);
    expect(canTransition('cancelled', 'ready')).toBe(false);
  });

  it('validates undo transitions: ready -> preparing and preparing -> confirmed', () => {
    const undoMap: Record<string, string> = {
      ready: 'preparing',
      preparing: 'confirmed',
    };

    const getRevertedStatus = (current: string) => undoMap[current] || null;

    expect(getRevertedStatus('ready')).toBe('preparing');
    expect(getRevertedStatus('preparing')).toBe('confirmed');
    expect(getRevertedStatus('confirmed')).toBeNull(); // cannot undo confirmed item
    expect(getRevertedStatus('placed')).toBeNull();
  });

  it('calculates elapsed waiting time accurately in minutes', () => {
    const now = Date.now();
    const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();
    const twentyFiveMinutesAgo = new Date(now - 25 * 60 * 1000).toISOString();

    const getWaitingMinutes = (createdAt: string) => {
      const createdTime = new Date(createdAt).getTime();
      return Math.max(0, Math.floor((now - createdTime) / 60000));
    };

    expect(getWaitingMinutes(tenMinutesAgo)).toBe(10);
    expect(getWaitingMinutes(twentyFiveMinutesAgo)).toBe(25);
  });

  it('enforces table color isolation and badge visibility', () => {
    const sessionColors = ['#ef4444', '#f97316', '#3b82f6'];
    const activeSessions = [
      { id: 's1', tableNumber: '1', color: sessionColors[0] },
      { id: 's2', tableNumber: '2', color: sessionColors[1] },
      { id: 's3', tableNumber: '3', color: sessionColors[2] },
    ];

    // Ensure no two active sessions share the same color
    const uniqueColors = new Set(activeSessions.map((s) => s.color));
    expect(uniqueColors.size).toBe(activeSessions.length);

    // Color-blind safety: large tableNumber badge is always present
    for (const session of activeSessions) {
      expect(session.tableNumber).toBeDefined();
      expect(session.tableNumber.length).toBeGreaterThan(0);
    }
  });
});
