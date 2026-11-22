import React, { useState, useEffect } from 'react';
import { useStaffStore } from './stores/staffStore.js';
import { LoginPage } from './pages/LoginPage.js';
import { Sidebar, StaffTab } from './components/Sidebar.js';
import { DashboardOverviewPage } from './pages/DashboardOverviewPage.js';
import { LiveOrdersPage } from './pages/LiveOrdersPage.js';
import { LiveTableGridPage } from './pages/LiveTableGridPage.js';
import { KitchenScreenPage } from './pages/KitchenScreenPage.js';
import { WaiterScreenPage } from './pages/WaiterScreenPage.js';
import { AnalyticsPage } from './pages/AnalyticsPage.js';
import { OffersPage } from './pages/OffersPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { BusinessDayModal } from './components/BusinessDayModal.js';

export const App: React.FC = () => {
  const { user } = useStaffStore();
  const [currentTab, setCurrentTab] = useState<StaffTab>('dashboard');
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [showBusinessDayModal, setShowBusinessDayModal] = useState(false);

  // Set default view by role
  useEffect(() => {
    if (user?.role === 'chef') {
      setCurrentTab('kitchen');
    } else if (user?.role === 'waiter') {
      setCurrentTab('waiter');
    } else {
      setCurrentTab('dashboard');
    }
  }, [user?.role]);

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        pendingOrdersCount={pendingOrdersCount}
        onOpenBusinessDay={() => setShowBusinessDayModal(true)}
      />

      <main style={{ flex: 1, height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
        {currentTab === 'dashboard' && (
          <DashboardOverviewPage onNavigateTab={setCurrentTab} />
        )}
        {currentTab === 'analytics' && <AnalyticsPage />}
        {currentTab === 'orders' && (
          <LiveOrdersPage onOrderCountUpdate={setPendingOrdersCount} />
        )}
        {currentTab === 'tables' && <LiveTableGridPage />}
        {currentTab === 'kitchen' && <KitchenScreenPage />}
        {currentTab === 'waiter' && <WaiterScreenPage />}
        {currentTab === 'offers' && <OffersPage />}
        {currentTab === 'settings' && <SettingsPage />}
        {/* Fallbacks for super admin directory tabs */}
        {(currentTab === 'cafes' || currentTab === 'users' || currentTab === 'subscriptions' || currentTab === 'audit') && (
          <DashboardOverviewPage onNavigateTab={setCurrentTab} />
        )}
      </main>

      {showBusinessDayModal && (
        <BusinessDayModal onClose={() => setShowBusinessDayModal(false)} />
      )}
    </div>
  );
};
