import React, { useEffect, useState } from 'react';
import { useCustomerStore } from './stores/customerStore.js';
import { api } from './services/api.js';
import { LandingPage } from './pages/LandingPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { MenuPage } from './pages/MenuPage.js';
import { CartPage } from './pages/CartPage.js';
import { OrderStatusPage } from './pages/OrderStatusPage.js';
import { useCartPolling } from './hooks/useCartPolling.js';
import { IosStatusBar, IosHomeBar } from './components/IosChrome.js';

export const App: React.FC = () => {
  const {
    customer,
    customerToken,
    deviceToken,
    tableToken,
    session,
    setSessionData,
    setCategories,
    setCart,
  } = useCustomerStore();

  const [currentView, setCurrentView] = useState<'landing' | 'login' | 'pin' | 'menu' | 'cart' | 'orders'>('landing');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  // Real-time shared cart sync across foodies at the same table
  useCartPolling(session?.id);

  const startSessionFlow = async (pin?: string, forceIndependent?: boolean) => {
    if (!tableToken || !customerToken || !deviceToken) {
      setCurrentView('login');
      return;
    }

    setInitializing(true);
    setPinError(null);

    try {
      const res = await api.initSession(tableToken, deviceToken, pin, forceIndependent);
      if (res.data.requiresPin) {
        setCurrentView('pin');
        setInitializing(false);
        return;
      }

      setSessionData({
        cafe: res.data.cafe,
        table: res.data.table,
        session: res.data.session,
        memberId: res.data.memberId,
      });

      // Load menu
      const menuRes = await api.getPublicMenu(res.data.cafe.slug);
      setCategories(menuRes.data.categories || []);

      // Load cart
      const cartRes = await api.getCart();
      setCart(cartRes.data);

      setCurrentView('menu');
    } catch (err: any) {
      if (currentView === 'pin') {
        setPinError(err.message || 'Incorrect PIN');
      } else {
        alert(err.message || 'Failed to start table session');
      }
    } finally {
      setInitializing(false);
    }
  };

  // If already logged in and session exists, restore menu
  useEffect(() => {
    if (session && currentView === 'landing') {
      setCurrentView('menu');
    }
  }, [session, currentView]);

  return (
    <>
      {currentView === 'landing' && (
        <LandingPage
          onStartOrdering={() => {
            if (!customer) {
              setCurrentView('login');
            } else {
              startSessionFlow();
            }
          }}
        />
      )}

      {currentView === 'login' && (
        <LoginPage
          onSuccess={() => {
            startSessionFlow();
          }}
        />
      )}

      {currentView === 'pin' && (
        <div style={{ padding: '0 24px 12px', textAlign: 'center', minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff' }}>
          <div>
            <IosStatusBar />

            {/* Friends Dining Illustration with Green Checkmark Bubble */}
            <div style={{ margin: '14px auto 20px', maxWidth: 220 }}>
              <div
                style={{
                  height: 140,
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  boxShadow: '0 4px 12px rgba(255, 107, 53, 0.08)',
                }}
              >
                {/* Green check speech bubble */}
                <div
                  style={{
                    position: 'absolute',
                    top: 14,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: '#22c55e',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 800,
                    boxShadow: '0 2px 6px rgba(34, 197, 94, 0.4)',
                  }}
                >
                  ✓
                </div>
                <div style={{ fontSize: 44, marginTop: 18 }}>
                  👨‍💼👩‍💼👨‍🦱
                </div>
                <div style={{ fontSize: 20, marginTop: -6 }}>
                  🍽️
                </div>
              </div>
            </div>

            {/* Title & Host info */}
            <h2 style={{ fontSize: 21, fontWeight: 800, color: 'var(--dark)' }}>
              Rohan has already opened Table 04
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6, marginBottom: 24, lineHeight: 1.5 }}>
              Enter the 4–6 digit Table PIN shown on your friend's screen
            </p>

            {pinError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 18 }}>
                {pinError}
              </div>
            )}

            {/* 4 Separate PIN Input Boxes */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
              {[0, 1, 2, 3].map((idx) => {
                const char = pinInput[idx] || '';
                return (
                  <input
                    key={idx}
                    id={`pin-box-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={char}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const arr = pinInput.split('');
                      arr[idx] = val;
                      const next = arr.join('').slice(0, 4);
                      setPinInput(next);
                      if (val && idx < 3) {
                        const nextEl = document.getElementById(`pin-box-${idx + 1}`);
                        nextEl?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !pinInput[idx] && idx > 0) {
                        const prevEl = document.getElementById(`pin-box-${idx - 1}`);
                        prevEl?.focus();
                      }
                    }}
                    style={{
                      width: 50,
                      height: 56,
                      textAlign: 'center',
                      fontSize: 24,
                      fontWeight: 800,
                      borderRadius: 14,
                      border: `1.5px solid ${char ? '#ff6b35' : '#e2e8f0'}`,
                      background: char ? '#fffaf8' : '#ffffff',
                      boxShadow: char ? '0 4px 12px rgba(255, 107, 53, 0.15)' : 'var(--shadow-sm)',
                    }}
                    autoFocus={idx === 0}
                  />
                );
              })}
            </div>

            {/* Hint for easy testing */}
            <div style={{ fontSize: 12, color: '#f97316', marginBottom: 16, fontWeight: 700 }}>
              💡 Table PIN: enter <strong>1234</strong> or ask friends
            </div>

            {/* Join Table Cart Button */}
            <button
              onClick={() => startSessionFlow(pinInput)}
              disabled={initializing || pinInput.length < 4}
              className="btn-primary"
              style={{ marginBottom: 14 }}
            >
              {initializing ? 'Connecting...' : 'Join Table Cart'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0', color: '#94a3b8', fontSize: 13 }}>
              <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
              <span style={{ padding: '0 12px' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
            </div>

            {/* Start Independent Cart */}
            <button
              onClick={() => startSessionFlow(undefined, true)}
              style={{
                background: 'transparent',
                color: '#ff6b35',
                fontSize: 14,
                fontWeight: 700,
                padding: '6px 14px',
                cursor: 'pointer',
              }}
            >
              Start Independent Cart
            </button>
          </div>

          <div>
            <IosHomeBar />
          </div>
        </div>
      )}

      {currentView === 'menu' && (
        <MenuPage
          onOpenCart={() => setCurrentView('cart')}
          onOpenOrders={() => setCurrentView('orders')}
        />
      )}

      {currentView === 'cart' && (
        <CartPage
          onBack={() => setCurrentView('menu')}
          onOrderPlaced={() => setCurrentView('orders')}
        />
      )}

      {currentView === 'orders' && (
        <OrderStatusPage
          onBackToMenu={() => setCurrentView('menu')}
        />
      )}
    </>
  );
};
