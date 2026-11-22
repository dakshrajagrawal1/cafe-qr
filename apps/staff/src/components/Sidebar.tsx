import React from 'react';
import { useStaffStore } from '../stores/staffStore.js';

export type StaffTab =
  | 'dashboard'
  | 'orders'
  | 'tables'
  | 'kitchen'
  | 'waiter'
  | 'staff'
  | 'menu'
  | 'analytics'
  | 'offers'
  | 'settings'
  | 'cafes'
  | 'users'
  | 'subscriptions'
  | 'audit';

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
  const isSuperAdmin = role === 'super_admin';

  // Get user initials
  const getInitials = (name?: string) => {
    if (!name) return 'AS';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const navItemStyle = (tab: StaffTab) => {
    const isActive = currentTab === tab;
    return {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '11px 16px',
      borderRadius: 10,
      background: isActive ? '#ff6b35' : 'transparent',
      color: isActive ? '#ffffff' : '#94a3b8',
      fontWeight: isActive ? 800 : 600,
      fontSize: 14,
      textAlign: 'left' as const,
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    };
  };

  return (
    <aside
      style={{
        width: 240,
        height: '100vh',
        background: '#131926',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px 14px',
        borderRight: '1px solid #1e2638',
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      <div>
        {/* Brand: Chef Hat Icon + CafeQR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '4px 10px 22px',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
            }}
          >
            👨‍🍳
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', letterSpacing: -0.5 }}>Cafe</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#ff6b35', letterSpacing: -0.5 }}>QR</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          {/* 1. Dashboard (Universal) */}
          <button
            onClick={() => onSelectTab('dashboard')}
            style={navItemStyle('dashboard')}
          >
            <span style={{ fontSize: 17 }}>📊</span>
            <span>Dashboard</span>
          </button>

          {/* SUPER ADMIN SPECIFIC TABS */}
          {isSuperAdmin ? (
            <>
              <button onClick={() => onSelectTab('cafes')} style={navItemStyle('cafes')}>
                <span style={{ fontSize: 17 }}>🏪</span>
                <span>Cafes</span>
              </button>
              <button onClick={() => onSelectTab('users')} style={navItemStyle('users')}>
                <span style={{ fontSize: 17 }}>👥</span>
                <span>Users</span>
              </button>
              <button onClick={() => onSelectTab('subscriptions')} style={navItemStyle('subscriptions')}>
                <span style={{ fontSize: 17 }}>💳</span>
                <span>Subscriptions</span>
              </button>
              <button onClick={() => onSelectTab('analytics')} style={navItemStyle('analytics')}>
                <span style={{ fontSize: 17 }}>📈</span>
                <span>Analytics</span>
              </button>
              <button onClick={() => onSelectTab('audit')} style={navItemStyle('audit')}>
                <span style={{ fontSize: 17 }}>📜</span>
                <span>Audit Logs</span>
              </button>
              <button onClick={() => onSelectTab('settings')} style={navItemStyle('settings')}>
                <span style={{ fontSize: 17 }}>⚙️</span>
                <span>Settings</span>
              </button>
            </>
          ) : (
            /* CAFE STAFF / OWNER / MANAGER SPECIFIC TABS */
            <>
              {!isChef && !isWaiter && (
                <button onClick={() => onSelectTab('orders')} style={navItemStyle('orders')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 17 }}>🛎️</span>
                      <span>Orders</span>
                    </div>
                    {pendingOrdersCount > 0 && (
                      <span style={{ background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 10 }}>
                        {pendingOrdersCount}
                      </span>
                    )}
                  </div>
                </button>
              )}

              {!isChef && !isWaiter && (
                <button onClick={() => onSelectTab('tables')} style={navItemStyle('tables')}>
                  <span style={{ fontSize: 17 }}>🪑</span>
                  <span>Tables</span>
                </button>
              )}

              {!isWaiter && (
                <button onClick={() => onSelectTab('kitchen')} style={navItemStyle('kitchen')}>
                  <span style={{ fontSize: 17 }}>🍳</span>
                  <span>Kitchen</span>
                </button>
              )}

              {!isChef && (
                <button onClick={() => onSelectTab('waiter')} style={navItemStyle('waiter')}>
                  <span style={{ fontSize: 17 }}>🤵</span>
                  <span>Staff</span>
                </button>
              )}

              {!isChef && !isWaiter && (
                <button onClick={() => onSelectTab('menu')} style={navItemStyle('menu')}>
                  <span style={{ fontSize: 17 }}>📖</span>
                  <span>Menu</span>
                </button>
              )}

              {!isChef && !isWaiter && (
                <button onClick={() => onSelectTab('analytics')} style={navItemStyle('analytics')}>
                  <span style={{ fontSize: 17 }}>📈</span>
                  <span>Analytics</span>
                </button>
              )}

              {!isChef && !isWaiter && (
                <button onClick={() => onSelectTab('settings')} style={navItemStyle('settings')}>
                  <span style={{ fontSize: 17 }}>⚙️</span>
                  <span>Settings</span>
                </button>
              )}
            </>
          )}
        </nav>
      </div>

      {/* Footer Area: Business Day & User Profile */}
      <div>
        {/* Business Day Button for Owner/Manager */}
        {!isChef && !isWaiter && !isSuperAdmin && (
          <button
            onClick={onOpenBusinessDay}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 10,
              background: '#1e2638',
              color: '#cbd5e1',
              border: '1px solid #2d3748',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              marginBottom: 12,
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
        )}

        {/* User Profile Pill at Bottom */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            background: '#1e2638',
            borderRadius: 12,
            border: '1px solid #2d3748',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#ff6b35',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              {getInitials(user?.name)}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>
                {user?.name || (isSuperAdmin ? 'Super Admin' : 'Amit Sharma')}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>
                {user?.role === 'super_admin' ? 'Super Admin' : user?.role || 'Manager'}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            style={{
              background: 'transparent',
              color: '#94a3b8',
              fontSize: 14,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  );
};
