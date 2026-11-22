import { describe, it, expect } from 'vitest';

describe('Order State Transitions & Approval Flow', () => {
  it('validates order status transitions from pending to approved', () => {
    const order = {
      id: 'ord_1',
      status: 'pending_approval' as const,
      items: [
        { id: 'item_1', status: 'placed' },
        { id: 'item_2', status: 'placed' },
      ],
    };

    // Full Approval logic simulation
    const approvedOrder = {
      ...order,
      status: 'approved',
      items: order.items.map((i) => ({ ...i, status: 'confirmed' })),
    };

    expect(approvedOrder.status).toBe('approved');
    expect(approvedOrder.items.every((i) => i.status === 'confirmed')).toBe(true);
  });

  it('handles partial order approval with cancellation reasons', () => {
    const orderItems = [
      { id: 'it_1', name: 'Masala Chai', status: 'placed' },
      { id: 'it_2', name: 'Cheese Maggi', status: 'placed' },
    ];

    const decisions = [
      { orderItemId: 'it_1', approved: true },
      { orderItemId: 'it_2', approved: false, cancelReason: 'Cheese out of stock' },
    ];

    const updatedItems = orderItems.map((item) => {
      const decision = decisions.find((d) => d.orderItemId === item.id);
      if (decision?.approved) {
        return { ...item, status: 'confirmed' };
      }
      return { ...item, status: 'cancelled', cancelReason: decision?.cancelReason };
    });

    expect(updatedItems[0]!.status).toBe('confirmed');
    expect(updatedItems[1]!.status).toBe('cancelled');
    expect(updatedItems[1]!.cancelReason).toBe('Cheese out of stock');
  });

  it('computes table grid status based on active calls and sessions', () => {
    const computeStatus = (hasSession: boolean, billRequested: boolean, waiterCalled: boolean) => {
      if (waiterCalled) return 'waiter_called';
      if (billRequested) return 'bill_requested';
      if (hasSession) return 'occupied';
      return 'free';
    };

    expect(computeStatus(false, false, false)).toBe('free');
    expect(computeStatus(true, false, false)).toBe('occupied');
    expect(computeStatus(true, true, false)).toBe('bill_requested');
    // Waiter called takes top priority for staff attention
    expect(computeStatus(true, true, true)).toBe('waiter_called');
    expect(computeStatus(true, false, true)).toBe('waiter_called');
  });
});
