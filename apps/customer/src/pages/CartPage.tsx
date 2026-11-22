import React, { useState } from 'react';
import { api } from '../services/api.js';
import { useCustomerStore } from '../stores/customerStore.js';

interface CartPageProps {
  onBack: () => void;
  onOrderPlaced: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onBack, onOrderPlaced }) => {
  const { cart, cafe, table, session, setCart, customer } = useCustomerStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentOption, setPaymentOption] = useState<'counter' | 'online'>('counter');
  const [orderNotes, setOrderNotes] = useState('');

  const handleUpdateQty = async (cartItemId: string, newQty: number) => {
    try {
      await api.updateCartItem(cartItemId, { quantity: newQty });
      const updated = await api.getCart();
      setCart(updated.data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemove = async (cartItemId: string) => {
    try {
      await api.removeCartItem(cartItemId);
      const updated = await api.getCart();
      setCart(updated.data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePlaceOrder = async () => {
    setError(null);
    setLoading(true);

    try {
      await api.placeOrder(orderNotes);
      // Refresh cart (now empty)
      const updated = await api.getCart();
      setCart(updated.data);
      onOrderPlaced();
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'space-between', paddingBottom: 110 }}>
      <div>
        {/* Header */}
        <header style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: '#f1f5f9', width: 36, height: 36, borderRadius: 10, fontSize: 16 }}>
            ←
          </button>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Confirm Order</h2>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Table {table?.tableNumber} • {cart.totalItems} Items
            </div>
          </div>
        </header>

        <main style={{ padding: '20px' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', padding: '12px 14px', borderRadius: 10, fontSize: 14, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Table Binding Notice */}
          <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block' }}>Ordering for</span>
                <span style={{ fontSize: 16, fontWeight: 800 }}>Table {table?.tableNumber}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block' }}>Table Session PIN</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 4 }}>
                  {session?.pin}
                </span>
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
              Table is locked to your QR scan and cannot be changed manually.
            </p>
          </div>

          {/* Cart Items List */}
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Items in Shared Cart</h3>

          {cart.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <p>Your cart is currently empty.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cart.items.map((ci) => (
                <div
                  key={ci.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: 12,
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    background: '#ffffff',
                  }}
                >
                  <div style={{ flex: 1, paddingRight: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={ci.isVeg ? 'badge-veg' : 'badge-non-veg'} />
                      <h4 style={{ fontSize: 14, fontWeight: 700 }}>{ci.name}</h4>
                    </div>

                    {/* Options list */}
                    {ci.selectedOptions && (ci.selectedOptions as any[]).length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {(ci.selectedOptions as any[]).map((o) => `${o.groupName}: ${o.optionName}`).join(' | ')}
                      </div>
                    )}

                    {/* Added by badge */}
                    <div style={{ marginTop: 4 }}>
                      <span style={{ fontSize: 11, background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4 }}>
                        Added by {ci.addedByName}
                      </span>
                    </div>

                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--dark)', marginTop: 4 }}>
                      ₹{(ci.lineTotalPaise / 100).toFixed(0)}
                    </div>
                  </div>

                  {/* Quantity controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => handleUpdateQty(ci.id, ci.quantity - 1)}
                      style={{ width: 28, height: 28, background: '#f1f5f9', borderRadius: 6, fontWeight: 700 }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: 14, fontWeight: 700, width: 20, textAlign: 'center' }}>
                      {ci.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQty(ci.id, ci.quantity + 1)}
                      style={{ width: 28, height: 28, background: '#f1f5f9', borderRadius: 6, fontWeight: 700 }}
                    >
                      +
                    </button>
                    <button
                      onClick={() => handleRemove(ci.id)}
                      style={{ width: 28, height: 28, background: '#fee2e2', color: '#dc2626', borderRadius: 6, marginLeft: 4 }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payment Preference */}
          <div style={{ marginTop: 24 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Payment Method</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cafe?.allowPayAtEnd && (
                <label
                  onClick={() => setPaymentOption('counter')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 12,
                    border: `1.5px solid ${paymentOption === 'counter' ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 10,
                    background: paymentOption === 'counter' ? 'var(--primary-light)' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="payOption"
                    checked={paymentOption === 'counter'}
                    onChange={() => {}}
                    style={{ width: 'auto' }}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Pay at counter / Pay at end</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pay cash or UPI after eating when bill is requested</div>
                  </div>
                </label>
              )}

              <label
                onClick={() => setPaymentOption('online')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  border: `1.5px solid ${paymentOption === 'online' ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 10,
                  background: paymentOption === 'online' ? 'var(--primary-light)' : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="payOption"
                  checked={paymentOption === 'online'}
                  onChange={() => {}}
                  style={{ width: 'auto' }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Pay Online Now</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>UPI, Cards, NetBanking (instant confirmation)</div>
                </div>
              </label>
            </div>
          </div>
        </main>
      </div>

      {/* Fixed Bottom Bar */}
      {cart.totalItems > 0 && (
        <div className="bottom-bar">
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Amount</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--dark)' }}>
              ₹{(cart.subtotalPaise / 100).toFixed(2)}
            </div>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            className="btn-primary"
            style={{ width: 'auto', padding: '14px 28px' }}
          >
            {loading ? 'Placing Order...' : 'Place Order ➔'}
          </button>
        </div>
      )}
    </div>
  );
};
