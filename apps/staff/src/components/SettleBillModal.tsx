import React, { useState, useEffect } from 'react';
import { staffApi } from '../services/staffApi.js';

interface SettleBillModalProps {
  sessionId: string;
  tableNumber: string;
  onClose: () => void;
  onSettled: () => void;
}

export const SettleBillModal: React.FC<SettleBillModalProps> = ({
  sessionId,
  tableNumber,
  onClose,
  onSettled,
}) => {
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<any>(null);
  const [discountRupees, setDiscountRupees] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [settling, setSettling] = useState(false);

  // Payment Mode
  const [mode, setMode] = useState<'cash' | 'online' | 'split'>('cash');
  const [cashReceivedRupees, setCashReceivedRupees] = useState<number>(0);
  const [gatewayRef, setGatewayRef] = useState('');

  // Split Mode State
  const [splitCashRupees, setSplitCashRupees] = useState<number>(0);
  const [splitOnlineRupees, setSplitOnlineRupees] = useState<number>(0);

  useEffect(() => {
    async function loadPreview() {
      try {
        const res = await staffApi.getBillPreview(sessionId);
        setPreview(res.data);
        const total = (res.data.totalPaise || 0) / 100;
        setCashReceivedRupees(total);
        setSplitCashRupees(Math.floor(total / 2));
        setSplitOnlineRupees(Math.ceil(total / 2));
      } catch (err: any) {
        alert(err.message || 'Failed to load bill preview');
        onClose();
      } finally {
        setLoading(false);
      }
    }
    loadPreview();
  }, [sessionId, onClose]);

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ textAlign: 'center', padding: 40 }}>
          Loading bill preview...
        </div>
      </div>
    );
  }

  const subtotal = preview.subtotalPaise / 100;
  const tax = preview.taxPaise / 100;
  const serviceCharge = preview.serviceChargePaise / 100;
  const discount = Math.max(0, discountRupees || 0);
  const total = Math.max(0, subtotal + tax + serviceCharge - discount);

  // Change to return calculation
  let changeToReturn = 0;
  if (mode === 'cash') {
    changeToReturn = Math.max(0, (cashReceivedRupees || 0) - total);
  } else if (mode === 'split') {
    changeToReturn = Math.max(0, (cashReceivedRupees || 0) - splitCashRupees);
  }

  const handleSettle = async () => {
    setSettling(true);
    try {
      // 1. Create or update bill record
      const billRes = await staffApi.createBill(sessionId, {
        discountPaise: Math.round(discount * 100),
        notes: notes || undefined,
      });

      const billId = billRes.data.id;

      // 2. Settle the bill
      if (mode === 'cash') {
        if (cashReceivedRupees < total) {
          alert(`Cash received (₹${cashReceivedRupees}) is less than total bill (₹${total})`);
          setSettling(false);
          return;
        }

        await staffApi.settleBill(billId, {
          mode: 'cash',
          cashReceivedPaise: Math.round(cashReceivedRupees * 100),
          notes,
        });
      } else if (mode === 'online') {
        await staffApi.settleBill(billId, {
          mode: 'online',
          gatewayRef: gatewayRef || 'Counter UPI/Card',
          notes,
        });
      } else if (mode === 'split') {
        if (Math.round((splitCashRupees + splitOnlineRupees) * 100) !== Math.round(total * 100)) {
          alert(`Split amounts (Cash ₹${splitCashRupees} + Online ₹${splitOnlineRupees}) must sum exactly to total ₹${total}`);
          setSettling(false);
          return;
        }

        await staffApi.settleBill(billId, {
          mode: 'split',
          cashAmountPaise: Math.round(splitCashRupees * 100),
          onlineAmountPaise: Math.round(splitOnlineRupees * 100),
          cashReceivedPaise: Math.round((cashReceivedRupees || splitCashRupees) * 100),
          gatewayRef: gatewayRef || 'Counter Split Online',
          notes,
        });
      }

      alert(`Table ${tableNumber} settled successfully! Table is now free.`);
      onSettled();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to settle bill');
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 540, maxWidth: '94%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
              Settle Bill: Table {tableNumber}
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              All approved dishes across session orders
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        {/* Line Items List */}
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginBottom: 16, maxHeight: 180, overflowY: 'auto' }}>
          {preview.lines.map((l: any) => (
            <div key={l.orderItemId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span>
                {l.quantity}x {l.itemName}
              </span>
              <strong>₹{(l.totalPaise / 100).toFixed(2)}</strong>
            </div>
          ))}
        </div>

        {/* Bill Calculations */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, marginBottom: 16, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>

          {tax > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>GST ({(preview.gstRate / 100).toFixed(0)}%):</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
          )}

          {serviceCharge > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Service Charge:</span>
              <span>₹{serviceCharge.toFixed(2)}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Discount (₹):</span>
            <input
              type="number"
              min={0}
              max={subtotal}
              value={discountRupees}
              onChange={(e) => setDiscountRupees(Number(e.target.value))}
              style={{ width: 100, padding: '4px 8px', borderRadius: 6, textAlign: 'right' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0f172a', paddingTop: 8, marginTop: 8, fontSize: 18, fontWeight: 900 }}>
            <span>Total Payable:</span>
            <span style={{ color: 'var(--primary)' }}>₹{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Mode Selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 8, textTransform: 'uppercase' }}>
            Payment Mode
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setMode('cash')}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 8,
                background: mode === 'cash' ? 'var(--primary)' : '#f1f5f9',
                color: mode === 'cash' ? '#ffffff' : '#0f172a',
                border: 'none',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              💵 Cash
            </button>
            <button
              onClick={() => setMode('online')}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 8,
                background: mode === 'online' ? 'var(--primary)' : '#f1f5f9',
                color: mode === 'online' ? '#ffffff' : '#0f172a',
                border: 'none',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              📱 Online / UPI
            </button>
            <button
              onClick={() => setMode('split')}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 8,
                background: mode === 'split' ? 'var(--primary)' : '#f1f5f9',
                color: mode === 'split' ? '#ffffff' : '#0f172a',
                border: 'none',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ⚡ Split
            </button>
          </div>
        </div>

        {/* Mode-specific Fields */}
        {mode === 'cash' && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#166534' }}>
                Cash Received from Customer (₹)
              </label>
              <input
                type="number"
                min={total}
                value={cashReceivedRupees}
                onChange={(e) => setCashReceivedRupees(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 12px', fontSize: 16, fontWeight: 800, borderRadius: 8, border: '1px solid #86efac' }}
              />
            </div>

            {/* Quick cash presets */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {[total, 500, 1000, 2000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCashReceivedRupees(amt)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: '#ffffff',
                    border: '1px solid #86efac',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            {/* Change to Return Indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#dcfce7', padding: '10px 14px', borderRadius: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#14532d' }}>
                Change to Return:
              </span>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#15803d' }}>
                ₹{changeToReturn.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {mode === 'online' && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#1e40af' }}>
              Reference / Transaction ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. UPI Ref / Card Txn ID"
              value={gatewayRef}
              onChange={(e) => setGatewayRef(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #93c5fd' }}
            />
          </div>
        )}

        {mode === 'split' && (
          <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Part Cash (₹)
                </label>
                <input
                  type="number"
                  value={splitCashRupees}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSplitCashRupees(val);
                    setSplitOnlineRupees(Math.max(0, total - val));
                  }}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6 }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Part Online (₹)
                </label>
                <input
                  type="number"
                  value={splitOnlineRupees}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSplitOnlineRupees(val);
                    setSplitCashRupees(Math.max(0, total - val));
                  }}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6 }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                Cash Received for Cash Part (₹)
              </label>
              <input
                type="number"
                value={cashReceivedRupees}
                onChange={(e) => setCashReceivedRupees(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13 }}>
              <span>Change to Return:</span>
              <strong style={{ color: '#15803d' }}>₹{changeToReturn.toFixed(2)}</strong>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            onClick={handleSettle}
            disabled={settling}
            className="btn-primary"
            style={{ flex: 2, padding: '12px 0', fontSize: 15 }}
          >
            {settling ? 'Settling...' : '✓ Settle Bill & Free Table'}
          </button>
        </div>
      </div>
    </div>
  );
};
