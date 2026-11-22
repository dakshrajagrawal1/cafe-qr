import React, { useState } from 'react';
import { api } from '../services/api.js';

interface CallWaiterModalProps {
  onClose: () => void;
}

export const CallWaiterModal: React.FC<CallWaiterModalProps> = ({ onClose }) => {
  const [selectedType, setSelectedType] = useState<'help' | 'water' | 'bill' | 'other'>('water');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const callTypes = [
    { type: 'water' as const, label: 'Drinking Water', icon: '💧' },
    { type: 'help' as const, label: 'Need Assistance', icon: '🙋' },
    { type: 'bill' as const, label: 'Request Bill', icon: '🧾' },
    { type: 'other' as const, label: 'Cutlery / Napkins', icon: '🍴' },
  ];

  const handleCall = async () => {
    setLoading(true);
    try {
      await api.callWaiter(selectedType, message.trim() || undefined);
      setSent(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to alert waiter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>Call Waiter to Table</h3>
          <button onClick={onClose} style={{ background: '#f1f5f9', borderRadius: '50%', width: 32, height: 32 }}>
            ✕
          </button>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: '#166534' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <h4 style={{ fontSize: 17, fontWeight: 700 }}>Waiter Alerted!</h4>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Someone from the staff is heading to your table.
            </p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {callTypes.map((ct) => {
                const isSelected = selectedType === ct.type;
                return (
                  <button
                    key={ct.type}
                    onClick={() => setSelectedType(ct.type)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      padding: 16,
                      borderRadius: 12,
                      border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--primary-light)' : '#ffffff',
                      color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{ct.icon}</span>
                    <span>{ct.label}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ marginBottom: 20 }}>
              <input
                type="text"
                placeholder="Optional note for waiter (e.g. 2 glasses, warm water)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <button
              onClick={handleCall}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Alerting Waiter...' : 'Alert Waiter ➔'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
