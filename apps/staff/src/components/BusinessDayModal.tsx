import React, { useState, useEffect } from 'react';
import { staffApi } from '../services/staffApi.js';

interface BusinessDayModalProps {
  onClose: () => void;
  onUpdated?: () => void;
}

export const BusinessDayModal: React.FC<BusinessDayModalProps> = ({ onClose, onUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [dayData, setDayData] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Start Day State
  const [openingCashRupees, setOpeningCashRupees] = useState<number>(2000);
  const [startNotes, setStartNotes] = useState('');

  // End Day State
  const [countedCashRupees, setCountedCashRupees] = useState<number>(0);
  const [endNotes, setEndNotes] = useState('');
  const [forceOverride, setForceOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // Generated Report
  const [report, setReport] = useState<any | null>(null);

  const fetchCurrentDay = async () => {
    try {
      const res = await staffApi.getCurrentBusinessDay();
      setDayData(res.data);
      if (res.data?.isOpen && res.data.stats) {
        setCountedCashRupees((res.data.stats.expectedCashPaise || 0) / 100);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to fetch business day data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentDay();
  }, []);

  const handleStartDay = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await staffApi.startBusinessDay({
        openingCashPaise: Math.round(openingCashRupees * 100),
        notes: startNotes || undefined,
      });
      alert('Business Day started successfully!');
      if (onUpdated) onUpdated();
      await fetchCurrentDay();
    } catch (err: any) {
      alert(err.message || 'Failed to start business day');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndDay = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await staffApi.endBusinessDay({
        countedCashPaise: Math.round(countedCashRupees * 100),
        notes: endNotes || undefined,
        forceOverride: forceOverride || undefined,
        overrideReason: overrideReason || undefined,
      });

      setReport(res.report);
      alert('Business Day ended! Day-End Audit Report generated.');
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to end business day');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ textAlign: 'center', padding: 40 }}>
          Checking business day status...
        </div>
      </div>
    );
  }

  // If report is generated, show report summary
  if (report) {
    const diff = (report.reconciliation.cashDifferencePaise || 0) / 100;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{ width: 520, maxWidth: '94%', maxHeight: '90vh', overflowY: 'auto' }}
        >
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
            <h3 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Day-End Audit Report</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Closed on {new Date(report.endedAt).toLocaleDateString()} at{' '}
              {new Date(report.endedAt).toLocaleTimeString()}
            </span>
          </div>

          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 20, fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Total Orders Placed:</span>
              <strong>{report.totalOrdersCount}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Total Sales:</span>
              <strong style={{ color: 'var(--primary)', fontSize: 16 }}>
                ₹{(report.totalSalesPaise / 100).toFixed(2)}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Cash Sales Collected:</span>
              <strong>₹{(report.cashCollectedPaise / 100).toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Online/UPI Sales Collected:</span>
              <strong>₹{(report.onlineCollectedPaise / 100).toFixed(2)}</strong>
            </div>
            {report.discountGivenPaise > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Discounts Applied:</span>
                <span style={{ color: '#b45309' }}>-₹{(report.discountGivenPaise / 100).toFixed(2)}</span>
              </div>
            )}
            {report.cancelledDishesCount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Cancelled / Voided Dishes:</span>
                <span style={{ color: '#ef4444' }}>{report.cancelledDishesCount} dishes</span>
              </div>
            )}
          </div>

          {/* Cash Reconciliation Block */}
          <div
            style={{
              background: diff === 0 ? '#f0fdf4' : diff > 0 ? '#eff6ff' : '#fef2f2',
              border: `1px solid ${diff === 0 ? '#bbf7d0' : diff > 0 ? '#bfdbfe' : '#fecaca'}`,
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              fontSize: 13,
            }}
          >
            <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800 }}>
              Cash Drawer Reconciliation
            </h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Opening Float:</span>
              <span>₹{(report.reconciliation.openingCashPaise / 100).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Expected Cash in Drawer:</span>
              <span>₹{(report.reconciliation.expectedCashPaise / 100).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Counted Cash by Staff:</span>
              <strong>₹{(report.reconciliation.countedCashPaise / 100).toFixed(2)}</strong>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(0,0,0,0.1)',
                paddingTop: 8,
                fontSize: 15,
                fontWeight: 900,
              }}
            >
              <span>Difference:</span>
              <span style={{ color: diff === 0 ? '#15803d' : diff > 0 ? '#2563eb' : '#dc2626' }}>
                {diff === 0 ? 'Balanced (₹0.00)' : diff > 0 ? `+₹${diff.toFixed(2)} Over` : `-₹${Math.abs(diff).toFixed(2)} Short`}
              </span>
            </div>
          </div>

          <button onClick={onClose} className="btn-primary" style={{ width: '100%', padding: '12px 0' }}>
            Done / Close Report
          </button>
        </div>
      </div>
    );
  }

  const isOpen = dayData?.isOpen;
  const stats = dayData?.stats;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 500, maxWidth: '94%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: isOpen ? '#10b981' : '#ef4444',
              }}
            />
            <h3 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>
              {isOpen ? 'Business Day: OPEN' : 'Business Day: CLOSED'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        {!isOpen ? (
          /* ================= START DAY FORM ================= */
          <form onSubmit={handleStartDay}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              A business day never auto-closes at midnight. Start the day with your opening cash drawer float to track daily sales and reconciliation.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                Opening Cash Float (₹)
              </label>
              <input
                type="number"
                min={0}
                value={openingCashRupees}
                onChange={(e) => setOpeningCashRupees(Number(e.target.value))}
                required
                style={{ width: '100%', padding: '10px 12px', fontSize: 16, fontWeight: 800, borderRadius: 8 }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Morning shift, cashier Ramesh"
                value={startNotes}
                onChange={(e) => setStartNotes(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8 }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{ width: '100%', padding: '12px 0', fontSize: 15 }}
            >
              {submitting ? 'Starting...' : '🚀 Start Business Day'}
            </button>
          </form>
        ) : (
          /* ================= END DAY FORM & STATS ================= */
          <form onSubmit={handleEndDay}>
            {/* Live Day Snapshot */}
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Started at:</span>
                <span>{new Date(dayData.businessDay.startedAt).toLocaleTimeString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Opening Float:</span>
                <span>₹{(dayData.businessDay.openingCashPaise / 100).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Orders Placed:</span>
                <strong>{stats.totalOrdersCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Sales so far:</span>
                <strong style={{ color: 'var(--primary)' }}>₹{(stats.totalSalesPaise / 100).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 6 }}>
                <span style={{ fontWeight: 700 }}>Expected Cash in Register:</span>
                <strong style={{ color: '#15803d' }}>₹{(stats.expectedCashPaise / 100).toFixed(2)}</strong>
              </div>
            </div>

            {/* Open Tables Warning */}
            {stats.openSessionsCount > 0 && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  padding: '10px 14px',
                  borderRadius: 8,
                  marginBottom: 16,
                  color: '#991b1b',
                  fontSize: 12,
                }}
              >
                ⚠️ <strong>{stats.openSessionsCount} tables are still occupied!</strong>
                <p style={{ margin: '4px 0 8px' }}>
                  Tables: {stats.openSessions.map((s: any) => `T-${s.tableNumber}`).join(', ')}.
                  Please settle or close open sessions before ending the day.
                </p>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={forceOverride}
                    onChange={(e) => setForceOverride(e.target.checked)}
                  />
                  <span>Force End Day with Open Tables</span>
                </label>

                {forceOverride && (
                  <input
                    type="text"
                    placeholder="Reason for force override (required)"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    required
                    style={{ width: '100%', marginTop: 8, padding: '6px 10px', borderRadius: 6, fontSize: 12 }}
                  />
                )}
              </div>
            )}

            {/* Counted Cash Input */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                Counted Physical Cash in Drawer (₹)
              </label>
              <input
                type="number"
                min={0}
                value={countedCashRupees}
                onChange={(e) => setCountedCashRupees(Number(e.target.value))}
                required
                style={{ width: '100%', padding: '10px 12px', fontSize: 16, fontWeight: 800, borderRadius: 8 }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Difference: ₹{(countedCashRupees - stats.expectedCashPaise / 100).toFixed(2)}
              </span>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                Closing Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Evening closing balance verified"
                value={endNotes}
                onChange={(e) => setEndNotes(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8 }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || (stats.openSessionsCount > 0 && !forceOverride)}
              className="btn-danger"
              style={{ width: '100%', padding: '12px 0', fontSize: 15 }}
            >
              {submitting ? 'Ending Day...' : '🏁 End Business Day & Generate Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
