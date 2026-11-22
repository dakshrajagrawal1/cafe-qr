import React, { useEffect, useState } from 'react';
import { staffApi } from '../services/staffApi.js';
import { SettleBillModal } from '../components/SettleBillModal.js';

export const LiveTableGridPage: React.FC = () => {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [closingSession, setClosingSession] = useState<any | null>(null);
  const [closeReason, setCloseReason] = useState('Customer left / Table cleaned');
  const [settlingTable, setSettlingTable] = useState<{ sessionId: string; tableNumber: string } | null>(null);

  const fetchTables = async () => {
    try {
      const res = await staffApi.getLiveGrid();
      setTables(res.data || []);
    } catch (err) {
      console.error('Failed to load table grid:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleForceCloseSubmit = async () => {
    if (!closingSession) return;
    try {
      await staffApi.forceCloseSession(closingSession.id, closeReason);
      setClosingSession(null);
      fetchTables();
    } catch (err: any) {
      alert(err.message || 'Failed to close session');
    }
  };

  const getStatusProps = (status: string) => {
    switch (status) {
      case 'free':
        return { label: 'Free', bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', dot: '#22c55e' };
      case 'occupied':
        return { label: 'Occupied', bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', dot: '#3b82f6' };
      case 'bill_requested':
        return { label: 'Bill Requested', bg: '#fefce8', border: '#fef08a', color: '#854d0e', dot: '#eab308' };
      case 'waiter_called':
        return { label: 'Waiter Called!', bg: '#fef2f2', border: '#fecaca', color: '#991b1b', dot: '#ef4444' };
      default:
        return { label: status, bg: '#f8fafc', border: '#e2e8f0', color: '#475569', dot: '#94a3b8' };
    }
  };

  return (
    <div style={{ flex: 1, height: '100vh', overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Live Table Grid</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Real-time occupancy status, active guest count, session PINs, and waiter call alerts.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Loading tables...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {tables.map((t) => {
            const props = getStatusProps(t.status);

            return (
              <div
                key={t.tableId}
                style={{
                  background: '#ffffff',
                  border: `2px solid ${props.border}`,
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  {/* Table Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Table {t.tableNumber}</h3>
                      {t.label && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.label}</span>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: props.bg, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: props.color }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: props.dot }} />
                      {props.label}
                    </div>
                  </div>

                  {/* Active Waiter Call Alert */}
                  {t.activeWaiterCall && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '8px 12px', borderRadius: 8, marginBottom: 14, color: '#991b1b', fontSize: 12 }}>
                      🚨 <strong>Waiter Call:</strong> {t.activeWaiterCall.type.toUpperCase()}<br />
                      {t.activeWaiterCall.message && <em>"{t.activeWaiterCall.message}"</em>}
                    </div>
                  )}

                  {/* Active Session Info */}
                  {t.session ? (
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Session PIN:</span>
                        <strong style={{ letterSpacing: 2, color: 'var(--primary)' }}>{t.session.pin}</strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Seated for:</span>
                        <span>{t.session.elapsedMinutes} mins</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Orders / Items:</span>
                        <span>{t.session.orderCount} orders ({t.session.dishCount} dishes)</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 6 }}>
                        <span style={{ fontWeight: 700 }}>Total Order Value:</span>
                        <strong style={{ color: 'var(--dark)' }}>₹{(t.session.totalPaise / 100).toFixed(0)}</strong>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      Ready for next customer scan
                    </div>
                  )}
                </div>

                {/* Session Action Buttons */}
                {t.session && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      onClick={() =>
                        setSettlingTable({
                          sessionId: t.session.id,
                          tableNumber: t.tableNumber,
                        })
                      }
                      className="btn-primary"
                      style={{ width: '100%', padding: '10px 0', fontSize: 13 }}
                    >
                      💳 Settle Bill & Free Table
                    </button>

                    <button
                      onClick={() => setClosingSession(t.session)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        padding: '4px',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      Force-Close Session
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Settle Bill Modal */}
      {settlingTable && (
        <SettleBillModal
          sessionId={settlingTable.sessionId}
          tableNumber={settlingTable.tableNumber}
          onClose={() => setSettlingTable(null)}
          onSettled={fetchTables}
        />
      )}

      {/* Force Close Session Modal */}
      {closingSession && (
        <div className="modal-overlay" onClick={() => setClosingSession(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Force-Close Table Session</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              This will release the table color and free the table for new customers. This action will be logged in the audit trail.
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Reason for Closing</label>
              <input
                type="text"
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setClosingSession(null)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleForceCloseSubmit} className="btn-danger">
                Confirm Close Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
