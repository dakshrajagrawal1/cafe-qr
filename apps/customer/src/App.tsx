import React, { useEffect, useState } from 'react';
import { useCustomerStore } from './stores/customerStore.js';
import { api } from './services/api.js';
import { LandingPage } from './pages/LandingPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { MenuPage } from './pages/MenuPage.js';
import { CartPage } from './pages/CartPage.js';
import { OrderStatusPage } from './pages/OrderStatusPage.js';
import { useCartPolling } from './hooks/useCartPolling.js';

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

  const startSessionFlow = async (pin?: string) => {
    if (!tableToken || !customerToken || !deviceToken) {
      setCurrentView('login');
      return;
    }

    setInitializing(true);
    setPinError(null);

    try {
      const res = await api.initSession(tableToken, deviceToken, pin);
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
        <div style={{ padding: '60px 24px', textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>Join Table Session</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6, marginBottom: 28 }}>
            Someone at your table has already started ordering. Ask them for the 4-digit PIN on their screen.
          </p>

          {pinError && (
            <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: 10, fontSize: 14, marginBottom: 20 }}>
              {pinError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              type="text"
              placeholder="4-digit PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              maxLength={4}
              style={{ fontSize: 28, letterSpacing: 10, textAlign: 'center', fontWeight: 800 }}
              autoFocus
            />

            <button
              onClick={() => startSessionFlow(pinInput)}
              disabled={initializing || pinInput.length < 4}
              className="btn-primary"
            >
              {initializing ? 'Verifying PIN...' : 'Join Shared Cart ➔'}
            </button>
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
