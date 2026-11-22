import React, { useState } from 'react';
import { api } from '../services/api.js';
import { useCustomerStore } from '../stores/customerStore.js';

interface CartPageProps {
  onBack: () => void;
  onOrderPlaced: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onBack, onOrderPlaced }) => {
  const { cart, cafe, table, session, setCart } = useCustomerStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderNotes, setOrderNotes] = useState('');

  // Sample extras from design (can be toggled)
  const [extraCheese, setExtraCheese] = useState(false);
  const [extraOlives, setExtraOlives] = useState(false);

  const handleUpdateQty = async (cartItemId: string, newQty: number) => {
    try {
      if (newQty <= 0) {
        await api.removeCartItem(cartItemId);
      } else {
        await api.updateCartItem(cartItemId, { quantity: newQty });
      }
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
      let notes = orderNotes;
      const extras: string[] = [];
      if (extraCheese) extras.push('Extra Cheese (+₹40)');
      if (extraOlives) extras.push('Olives (+₹30)');
      if (extras.length > 0) {
        notes = `${notes ? notes + ' | ' : ''}Extras: ${extras.join(', ')}`;
      }

      await api.placeOrder(notes);
      const updated = await api.getCart();
      setCart(updated.data);
      onOrderPlaced();
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const extrasCostPaise = (extraCheese ? 4000 : 0) + (extraOlives ? 3000 : 0);
  const subtotalPaise = cart.subtotalPaise + extrasCostPaise;
  const gstRate = 0.05; // 5% GST
  const gstPaise = Math.round(subtotalPaise * gstRate);
  const totalPaise = subtotalPaise + gstPaise;

  const defaultPizzaImg = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#ffffff', justifyContent: 'space-between', paddingBottom: 24 }}>
      <div>
        {/* SCREEN 6: TOP HEADER */}
        <header
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: '#ffffff',
          }}
        >
          <button
            onClick={onBack}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              width: 36,
              height: 36,
              borderRadius: 10,
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--dark)',
            }}
          >
            ✕
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--dark)' }}>Your Cart</h2>
        </header>

        <main style={{ padding: '20px' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', padding: '12px 14px', borderRadius: 12, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Cart Line Items */}
          {cart.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🛒</div>
              <p style={{ fontWeight: 600 }}>Your cart is empty.</p>
              <button
                onClick={onBack}
                style={{
                  marginTop: 16,
                  background: 'transparent',
                  color: '#ff6b35',
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: 'underline',
                }}
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {cart.items.map((ci) => (
                <div
                  key={ci.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    borderRadius: 16,
                    border: '1px solid #f1f5f9',
                    background: '#ffffff',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {/* Item Image */}
                  <div style={{ width: 68, height: 68, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
                    <img
                      src={ci.imageUrl || defaultPizzaImg}
                      alt={ci.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  {/* Name and Price */}
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--dark)' }}>{ci.name}</h4>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#475569', display: 'block', marginTop: 2 }}>
                      ₹{Math.round((ci.unitPricePaise || ci.basePricePaise || 0) / 100)}
                    </span>
                    {ci.addedByName && (
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        By {ci.addedByName}
                      </span>
                    )}
                  </div>

                  {/* Stepper & Trash */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="stepper-pill">
                      <button
                        onClick={() => handleUpdateQty(ci.id, ci.quantity - 1)}
                        className="stepper-btn"
                      >
                        −
                      </button>
                      <span className="stepper-value">{ci.quantity}</span>
                      <button
                        onClick={() => handleUpdateQty(ci.id, ci.quantity + 1)}
                        className="stepper-btn"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemove(ci.id)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #f1f5f9',
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        fontSize: 14,
                      }}
                      title="Remove item"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Extras Section */}
              <div style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--dark)', marginBottom: 12 }}>
                  Add Extras
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: `1.5px solid ${extraCheese ? '#ff6b35' : '#f1f5f9'}`,
                      background: extraCheese ? '#fffaf8' : '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="checkbox"
                        checked={extraCheese}
                        onChange={(e) => setExtraCheese(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: '#ff6b35' }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)' }}>Extra Cheese</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>+₹40</span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: `1.5px solid ${extraOlives ? '#ff6b35' : '#f1f5f9'}`,
                      background: extraOlives ? '#fffaf8' : '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="checkbox"
                        checked={extraOlives}
                        onChange={(e) => setExtraOlives(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: '#ff6b35' }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)' }}>Olives</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>+₹30</span>
                  </label>
                </div>
              </div>

              {/* Bill Breakdown Summary */}
              <div
                style={{
                  marginTop: 20,
                  padding: '16px',
                  borderRadius: 16,
                  border: '1px solid #f1f5f9',
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-muted)' }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 600, color: 'var(--dark)' }}>₹{Math.round(subtotalPaise / 100)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-muted)' }}>
                  <span>GST (5%)</span>
                  <span style={{ fontWeight: 600, color: 'var(--dark)' }}>₹{Math.round(gstPaise / 100)}</span>
                </div>
                <div style={{ height: 1, background: '#e2e8f0', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: 'var(--dark)' }}>
                  <span>Total</span>
                  <span style={{ color: '#ff6b35' }}>₹{Math.round(totalPaise / 100)}</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Action Footer */}
      {cart.items.length > 0 && (
        <div style={{ padding: '0 20px' }}>
          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            className="btn-primary"
            style={{ marginBottom: 14 }}
          >
            <span>{loading ? 'Processing...' : 'Proceed to Pay'}</span>
            <span style={{ fontSize: 18 }}>➔</span>
          </button>

          {/* Secure & Safe Payments Footer Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a',
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <span>🛡</span>
            <span>Secure & Safe Payments</span>
          </div>
        </div>
      )}
    </div>
  );
};
