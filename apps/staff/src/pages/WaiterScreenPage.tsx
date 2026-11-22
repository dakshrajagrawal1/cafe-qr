import React, { useState, useEffect, useRef } from 'react';
import { staffApi } from '../services/staffApi.js';
import { useSoundAlert } from '../hooks/useSoundAlert.js';

interface WaiterTable {
  id: string;
  tableNumber: string;
  label?: string | null;
  capacity?: number | null;
  isOccupied: boolean;
  sessionId?: string | null;
  sessionColor?: string | null;
  sessionStatus?: string | null;
  readyDishesCount: number;
  totalDishesCount: number;
  activeCallsCount: number;
  latestCall?: {
    id: string;
    type: 'help' | 'water' | 'bill' | 'other';
    status: 'active' | 'acknowledged';
    message?: string | null;
    createdAt: string;
  } | null;
}

interface TableDish {
  id: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  itemName: string;
  itemPricePaise: number;
  quantity: number;
  isVeg: boolean;
  selectedOptions?: any[];
  specialInstructions?: string | null;
  status: 'placed' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  statusChangedAt?: string | null;
  createdAt: string;
  servedBy?: string | null;
}

interface WaiterCall {
  id: string;
  tableId: string;
  tableNumber: string;
  tableLabel?: string | null;
  sessionId: string;
  sessionColor: string;
  type: 'help' | 'water' | 'bill' | 'other';
  message?: string | null;
  status: 'active' | 'acknowledged';
  createdAt: string;
}

interface MenuItem {
  id: string;
  name: string;
  pricePaise: number;
  isVeg: boolean;
}

