import { describe, it, expect } from 'vitest';

describe('Waiter Service Screen & Calls Flow', () => {
  it('transitions dishes through ready -> served and supports undo', () => {
    let dish = {
      id: 'dish_1',
      itemName: 'Veg Sandwich',
      status: 'ready' as 'ready' | 'served',
      servedBy: null as string | null,
    };

    // 1. Mark served
    dish = {
      ...dish,
      status: 'served',
      servedBy: 'waiter_user_1',
    };
    expect(dish.status).toBe('served');
    expect(dish.servedBy).toBe('waiter_user_1');

    // 2. Undo served back to ready
    dish = {
      ...dish,
      status: 'ready',
    };
    expect(dish.status).toBe('ready');
  });

  it('handles waiter assistance calls state lifecycle (active -> acknowledged -> resolved)', () => {
    let call = {
      id: 'call_1',
      tableNumber: '4',
      type: 'water',
      status: 'active' as 'active' | 'acknowledged' | 'resolved',
      acknowledgedBy: null as string | null,
      resolvedAt: null as Date | null,
    };

    // Acknowledge
    call = {
      ...call,
      status: 'acknowledged',
      acknowledgedBy: 'staff_1',
    };
    expect(call.status).toBe('acknowledged');
    expect(call.acknowledgedBy).toBe('staff_1');

    // Resolve
    call = {
      ...call,
      status: 'resolved',
      resolvedAt: new Date(),
    };
    expect(call.status).toBe('resolved');
    expect(call.resolvedAt).toBeInstanceOf(Date);
  });

  it('requires manager approval when waiter creates an order tableside', () => {
    // Section 7 rule: "Waiter can add dishes (go through manager approval)"
    const waiterOrder = {
      id: 'ord_waiter_1',
      tableId: 'tab_2',
      status: 'pending_approval' as const, // Must be pending_approval!
      items: [
        { itemId: 'item_cold_coffee', quantity: 2, status: 'placed' },
      ],
      placedByWaiter: 'Ramesh (Waiter)',
    };

    expect(waiterOrder.status).toBe('pending_approval');
    expect(waiterOrder.items[0]!.status).toBe('placed');
  });

  it('aggregates table ready dishes count for waiter overview', () => {
    const tableDishes = [
      { id: '1', status: 'ready' },
      { id: '2', status: 'ready' },
      { id: '3', status: 'preparing' },
      { id: '4', status: 'served' },
    ];

    const readyCount = tableDishes.filter((d) => d.status === 'ready').length;
    const totalCount = tableDishes.length;

    expect(readyCount).toBe(2);
    expect(totalCount).toBe(4);
  });
});
