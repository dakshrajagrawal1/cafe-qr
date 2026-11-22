import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useCustomerStore } from '../stores/customerStore.js';
import { CallWaiterModal } from '../components/CallWaiterModal.js';

interface OrderStatusPageProps {
  onBackToMenu: () => void;
}

export const OrderStatusPage: React.FC<OrderStatusPageProps> = ({ onBackToMenu }) => {
  const { activeOrders, setActiveOrders, table, cafe, session } = useCustomerStore();
  const [loading, setLoading] = useState(false);
  const [showWaiterModal, setShowWaiterModal] = useState(false);
  const [billRequested, setBillRequested] = useState(false);

  // Poll orders status every 3 seconds
  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await api.getSessionOrders();
        setActiveOrders(res.data);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      }
    }

    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [setActiveOrders]);

  const handleRequestBill = async () => {
    try {
      await api.callWaiter('bill', 'Customer requested final bill');
      setBillRequested(true);
    } catch (err: any) {
      alert(err.message || 'Failed to request bill');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'placed':
        return { label: 'Placed', bg: '#f1f5f9', color: '#475569' };
      case 'confirmed':
        return { label: 'Confirmed', bg: '#e0f2fe', color: '#0369a1' };
      case 'preparing':
        return { label: 'Preparing', bg: '#fef3c7', color: '#b45309' };
      case 'ready':
        return { label: 'Ready', bg: '#dcfce7', color: '#15803d' };
      case 'served':
        return { label: 'Served', bg: '#f0fdf4', color: '#166534' };
      case 'cancelled':
        return { label: 'Cancelled', bg: '#fee2e2', color: '#dc2626' };
      default:
        return { label: status, bg: '#f1f5f9', color: '#475569' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'space-between', paddingBottom: 100 }}>
      <div>
        <header style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onBackToMenu} style={{ background: '#f1f5f9', width: 36, height: 36, borderRadius: 10 }}>
              ←
            </button>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Table {table?.tableNumber} Orders</h2>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Live Kitchen Tracking</span>
            </div>
          </div>

          <button
            onClick={() => setShowWaiterModal(true)}
            style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}
          >
            🛎️ Waiter
          </button>
        </header>

        <main style={{ padding: '20px' }}>
          {billRequested && (
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 16px', borderRadius: 12, fontSize: 14, marginBottom: 16 }}>
              🧾 <strong>Bill Requested!</strong> A waiter is bringing your final bill to Table {table?.tableNumber}.
            </div>
          )}

          {activeOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <p>No orders placed in this session yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {activeOrders.map((ord: any) => {
                const isPending = ord.status === 'pending_approval';

                return (
                  <div
                    key={ord.id}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 14,
                      padding: 16,
                      background: '#ffffff',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: 10, marginBottom: 12 }}>
                      <div>
                        <span style={{ fontSize: 16, fontWeight: 800 }}>{ord.orderNumber}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                          {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {isPending ? (
                        <span style={{ fontSize: 12, fontWeight: 700, background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: 20 }}>
                          ⏳ Waiting for cafe to confirm
                        </span>
                      ) : ord.status === 'rejected' ? (
                        <span style={{ fontSize: 12, fontWeight: 700, background: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: 20 }}>
                          Rejected
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 700, background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: 20 }}>
                          ✓ Confirmed
                        </span>
                      )}
                    </div>

                    {/* Per-dish live progress tracker */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {ord.items.map((item: any) => {
                        const badge = getStatusBadge(item.status);

                        return (
                          <div
                            key={item.id}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className={item.isVegSnapshot ? 'badge-veg' : 'badge-non-veg'} />
                              <span style={{ fontSize: 14, fontWeight: 600 }}>
                                {item.quantity}x {item.itemNameSnapshot}
                              </span>
                            </div>

                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                background: badge.bg,
                                color: badge.color,
                                padding: '3px 8px',
                                borderRadius: 6,
                              }}
                            >
                              {badge.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Floating Bottom Action Bar */}
      <div className="bottom-bar">
        <button
          onClick={onBackToMenu}
          className="btn-secondary"
          style={{ flex: 1 }}
        >
          + Add More Items
        </button>

        <button
          onClick={handleRequestBill}
          disabled={billRequested}
          className="btn-primary"
          style={{ flex: 1 }}
        >
          {billRequested ? 'Bill Requested ✓' : 'Request Bill / Settle'}
        </button>
      </div>

      {showWaiterModal && (
        <CallWaiterModal onClose={() => setShowWaiterModal(false)} />
      )}
    </div>
  );
};
