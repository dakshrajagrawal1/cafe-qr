import React from 'react';
import { useStaffStore } from '../stores/staffStore.js';

export type StaffTab =
  | 'orders'
  | 'tables'
  | 'kitchen'
  | 'waiter'
  | 'analytics'
  | 'offers'
  | 'settings';

interface SidebarProps {
  currentTab: StaffTab;
  onSelectTab: (tab: StaffTab) => void;
  pendingOrdersCount: number;
  onOpenBusinessDay: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingOrdersCount,
  onOpenBusinessDay,
}) => {
  const { user, soundEnabled, toggleSound, logout } = useStaffStore();
  const role = user?.role;

  const isChef = role === 'chef';
  const isWaiter = role === 'waiter';
  const isOwner = role === 'owner' || role === 'super_admin';

  return (
    <aside
      style={{
        width: 250,
        height: '100vh',
        background: 'var(--sidebar-bg)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        flexShrink: 0,
      }}
    >
      <div>
        {/* Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 8px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 18,
            }}
          >
            Q
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2, margin: 0 }}>
              {user?.cafe?.name || 'Cafe Panel'}
            </h1>
            <span style={{ fontSize: 11, color: 'var(--sidebar-text)', textTransform: 'capitalize' }}>
              {role} view
            </span>
          </div>
        </div>

        {/* Business Day Button for Owner/Manager */}
        {!isChef && !isWaiter && (
          <div style={{ marginTop: 14 }}>
            <button
              onClick={onOpenBusinessDay}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🗓️</span>
                <span>Business Day</span>
              </div>
              <span style={{ fontSize: 10, background: '#10b981', color: '#fff', padding: '1px 6px', borderRadius: 4 }}>
                Active
              </span>
            </button>
          </div>
        )}

        {/* Navigation Items based on role */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
          {/* Analytics (Owner only) */}
          {isOwner && (
            <button
              onClick={() => onSelectTab('analytics')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: currentTab === 'analytics' ? 'var(--primary)' : 'transparent',
                color: currentTab === 'analytics' ? '#ffffff' : 'var(--sidebar-text)',
                fontWeight: 700,
                fontSize: 14,
                textAlign: 'left',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18 }}>📈</span>
              <span>Overview & Sales</span>
            </button>
          )}

          {/* Orders (Manager & Owner) */}
          {!isChef && !isWaiter && (
            <button
              onClick={() => onSelectTab('orders')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: currentTab === 'orders' ? 'var(--primary)' : 'transparent',
                color: currentTab === 'orders' ? '#ffffff' : 'var(--sidebar-text)',
                fontWeight: 700,
                fontSize: 14,
                textAlign: 'left',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>🛎️</span>
                <span>Live Orders</span>
              </div>
              {pendingOrdersCount > 0 && (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 10,
                  }}
                >
                  {pendingOrdersCount}
                </span>
              )}
            </button>
          )}

          {/* Table Grid (Manager & Owner) */}
          {!isChef && !isWaiter && (
            <button
              onClick={() => onSelectTab('tables')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: currentTab === 'tables' ? 'var(--primary)' : 'transparent',
                color: currentTab === 'tables' ? '#ffffff' : 'var(--sidebar-text)',
                fontWeight: 700,
                fontSize: 14,
                textAlign: 'left',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18 }}>🪑</span>
              <span>Live Table Grid</span>
            </button>
          )}

          {/* Kitchen Display (Chef, Manager, Owner) */}
          {!isWaiter && (
            <button
              onClick={() => onSelectTab('kitchen')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: currentTab === 'kitchen' ? 'var(--primary)' : 'transparent',
                color: currentTab === 'kitchen' ? '#ffffff' : 'var(--sidebar-text)',
                fontWeight: 700,
                fontSize: 14,
                textAlign: 'left',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18 }}>🍳</span>
              <span>Kitchen Screen</span>
            </button>
          )}

          {/* Waiter View (Waiter, Manager, Owner) */}
          {!isChef && (
            <button
              onClick={() => onSelectTab('waiter')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: currentTab === 'waiter' ? 'var(--primary)' : 'transparent',
                color: currentTab === 'waiter' ? '#ffffff' : 'var(--sidebar-text)',
                fontWeight: 700,
                fontSize: 14,
                textAlign: 'left',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18 }}>🤵</span>
              <span>Waiter Screen</span>
            </button>
          )}

          {/* Offers (Manager & Owner) */}
          {!isChef && !isWaiter && (
            <button
              onClick={() => onSelectTab('offers')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: currentTab === 'offers' ? 'var(--primary)' : 'transparent',
                color: currentTab === 'offers' ? '#ffffff' : 'var(--sidebar-text)',
                fontWeight: 700,
                fontSize: 14,
                textAlign: 'left',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18 }}>🏷️</span>
              <span>Offers & Promo</span>
            </button>
          )}

          {/* Settings (Owner only) */}
          {isOwner && (
            <button
              onClick={() => onSelectTab('settings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                background: currentTab === 'settings' ? 'var(--primary)' : 'transparent',
                color: currentTab === 'settings' ? '#ffffff' : 'var(--sidebar-text)',
                fontWeight: 700,
                fontSize: 14,
                textAlign: 'left',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 18 }}>⚙️</span>
              <span>Settings</span>
            </button>
          )}
        </nav>
      </div>

      {/* Footer / Controls */}
      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 16 }}>
        <button
          onClick={toggleSound}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 10,
          }}
        >
          <span>{soundEnabled ? '🔔 Sound Alert' : '🔕 Muted'}</span>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: soundEnabled ? '#10b981' : '#ef4444',
            }}
          />
        </button>

        <div style={{ padding: '8px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: 'var(--sidebar-text)' }}>{user?.email}</div>
        </div>

        <button
          onClick={logout}
          style={{
            width: '100%',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
    </aside>
  );
};
