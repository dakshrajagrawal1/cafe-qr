import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useCustomerStore } from '../stores/customerStore.js';

interface LandingPageProps {
  onStartOrdering: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartOrdering }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cafeData, setCafeData] = useState<any>(null);
  const [tableData, setTableData] = useState<any>(null);
  const [isComingSoon, setIsComingSoon] = useState(false);

  const setTableToken = useCustomerStore((s) => s.setTableToken);

  useEffect(() => {
    async function loadTableAndCafe() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('t');

        if (!token) {
          setError('Please scan a valid table QR code to start ordering.');
          setLoading(false);
          return;
        }

        setTableToken(token);

        // Verify signed table token
        const res = await api.verifyTableToken(token);
        if (!res.valid) {
          setError(res.error || 'Invalid or expired QR code.');
          setLoading(false);
          return;
        }

        setTableData(res.data.table);
        setCafeData(res.data.cafe);

        if (res.data.cafe.status !== 'approved') {
          setIsComingSoon(true);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to verify table QR code.');
      } finally {
        setLoading(false);
      }
    }

    loadTableAndCafe();
  }, [setTableToken]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, border: '4px solid #ff6b35', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 16 }} />
        <h3 style={{ fontSize: 18, fontWeight: 600 }}>Connecting to Table...</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>Verifying table QR code</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Invalid Table QR</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 24 }}>{error}</p>
        <p style={{ fontSize: 13, color: '#94a3b8' }}>Please rescan the QR code on your table.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'space-between', padding: '36px 24px' }}>
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        {/* Cafe Logo */}
        <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#ff6b35', color: '#fff', fontSize: 36, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(255, 107, 53, 0.25)' }}>
          {cafeData?.logoUrl ? (
            <img src={cafeData.logoUrl} alt={cafeData.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            cafeData?.name?.charAt(0) || 'C'
          )}
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--dark)' }}>{cafeData?.name}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
          {tableData ? `Table ${tableData.tableNumber}` : 'Contactless Table Ordering'}
        </p>

        {tableData?.label && (
          <div style={{ display: 'inline-block', background: '#f1f5f9', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#475569', marginTop: 8 }}>
            {tableData.label}
          </div>
        )}

        {isComingSoon ? (
          <div style={{ marginTop: 32, padding: 20, borderRadius: 12, background: '#fffbeb', border: '1px solid #fef3c7', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#b45309' }}>Coming Soon</h3>
            <p style={{ fontSize: 14, color: '#92400e', marginTop: 6 }}>
              This cafe is currently setting up their menu and is awaiting platform approval.
            </p>
          </div>
        ) : (
          <div style={{ marginTop: 36, padding: '16px 20px', background: '#f8fafc', borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
              <span style={{ fontSize: 24 }}>✨</span>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700 }}>Contactless Experience</h4>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Order food, customize options, and pay directly from your phone.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        {!isComingSoon && (
          <button
            onClick={onStartOrdering}
            className="btn-primary"
            style={{ marginBottom: 12 }}
          >
            Start Ordering ➔
          </button>
        )}

        {cafeData?.fssaiNumber && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 16 }}>
            FSSAI Lic. No. {cafeData.fssaiNumber}
          </div>
        )}
      </div>
    </div>
  );
};
