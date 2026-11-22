import React, { useState, useEffect, useRef } from 'react';
import { staffApi } from '../services/staffApi.js';
import { useSoundAlert } from '../hooks/useSoundAlert.js';
import { useStaffStore } from '../stores/staffStore.js';

interface KitchenTicket {
  id: string;
  orderId: string;
  orderNumber: string;
  tableId: string;
  tableNumber: string;
  tableLabel?: string | null;
  sessionId: string;
  sessionColor: string;
  itemName: string;
  itemPricePaise: number;
  quantity: number;
  isVeg: boolean;
  selectedOptions?: any[];
  specialInstructions?: string | null;
  status: 'confirmed' | 'preparing' | 'ready';
  prepTimeMin?: number | null;
  waitingMinutes: number;
  createdAt: string;
  statusChangedAt?: string | null;
}

export const KitchenScreenPage: React.FC = () => {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [undoPromptTicket, setUndoPromptTicket] = useState<KitchenTicket | null>(null);
  const [undoReason, setUndoReason] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const prevTicketCountRef = useRef(0);
  const { playAlert } = useSoundAlert();
  const { soundEnabled, toggleSound } = useStaffStore();

  const fetchTickets = async () => {
    try {
      const res = await staffApi.getKitchenTickets();
      const list: KitchenTicket[] = res.data || [];

      // Check if new tickets arrived to trigger sound alert
      if (list.length > prevTicketCountRef.current && prevTicketCountRef.current > 0) {
        playAlert();
      }
      prevTicketCountRef.current = list.length;
      setTickets(list);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch kitchen tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (ticketId: string, status: 'preparing' | 'ready') => {
    setActionInProgress(ticketId);
    try {
      await staffApi.updateKitchenTicketStatus(ticketId, status);
      await fetchTickets();
    } catch (err: any) {
      alert(`Error updating ticket: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleConfirmUndo = async () => {
    if (!undoPromptTicket) return;
    setActionInProgress(undoPromptTicket.id);
    try {
      await staffApi.undoKitchenTicketStatus(
        undoPromptTicket.id,
        undoReason.trim() || 'Mistake by chef',
      );
      setUndoPromptTicket(null);
      setUndoReason('');
      await fetchTickets();
    } catch (err: any) {
      alert(`Error reverting ticket: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const confirmedCount = tickets.filter((t) => t.status === 'confirmed').length;
  const preparingCount = tickets.filter((t) => t.status === 'preparing').length;
  const readyCount = tickets.filter((t) => t.status === 'ready').length;

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
      {/* Header Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          background: '#1e293b',
          borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            🍳
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
              Kitchen Display System (KDS)
            </h1>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>
              Auto-refreshing live dish tickets
            </span>
          </div>
        </div>

        {/* Status Counters & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <span
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 700,
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              Confirmed: {confirmedCount}
            </span>
            <span
              style={{
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#fbbf24',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 700,
                border: '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              Preparing: {preparingCount}
            </span>
            <span
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 700,
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              Ready: {readyCount}
            </span>
          </div>

          <button
            onClick={toggleSound}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              background: soundEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: soundEnabled ? '#34d399' : '#f87171',
              border: `1px solid ${soundEnabled ? '#10b981' : '#ef4444'}`,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {soundEnabled ? '🔔 Sound ON' : '🔕 Sound OFF'}
          </button>
        </div>
      </header>

      {/* Main Ticket Grid */}
      <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        {loading && tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            Loading kitchen tickets...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#ef4444' }}>
            {error}
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>Kitchen is Clear!</h2>
            <p style={{ fontSize: 14 }}>No pending dishes to prepare right now.</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 20,
            }}
          >
            {tickets.map((t) => {
              const isOverdue = t.waitingMinutes >= 20;
              const isWarning = t.waitingMinutes >= 10 && !isOverdue;

              return (
                <div
                  key={t.id}
                  style={{
                    background: '#1e293b',
                    borderRadius: 14,
                    border: `3px solid ${t.sessionColor || '#3b82f6'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Top Bar: Table Badge, Elapsed Time & Color */}
                  <div
                    style={{
                      background: t.sessionColor || '#3b82f6',
                      color: '#ffffff',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontWeight: 900,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          background: '#ffffff',
                          color: '#0f172a',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 14,
                        }}
                      >
                        T-{t.tableNumber}
                      </span>
                      <span style={{ fontSize: 13, opacity: 0.9 }}>
                        {t.tableLabel ? `(${t.tableLabel})` : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, background: 'rgba(0,0,0,0.25)', padding: '2px 6px', borderRadius: 4 }}>
                        {t.orderNumber}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          background: isOverdue ? '#ef4444' : isWarning ? '#f59e0b' : 'rgba(0,0,0,0.3)',
                          padding: '3px 8px',
                          borderRadius: 6,
                        }}
                      >
                        ⏱️ {t.waitingMinutes}m
                      </span>
                    </div>
                  </div>

                  {/* Dish Body */}
                  <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 3,
                            border: `2px solid ${t.isVeg ? '#10b981' : '#ef4444'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 8,
                            color: t.isVeg ? '#10b981' : '#ef4444',
                            fontWeight: 900,
                          }}
                        >
                          ●
                        </span>
                        <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                          {t.itemName}
                        </h3>
                      </div>

                      <span
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          fontSize: 16,
                          fontWeight: 900,
                          padding: '2px 10px',
                          borderRadius: 8,
                        }}
                      >
                        x{t.quantity}
                      </span>
                    </div>

                    {/* Customizations / Options */}
                    {t.selectedOptions && t.selectedOptions.length > 0 && (
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '8px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          color: '#cbd5e1',
                        }}
                      >
                        <strong style={{ color: '#94a3b8' }}>Options: </strong>
                        {t.selectedOptions.map((opt: any) => opt.name || opt.optionName).join(', ')}
                      </div>
                    )}

                    {/* Special Notes / Instructions */}
                    {t.specialInstructions && (
                      <div
                        style={{
                          background: 'rgba(245, 158, 11, 0.15)',
                          borderLeft: '3px solid #f59e0b',
                          padding: '6px 10px',
                          borderRadius: 4,
                          fontSize: 12,
                          color: '#fef08a',
                          fontWeight: 600,
                        }}
                      >
                        Note: {t.specialInstructions}
                      </div>
                    )}

                    {/* Current Status Badge */}
                    <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          padding: '3px 8px',
                          borderRadius: 4,
                          background:
                            t.status === 'ready'
                              ? 'rgba(16, 185, 129, 0.2)'
                              : t.status === 'preparing'
                              ? 'rgba(245, 158, 11, 0.2)'
                              : 'rgba(239, 68, 68, 0.2)',
                          color:
                            t.status === 'ready'
                              ? '#34d399'
                              : t.status === 'preparing'
                              ? '#fbbf24'
                              : '#f87171',
                        }}
                      >
                        ● {t.status}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div
                    style={{
                      padding: 12,
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      gap: 8,
                    }}
                  >
                    {t.status === 'confirmed' && (
                      <button
                        onClick={() => handleUpdateStatus(t.id, 'preparing')}
                        disabled={actionInProgress === t.id}
                        style={{
                          flex: 1,
                          padding: '10px 0',
                          borderRadius: 8,
                          background: '#f59e0b',
                          color: '#000000',
                          fontWeight: 800,
                          fontSize: 13,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Start Prep 👨‍🍳
                      </button>
                    )}

                    {(t.status === 'confirmed' || t.status === 'preparing') && (
                      <button
                        onClick={() => handleUpdateStatus(t.id, 'ready')}
                        disabled={actionInProgress === t.id}
                        style={{
                          flex: 1,
                          padding: '10px 0',
                          borderRadius: 8,
                          background: '#10b981',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: 13,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Mark Done ✅
                      </button>
                    )}

                    {(t.status === 'preparing' || t.status === 'ready') && (
                      <button
                        onClick={() => setUndoPromptTicket(t)}
                        disabled={actionInProgress === t.id}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: '#94a3b8',
                          fontWeight: 700,
                          fontSize: 12,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        title="Revert status change"
                      >
                        ↩ Undo
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Undo Modal */}
      {undoPromptTicket && (
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
              width: 380,
              maxWidth: '90%',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#ffffff',
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 800, marginTop: 0 }}>
              Undo Dish State Change?
            </h3>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
              Reverting <strong>{undoPromptTicket.itemName}</strong> on{' '}
              <strong>Table {undoPromptTicket.tableNumber}</strong> from{' '}
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                {undoPromptTicket.status}
              </span>{' '}
              to{' '}
              <span style={{ color: '#34d399', fontWeight: 700 }}>
                {undoPromptTicket.status === 'ready' ? 'preparing' : 'confirmed'}
              </span>
              .
            </p>

            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1' }}>
                Reason for Undo:
              </label>
              <input
                type="text"
                placeholder="e.g. Clicked by mistake / Needs more seasoning"
                value={undoReason}
                onChange={(e) => setUndoReason(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: 6,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => {
                  setUndoPromptTicket(null);
                  setUndoReason('');
                }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUndo}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  background: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Confirm Undo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