export const WaiterScreenPage: React.FC = () => {
  const [tables, setTables] = useState<WaiterTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [dishes, setDishes] = useState<TableDish[]>([]);
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDishes, setLoadingDishes] = useState(false);

  // Take order modal state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderDraft, setOrderDraft] = useState<Record<string, number>>({});
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const prevCallsCountRef = useRef(0);
  const { playAlert } = useSoundAlert();

  const fetchTablesAndCalls = async () => {
    try {
      const [tablesRes, callsRes] = await Promise.all([
        staffApi.getWaiterTables(),
        staffApi.getWaiterCalls(),
      ]);

      const tableList: WaiterTable[] = tablesRes.data || [];
      const callList: WaiterCall[] = callsRes.data || [];

      // Check if new waiter call arrived
      if (callList.length > prevCallsCountRef.current && prevCallsCountRef.current > 0) {
        playAlert();
      }
      prevCallsCountRef.current = callList.length;

      setTables(tableList);
      setCalls(callList);

      // Auto-select first occupied table or table with ready dishes if none selected
      if (!selectedTableId && tableList.length > 0) {
        const priorityTable =
          tableList.find((t) => t.readyDishesCount > 0) ||
          tableList.find((t) => t.isOccupied) ||
          tableList[0];
        setSelectedTableId(priorityTable.id);
      }
    } catch (err: any) {
      console.error('Error fetching waiter data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableDishes = async (tableId: string) => {
    setLoadingDishes(true);
    try {
      const res = await staffApi.getWaiterTableDishes(tableId);
      setDishes(res.data?.dishes || []);
    } catch (err: any) {
      console.error('Error fetching table dishes:', err);
    } finally {
      setLoadingDishes(false);
    }
  };

  useEffect(() => {
    fetchTablesAndCalls();
    const interval = setInterval(fetchTablesAndCalls, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedTableId) {
      fetchTableDishes(selectedTableId);
      const interval = setInterval(() => fetchTableDishes(selectedTableId), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedTableId]);

  const handleMarkServed = async (dishId: string) => {
    try {
      await staffApi.markDishServed(dishId);
      if (selectedTableId) {
        await fetchTableDishes(selectedTableId);
        await fetchTablesAndCalls();
      }
    } catch (err: any) {
      alert(`Error marking served: ${err.message}`);
    }
  };

  const handleUndoServed = async (dishId: string) => {
    const reason = prompt('Reason for reverting served dish:');
    if (reason === null) return;
    try {
      await staffApi.undoDishServed(dishId, reason || 'Reverted by waiter');
      if (selectedTableId) {
        await fetchTableDishes(selectedTableId);
        await fetchTablesAndCalls();
      }
    } catch (err: any) {
      alert(`Error reverting dish: ${err.message}`);
    }
  };

  const handleAcknowledgeCall = async (callId: string) => {
    try {
      await staffApi.acknowledgeWaiterCall(callId);
      await fetchTablesAndCalls();
    } catch (err: any) {
      alert(`Error acknowledging call: ${err.message}`);
    }
  };

  const handleResolveCall = async (callId: string) => {
    try {
      await staffApi.resolveWaiterCall(callId);
      await fetchTablesAndCalls();
    } catch (err: any) {
      alert(`Error clearing call: ${err.message}`);
    }
  };

  const handleOpenOrderModal = async () => {
    try {
      const res = await staffApi.getMenuItems();
      setMenuItems(res.data || []);
      setOrderDraft({});
      setShowOrderModal(true);
    } catch (err: any) {
      alert(`Error loading menu items: ${err.message}`);
    }
  };

  const handleSubmitWaiterOrder = async () => {
    if (!selectedTableId) return;

    const itemsToSubmit = Object.entries(orderDraft)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, quantity]) => ({ itemId, quantity }));

    if (itemsToSubmit.length === 0) {
      alert('Please select at least one item');
      return;
    }

    setSubmittingOrder(true);
    try {
      await staffApi.waiterCreateOrder({
        tableId: selectedTableId,
        items: itemsToSubmit,
      });
      alert('Order sent to manager for approval!');
      setShowOrderModal(false);
      setOrderDraft({});
      await fetchTableDishes(selectedTableId);
      await fetchTablesAndCalls();
    } catch (err: any) {
      alert(`Failed to place order: ${err.message}`);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const readyDishes = dishes.filter((d) => d.status === 'ready');
  const kitchenDishes = dishes.filter((d) => ['confirmed', 'preparing', 'placed'].includes(d.status));
  const servedDishes = dishes.filter((d) => d.status === 'served');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0f172a',
        color: '#f8fafc',
        overflow: 'hidden',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          padding: '14px 20px',
          background: '#1e293b',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            🤵
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Waiter Service View</h1>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Mobile-first table service & calls
            </span>
          </div>
        </div>

        {selectedTable && (
          <button
            onClick={handleOpenOrderModal}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              background: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>+</span> Take Order (T-{selectedTable.tableNumber})
          </button>
        )}
      </header>

      {/* Active Waiter Calls Banner */}
      {calls.length > 0 && (
        <div
          style={{
            background: '#b91c1c',
            color: '#ffffff',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            overflowX: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 900, fontSize: 13 }}>
            <span>🚨</span>
            <span>CUSTOMER CALLS ({calls.length}):</span>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'nowrap' }}>
            {calls.map((call) => (
              <div
                key={call.id}
                style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  padding: '6px 12px',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontWeight: 800 }}>T-{call.tableNumber}</span>
                <span
                  style={{
                    background: call.type === 'bill' ? '#f59e0b' : '#38bdf8',
                    color: '#000000',
                    fontWeight: 900,
                    padding: '2px 6px',
                    borderRadius: 4,
                    textTransform: 'uppercase',
                    fontSize: 10,
                  }}
                >
                  {call.type}
                </span>

                {call.status === 'active' ? (
                  <button
                    onClick={() => handleAcknowledgeCall(call.id)}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 4,
                      padding: '2px 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Ack
                  </button>
                ) : (
                  <span style={{ fontSize: 10, color: '#a7f3d0' }}>Acknowledged</span>
                )}

                <button
                  onClick={() => handleResolveCall(call.id)}
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Done ✓
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Selector Bar (Scrollable horizontally) */}
      <div
        style={{
          background: '#1e293b',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          flexShrink: 0,
        }}
      >
        {tables.map((t) => {
          const isSelected = t.id === selectedTableId;
          const hasReady = t.readyDishesCount > 0;

          return (
            <button
              key={t.id}
              onClick={() => setSelectedTableId(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 8,
                background: isSelected
                  ? 'var(--primary)'
                  : hasReady
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(255, 255, 255, 0.05)',
                color: isSelected ? '#ffffff' : hasReady ? '#34d399' : '#cbd5e1',
                border: isSelected
                  ? '2px solid #ffffff'
                  : hasReady
                  ? '2px solid #10b981'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: t.sessionColor || (t.isOccupied ? '#3b82f6' : '#64748b'),
                }}
              />
              <span>T-{t.tableNumber}</span>

              {hasReady && (
                <span
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    fontSize: 10,
                    fontWeight: 900,
                    padding: '1px 6px',
                    borderRadius: 10,
                  }}
                >
                  {t.readyDishesCount} ready
                </span>
              )}

              {t.activeCallsCount > 0 && (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: 10,
                    fontWeight: 900,
                    padding: '1px 6px',
                    borderRadius: 10,
                  }}
                >
                  !
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Selected Table Dishes Content */}
      <main style={{ flex: 1, padding: '16px 20px', overflowY: 'auto' }}>
        {!selectedTable ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            Select a table above to manage its dishes.
          </div>
        ) : !selectedTable.isOccupied ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🪑</div>
            <h3 style={{ fontSize: 18, color: '#f8fafc' }}>Table {selectedTable.tableNumber} is Free</h3>
            <p style={{ fontSize: 13 }}>No active customer session at this table.</p>
            <button
              onClick={handleOpenOrderModal}
              style={{
                marginTop: 12,
                padding: '10px 20px',
                borderRadius: 8,
                background: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Start Session & Take Order
            </button>
          </div>
        ) : loadingDishes ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            Loading dishes for Table {selectedTable.tableNumber}...
          </div>
        ) : dishes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
            <h3 style={{ fontSize: 18, color: '#f8fafc' }}>No dishes ordered yet</h3>
            <p style={{ fontSize: 13 }}>Customers are currently browsing the menu.</p>
            <button
              onClick={handleOpenOrderModal}
              style={{
                marginTop: 12,
                padding: '10px 18px',
                borderRadius: 8,
                background: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              + Take Order Tableside
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Section 1: Ready to Serve (Prominent & Actionable) */}
            {readyDishes.length > 0 && (
              <section>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 10,
                    color: '#34d399',
                    fontWeight: 800,
                    fontSize: 15,
                  }}
                >
                  <span>🛎️</span>
                  <span>READY TO SERVE ({readyDishes.length})</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {readyDishes.map((dish) => (
                    <div
                      key={dish.id}
                      style={{
                        background: '#064e3b',
                        border: '2px solid #10b981',
                        borderRadius: 12,
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 2,
                            border: `2px solid ${dish.isVeg ? '#34d399' : '#f87171'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 7,
                            color: dish.isVeg ? '#34d399' : '#f87171',
                            fontWeight: 900,
                          }}
                        >
                          ●
                        </span>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#ffffff' }}>
                            {dish.itemName} <span style={{ opacity: 0.8 }}>x{dish.quantity}</span>
                          </div>
                          {dish.specialInstructions && (
                            <div style={{ fontSize: 11, color: '#a7f3d0' }}>
                              Note: {dish.specialInstructions}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleMarkServed(dish.id)}
                        style={{
                          padding: '10px 18px',
                          borderRadius: 8,
                          background: '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 900,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ✓ Mark Served
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Section 2: In Kitchen (Preparing / Confirmed) */}
            {kitchenDishes.length > 0 && (
              <section>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 10,
                    color: '#fbbf24',
                    fontWeight: 800,
                    fontSize: 14,
                  }}
                >
                  <span>🍳</span>
                  <span>PREPARING IN KITCHEN ({kitchenDishes.length})</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {kitchenDishes.map((dish) => (
                    <div
                      key={dish.id}
                      style={{
                        background: '#1e293b',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 10,
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            border: `2px solid ${dish.isVeg ? '#10b981' : '#ef4444'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 6,
                            color: dish.isVeg ? '#10b981' : '#ef4444',
                          }}
                        >
                          ●
                        </span>
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>
                            {dish.itemName} x{dish.quantity}
                          </span>
                          {dish.specialInstructions && (
                            <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>
                              Note: {dish.specialInstructions}
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          background: dish.status === 'preparing' ? '#f59e0b22' : 'rgba(255,255,255,0.08)',
                          color: dish.status === 'preparing' ? '#fbbf24' : '#94a3b8',
                          padding: '3px 8px',
                          borderRadius: 4,
                          textTransform: 'capitalize',
                        }}
                      >
                        {dish.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Section 3: Served Dishes */}
            {servedDishes.length > 0 && (
              <section>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 10,
                    color: '#94a3b8',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  <span>✅</span>
                  <span>SERVED ({servedDishes.length})</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {servedDishes.map((dish) => (
                    <div
                      key={dish.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: '#64748b',
                      }}
                    >
                      <span style={{ fontSize: 13 }}>
                        {dish.itemName} x{dish.quantity}
                      </span>

                      <button
                        onClick={() => handleUndoServed(dish.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94a3b8',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '2px 6px',
                        }}
                      >
                        ↩ Undo
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Take Order Modal */}
      {showOrderModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: '#1e293b',
              padding: 24,
              borderRadius: 14,
              width: 480,
              maxWidth: '92%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              color: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                  Take Order: Table {selectedTable?.tableNumber}
                </h3>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  Orders placed by waiter will route to manager for approval
                </span>
              </div>
              <button
                onClick={() => setShowOrderModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: 20, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Menu Items List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {menuItems.map((item) => {
                const qty = orderDraft[item.id] || 0;

                return (
                  <div
                    key={item.id}
                    style={{
                      background: '#0f172a',
                      padding: '10px 14px',
                      borderRadius: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>
                        ₹{(item.pricePaise / 100).toFixed(2)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {qty > 0 && (
                        <button
                          onClick={() =>
                            setOrderDraft((prev) => ({
                              ...prev,
                              [item.id]: Math.max(0, qty - 1),
                            }))
                          }
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: '#334155',
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          -
                        </button>
                      )}

                      {qty > 0 && (
                        <span style={{ fontWeight: 800, minWidth: 20, textAlign: 'center' }}>
                          {qty}
                        </span>
                      )}

                      <button
                        onClick={() =>
                          setOrderDraft((prev) => ({
                            ...prev,
                            [item.id]: qty + 1,
                          }))
                        }
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          background: 'var(--primary)',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 14 }}>
              <button
                onClick={handleSubmitWaiterOrder}
                disabled={submittingOrder}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  borderRadius: 8,
                  background: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {submittingOrder ? 'Submitting...' : 'Send to Manager for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
