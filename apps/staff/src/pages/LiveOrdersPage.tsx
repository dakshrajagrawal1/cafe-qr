import React, { useEffect, useState } from 'react';
import { staffApi } from '../services/staffApi.js';
import { useSoundAlert } from '../hooks/useSoundAlert.js';

interface LiveOrdersPageProps {
  onOrderCountUpdate: (count: number) => void;
}

export const LiveOrdersPage: React.FC<LiveOrdersPageProps> = ({ onOrderCountUpdate }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'tickets'>('pending');
  const [orders, setOrders] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingOrder, setRejectingOrder] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('Out of stock / kitchen busy');
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);

  // Add dish form state
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [addNotes, setAddNotes] = useState('');

  const { playChime } = useSoundAlert();

  // Polling incoming pending orders & kitchen tickets every 3 seconds
  useEffect(() => {
    let prevPendingIds = new Set<string>();

    async function pollData() {
      try {
        const [ordersRes, ticketsRes] = await Promise.all([
          staffApi.listOrders({ status: 'pending_approval' }),
          staffApi.getKitchenTickets(),
        ]);

        const pendingList = ordersRes.data || [];
        const ticketList = ticketsRes.data || [];

        // Check if there are newly arrived orders
        const hasNewOrder = pendingList.some((o: any) => !prevPendingIds.has(o.id));
        if (hasNewOrder && prevPendingIds.size > 0) {
          playChime();
        }

        prevPendingIds = new Set(pendingList.map((o: any) => o.id));
        setOrders(pendingList);
        setTickets(ticketList);
        onOrderCountUpdate(pendingList.length);
      } catch (err) {
        console.error('Failed to poll orders and tickets:', err);
      } finally {
        setLoading(false);
      }
    }

    pollData();
    const timer = setInterval(pollData, 3000);
    return () => clearInterval(timer);
  }, [playChime, onOrderCountUpdate]);

  const handleApprove = async (orderId: string) => {
    try {
      await staffApi.approveOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      onOrderCountUpdate(orders.length - 1);
      const res = await staffApi.getKitchenTickets();
      setTickets(res.data || []);
    } catch (err: any) {
      alert(err.message || 'Failed to approve order');
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectingOrder) return;
    try {
      await staffApi.rejectOrder(rejectingOrder.id, rejectReason);
      setOrders((prev) => prev.filter((o) => o.id !== rejectingOrder.id));
      onOrderCountUpdate(orders.length - 1);
      setRejectingOrder(null);
    } catch (err: any) {
      alert(err.message || 'Failed to reject order');
    }
  };

  const handleTicketStatusChange = async (ticketId: string, status: 'preparing' | 'ready') => {
    try {
      await staffApi.updateKitchenTicketStatus(ticketId, status);
      const res = await staffApi.getKitchenTickets();
      setTickets(res.data || []);
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket');
    }
  };

  const handleOpenAddDish = async () => {
    try {
      const res = await staffApi.getMenuItems();
      setMenuItems(res.data || []);
      if (res.data?.length > 0) setSelectedItemId(res.data[0].id);
      setShowAddDishModal(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddDishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !selectedItemId) {
      alert('Please select session and item');
      return;
    }

    try {
      await staffApi.addDishToSession(selectedSessionId, {
        itemId: selectedItemId,
        quantity: addQty,
        specialInstructions: addNotes || undefined,
      });
      alert('Dish added to table and routed to kitchen!');
      setShowAddDishModal(false);
      const res = await staffApi.getKitchenTickets();
      setTickets(res.data || []);
    } catch (err: any) {
      alert(err.message || 'Failed to add dish');
    }
  };

  return (
    <div style={{ flex: 1, height: '100vh', overflowY: 'auto', padding: '24px 32px' }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Orders & Kitchen Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Approve incoming orders, track prep status, and mark dishes ready for waiter pickup.
          </p>
        </div>

        <button onClick={handleOpenAddDish} className="btn-secondary">
          + Add Forgotten Dish to Session
        </button>
      </div>

      {/* Sub-view switcher: Pending Approvals vs Kitchen Prep Tickets */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            background: activeTab === 'pending' ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
            color: activeTab === 'pending' ? '#ffffff' : 'var(--text-main)',
            fontWeight: 800,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>Pending Approvals</span>
          {orders.length > 0 && (
            <span
              style={{
                background: activeTab === 'pending' ? 'rgba(0,0,0,0.25)' : '#ef4444',
                color: '#fff',
                fontSize: 11,
                padding: '2px 7px',
                borderRadius: 10,
              }}
            >
              {orders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            background: activeTab === 'tickets' ? 'var(--primary)' : 'rgba(0,0,0,0.06)',
            color: activeTab === 'tickets' ? '#ffffff' : 'var(--text-main)',
            fontWeight: 800,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>Active Prep Tickets (Kitchen Mode OFF/Direct)</span>
          {tickets.length > 0 && (
            <span
              style={{
                background: activeTab === 'tickets' ? 'rgba(0,0,0,0.25)' : '#3b82f6',
                color: '#fff',
                fontSize: 11,
                padding: '2px 7px',
                borderRadius: 10,
              }}
            >
              {tickets.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          Loading orders...
        </div>
      ) : activeTab === 'pending' ? (
        /* ================= PENDING APPROVAL VIEW ================= */
        orders.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              background: '#ffffff',
              borderRadius: 16,
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 12 }}>☕</div>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>No Pending Orders</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
              Incoming orders from QR table scans will appear here instantly.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: 20,
            }}
          >
            {orders.map((ord) => (
              <div
                key={ord.id}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid var(--border)',
                  borderRadius: 14,
                  padding: 20,
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  {/* Header: Table, Order Number, Timer */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      borderBottom: '1px solid #f1f5f9',
                      paddingBottom: 14,
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>
                        Table {ord.table?.tableNumber}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          color: 'var(--text-muted)',
                          display: 'block',
                          marginTop: 2,
                        }}
                      >
                        {ord.orderNumber}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          background: '#fef3c7',
                          color: '#b45309',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        Pending Approval
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          marginTop: 4,
                        }}
                      >
                        {new Date(ord.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '8px 12px',
                      borderRadius: 8,
                      marginBottom: 14,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>Customer: </span>
                    <strong>{ord.customer?.name || 'Guest'}</strong>
                    {ord.customer?.phone && (
                      <span style={{ marginLeft: 8, color: '#0369a1', fontWeight: 600 }}>
                        📞 {ord.customer.phone}
                      </span>
                    )}
                  </div>

                  {/* Dishes list */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      marginBottom: 20,
                    }}
                  >
                    {ord.items.map((item: any) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={item.isVegSnapshot ? 'badge-veg' : 'badge-non-veg'} />
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 700 }}>
                              {item.quantity}x {item.itemNameSnapshot}
                            </span>
                            {item.selectedOptionsSnapshot &&
                              (item.selectedOptionsSnapshot as any[]).length > 0 && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {(item.selectedOptionsSnapshot as any[])
                                    .map((o) => `${o.groupName}: ${o.optionName}`)
                                    .join(', ')}
                                </div>
                              )}
                            {item.specialInstructions && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: '#b45309',
                                  fontStyle: 'italic',
                                  marginTop: 2,
                                }}
                              >
                                "{item.specialInstructions}"
                              </div>
                            )}
                          </div>
                        </div>

                        <span style={{ fontSize: 13, fontWeight: 700 }}>
                          ₹{((item.itemPriceSnapshot * item.quantity) / 100).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setRejectingOrder(ord)}
                    className="btn-danger"
                    style={{ flex: 1 }}
                  >
                    ✕ Reject
                  </button>
                  <button
                    onClick={() => handleApprove(ord.id)}
                    className="btn-primary"
                    style={{ flex: 2 }}
                  >
                    ✓ Approve Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ================= KITCHEN PREP TICKETS VIEW (Manager / Mode OFF) ================= */
        tickets.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              background: '#ffffff',
              borderRadius: 16,
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 12 }}>🍽️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>All Dishes Prepared!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
              No dishes currently waiting in preparation or ready for serving.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 16,
            }}
          >
            {tickets.map((t) => (
              <div
                key={t.id}
                style={{
                  background: '#ffffff',
                  border: `2px solid ${t.sessionColor || 'var(--border)'}`,
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        background: t.sessionColor || '#3b82f6',
                        color: '#fff',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      Table {t.tableNumber}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                      ⏱️ {t.waitingMinutes}m ago
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>
                      {t.quantity}x {t.itemName}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: 4,
                        background:
                          t.status === 'ready'
                            ? '#dcfce7'
                            : t.status === 'preparing'
                            ? '#fef3c7'
                            : '#fee2e2',
                        color:
                          t.status === 'ready'
                            ? '#15803d'
                            : t.status === 'preparing'
                            ? '#b45309'
                            : '#b91c1c',
                      }}
                    >
                      {t.status}
                    </span>
                  </div>

                  {t.specialInstructions && (
                    <div style={{ fontSize: 12, color: '#b45309', marginTop: 6, fontStyle: 'italic' }}>
                      "{t.specialInstructions}"
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  {t.status === 'confirmed' && (
                    <button
                      onClick={() => handleTicketStatusChange(t.id, 'preparing')}
                      className="btn-secondary"
                      style={{ flex: 1, padding: '8px 0', fontSize: 12 }}
                    >
                      Start Prep 👨‍🍳
                    </button>
                  )}
                  {(t.status === 'confirmed' || t.status === 'preparing') && (
                    <button
                      onClick={() => handleTicketStatusChange(t.id, 'ready')}
                      className="btn-primary"
                      style={{ flex: 1, padding: '8px 0', fontSize: 12 }}
                    >
                      Mark Ready ✓
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Reject Reason Modal */}
      {rejectingOrder && (
        <div className="modal-overlay" onClick={() => setRejectingOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
              Reject Order {rejectingOrder.orderNumber}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              The customer will be notified with this reason.
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                Rejection Reason
              </label>
              <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}>
                <option value="Item(s) out of stock">Item(s) out of stock</option>
                <option value="Kitchen at maximum capacity">Kitchen at maximum capacity</option>
                <option value="Closing time reached">Closing time reached</option>
                <option value="Duplicate order placed">Duplicate order placed</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setRejectingOrder(null)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleRejectSubmit} className="btn-danger">
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Forgotten Dish Modal */}
      {showAddDishModal && (
        <div className="modal-overlay" onClick={() => setShowAddDishModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>
              Add Dish Directly to Table
            </h3>

            <form onSubmit={handleAddDishSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  Active Session ID
                </label>
                <input
                  type="text"
                  placeholder="Paste active table session ID"
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  Select Dish
                </label>
                <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — ₹{(item.pricePaise / 100).toFixed(0)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={addQty}
                  onChange={(e) => setAddQty(Number(e.target.value))}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  Kitchen Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extra spicy, serve fast"
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setShowAddDishModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Send to Kitchen ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
