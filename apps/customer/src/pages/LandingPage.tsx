import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useCustomerStore } from '../stores/customerStore.js';
import { CallWaiterModal } from '../components/CallWaiterModal.js';
import { IosStatusBar, IosHomeBar } from '../components/IosChrome.js';

interface LandingPageProps {
  onStartOrdering: () => void;
  onViewMenuOnly?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartOrdering, onViewMenuOnly }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cafeData, setCafeData] = useState<any>(null);
  const [tableData, setTableData] = useState<any>(null);
  const [isComingSoon, setIsComingSoon] = useState(false);
  const [showWaiterModal, setShowWaiterModal] = useState(false);

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
        <h3 style={{ fontSize: 17, fontWeight: 700 }}>Connecting to Table...</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Loading restaurant menu</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Invalid Table QR</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>{error}</p>
        <p style={{ fontSize: 13, color: '#94a3b8' }}>Please scan the QR code located on your table.</p>
      </div>
    );
  }

  // Restaurant photo matching the mockup
  const heroImage = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=85';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#ffffff', position: 'relative' }}>
      {/* Top Banner Image with iOS Status Bar */}
      <div
        style={{
          height: 250,
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        {/* Dark Gradient Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.65) 100%)',
          }}
        />

        {/* iOS Overlay Status Bar */}
        <IosStatusBar overlay />

        {/* Top-Right Cafe Badge Graphic */}
        <div
          style={{
            position: 'absolute',
            top: 48,
            right: 20,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}
        >
          ☕
        </div>

        {/* Floating Circular CafeQR Logo Badge */}
        <div
          style={{
            position: 'absolute',
            bottom: -36,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 82,
            height: 82,
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3.5px solid #ffffff',
            zIndex: 10,
          }}
        >
          <span style={{ fontSize: 26, lineHeight: 1 }}>👨‍🍳</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#ff6b35', marginTop: 2, letterSpacing: -0.2 }}>CafeQR</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 24px 12px',
          textAlign: 'center',
        }}
      >
        <div>
          {/* Cafe Name */}
          <h1 style={{ fontSize: 23, fontWeight: 800, color: 'var(--dark)', letterSpacing: -0.4 }}>
            {cafeData?.name || "The Foodie's Cafe"}
          </h1>

          {/* Verified Restaurant Pill */}
          <div style={{ marginTop: 8 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: '#f0fdf4',
                color: '#16a34a',
                border: '1px solid #dcfce7',
                padding: '3px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 11 12 14 22 4"/>
              </svg>
              Verified Restaurant
            </span>
          </div>

          {/* Table 04 Card */}
          <div style={{ marginTop: 18 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                padding: '8px 20px',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              }}
            >
              {/* Cute Dining Table Icon */}
              <span style={{ fontSize: 18 }}>🪑</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--dark)' }}>
                Table {tableData?.tableNumber || '04'}
              </span>
            </div>
          </div>

          {/* Location & Prep Time Rows */}
          <div style={{ marginTop: 16, color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontWeight: 500 }}>
              <span>📍 {cafeData?.city ? `${cafeData.city}, MP` : 'Indore, MP'}</span>
              <span>•</span>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>Open</span>
              <span>•</span>
              <span>Closes 11 PM</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 4, fontWeight: 500 }}>
              <span>⏱</span>
              <span>Prep: ~{cafeData?.settings?.defaultPrepTimeMin || 15} mins</span>
            </div>
          </div>

          {isComingSoon && (
            <div style={{ marginTop: 20, padding: 14, borderRadius: 12, background: '#fffbeb', border: '1px solid #fef3c7', textAlign: 'center' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#b45309' }}>Coming Soon</h3>
              <p style={{ fontSize: 12, color: '#92400e', marginTop: 4 }}>
                This cafe is currently setting up their menu and will be live shortly.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: 28 }}>
          {!isComingSoon && (
            <>
              {/* Primary Start Ordering Button */}
              <button
                onClick={onStartOrdering}
                className="btn-primary"
                style={{ marginBottom: 12 }}
              >
                <span>Start Ordering</span>
                <span style={{ fontSize: 17 }}>➔</span>
              </button>

              {/* Secondary Call Waiter Button */}
              <button
                onClick={() => setShowWaiterModal(true)}
                className="btn-secondary"
                style={{ marginBottom: 14 }}
              >
                <span style={{ fontSize: 15 }}>📞</span>
                <span>Call Waiter</span>
              </button>

              {/* View Menu Only Link */}
              <div>
                <button
                  onClick={onViewMenuOnly || onStartOrdering}
                  style={{
                    background: 'transparent',
                    color: '#ff6b35',
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: 'underline',
                    textUnderlineOffset: 4,
                  }}
                >
                  View Menu Only
                </button>
              </div>
            </>
          )}

          {/* FSSAI Footer Badge */}
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, color: '#94a3b8' }}>
            <span style={{ fontStyle: 'italic', fontWeight: 800, color: '#475569', letterSpacing: 0.5 }}>fssai</span>
            <span>FSSAI Lic. No. {cafeData?.fssaiNumber || '12345678901234'}</span>
          </div>

          {/* iOS Home Indicator */}
          <IosHomeBar />
        </div>
      </div>

      {showWaiterModal && (
        <CallWaiterModal onClose={() => setShowWaiterModal(false)} />
      )}
    </div>
  );
};
