import React, { useState } from 'react';
import { useStaffStore } from '../stores/staffStore.js';

interface DashboardOverviewProps {
  onNavigateTab: (tab: any) => void;
}

export const DashboardOverviewPage: React.FC<DashboardOverviewProps> = ({ onNavigateTab }) => {
  const { user } = useStaffStore();
  const isSuperAdmin = user?.role === 'super_admin';
  const [selectedTableRange, setSelectedTableRange] = useState('Table 1-8');

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const displayName = user?.name ? user.name.split(' ')[0] : 'Amit';

  if (isSuperAdmin) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', overflowY: 'auto' }}>
        {/* Top Header Tab Banner */}
        <div style={{ background: '#0f172a', color: '#ffffff', padding: '6px 24px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
          <span style={{ fontSize: 16 }}>🛡️</span>
          <span>Platform Super Admin Panel</span>
        </div>

        {/* Top Bar */}
        <div style={{ background: '#ffffff', padding: '18px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>Platform Overview</h1>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>Manage your cafe network and monitor performance</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 38, height: 38, fontSize: 16, cursor: 'pointer' }}>
              🔔
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '6px 14px', borderRadius: 20, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 700 }}>
              <span>Super Admin</span>
              <span>▾</span>
            </div>
          </div>
        </div>

        {/* 4 Super Admin Stat Cards */}
        <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
          {/* Total Cafes */}
          <div style={{ background: '#ffffff', padding: '20px', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12 }}>
              🏪
            </div>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>24</span>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Total Cafes</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginTop: 8 }}>↑ +8%</div>
          </div>

          {/* Total Users */}
          <div style={{ background: '#ffffff', padding: '20px', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12 }}>
              👥
            </div>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>48.5K</span>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Total Users</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginTop: 8 }}>↑ +20%</div>
          </div>

          {/* Platform Revenue */}
          <div style={{ background: '#ffffff', padding: '20px', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#faf5ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12 }}>
              ₹
            </div>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>₹18.7L</span>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Platform Revenue</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginTop: 8 }}>↑ +22%</div>
          </div>

          {/* Success Rate */}
          <div style={{ background: '#ffffff', padding: '20px', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12 }}>
              🎯
            </div>
            <span style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>96%</span>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Success Rate</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginTop: 8 }}>↑ +1%</div>
          </div>
        </div>

        {/* Lower Row: Cafe Growth Chart + Top Cafes */}
        <div style={{ padding: '0 28px 28px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          {/* Cafe Growth Chart Card */}
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Cafe Growth</h3>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#ea580c', background: '#fff7ed', padding: '4px 10px', borderRadius: 8 }}>14.2K</span>
            </div>

            {/* SVG Area Line Chart */}
            <div style={{ height: 180, width: '100%', position: 'relative' }}>
              <svg viewBox="0 0 500 160" style={{ width: '100%', height: '100%' }}>
                <defs>
                  <linearGradient id="growthGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#ff6b35" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal Grid lines */}
                <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeDasharray="4" />
                <line x1="0" y1="80" x2="500" y2="80" stroke="#f1f5f9" strokeDasharray="4" />
                <line x1="0" y1="130" x2="500" y2="130" stroke="#f1f5f9" strokeDasharray="4" />

                {/* Fill Area */}
                <polygon
                  points="20,130 140,110 260,95 380,70 480,40 480,150 20,150"
                  fill="url(#growthGrad)"
                />

                {/* Curved Line */}
                <polyline
                  points="20,130 140,110 260,95 380,70 480,40"
                  fill="none"
                  stroke="#ff6b35"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Data Points */}
                <circle cx="20" cy="130" r="4.5" fill="#ff6b35" />
                <circle cx="140" cy="110" r="4.5" fill="#ff6b35" />
                <circle cx="260" cy="95" r="4.5" fill="#ff6b35" />
                <circle cx="380" cy="70" r="4.5" fill="#ff6b35" />
                <circle cx="480" cy="40" r="5" fill="#ff6b35" stroke="#ffffff" strokeWidth="2" />
              </svg>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginTop: 8, padding: '0 8px' }}>
                <span>Week 1</span>
                <span>Week 2</span>
                <span>Week 3</span>
                <span>Week 4</span>
              </div>
            </div>
          </div>

          {/* Top Cafes Ranked List */}
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Top Cafes</h3>
              <button onClick={() => onNavigateTab('cafes')} style={{ background: 'transparent', color: '#ff6b35', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                View All ➔
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { rank: 1, name: "The Foodie's Cafe", rev: '₹4.8L', img: '🍕' },
                { rank: 2, name: 'Brew & Bite', rev: '₹3.9L', img: '☕' },
                { rank: 3, name: 'Cafe Delight', rev: '₹3.2L', img: '🍔' },
              ].map((c) => (
                <div
                  key={c.rank}
                  onClick={() => onNavigateTab('cafes')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#64748b', width: 14 }}>{c.rank}</span>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                      {c.img}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{c.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}>{c.rev}</span>
                    <span style={{ fontSize: 12, color: '#ff6b35' }}>➔</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CAFE STAFF & MANAGEMENT DASHBOARD (OWNER / MANAGER)
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', overflowY: 'auto' }}>
      {/* Top Header Tab Banner */}
      <div style={{ background: '#0f172a', color: '#ffffff', padding: '6px 24px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
        <span style={{ fontSize: 16 }}>👨‍🍳</span>
        <span>Cafe Staff & Management App</span>
      </div>

      {/* Top Bar Greeting */}
      <div style={{ background: '#ffffff', padding: '18px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>
            {getGreeting()}, {displayName}!
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
            Here's what's happening at your cafe today.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', color: '#15803d', border: '1px solid #dcfce7', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
            <span>Open</span>
          </div>

          {/* Table Range Selector */}
          <select
            value={selectedTableRange}
            onChange={(e) => setSelectedTableRange(e.target.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: 13,
              fontWeight: 700,
              color: '#334155',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="Table 1-8">Table 1-8</option>
            <option value="Table 9-16">Table 9-16</option>
            <option value="All Tables">All Tables</option>
          </select>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
        {/* Total Orders */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12 }}>
            🛒
          </div>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>48</span>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Total Orders</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginTop: 8 }}>↑ +12%</div>
        </div>

        {/* Total Revenue */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12 }}>
            ₹
          </div>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>₹12,480</span>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Total Revenue</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginTop: 8 }}>↑ +10%</div>
        </div>

        {/* Avg Prep Time */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#faf5ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12 }}>
            ⏱
          </div>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>12 min</span>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Avg Prep Time</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginTop: 8 }}>↓ -8%</div>
        </div>

        {/* Active Tables */}
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12 }}>
            👥
          </div>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>24</span>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Active Tables</div>
        </div>
      </div>

      {/* Two Column Split: Live Orders & Table Status */}
      <div style={{ padding: '0 28px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Live Orders Card */}
        <div style={{ background: '#ffffff', padding: '22px', borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Live Orders</h3>
            <button onClick={() => onNavigateTab('orders')} style={{ background: 'transparent', color: '#ff6b35', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              View All ➔
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Order #1024 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f8fafc', borderRadius: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>#1024</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>2 mins ago</span>
                </div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>Margherita Pizza + 1 more</div>
              </div>
              <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                Preparing
              </span>
            </div>

            {/* Order #1025 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f8fafc', borderRadius: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>#1025</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>3 mins ago</span>
                </div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>Pasta Alfredo</div>
              </div>
              <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                In Kitchen
              </span>
            </div>

            {/* Order #1026 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f8fafc', borderRadius: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>#1026</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>5 mins ago</span>
                </div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>Cold Coffee</div>
              </div>
              <span style={{ background: '#faf5ff', color: '#7e22ce', border: '1px solid #f3e8ff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                Ready
              </span>
            </div>
          </div>
        </div>

        {/* Table Status Grid Card */}
        <div style={{ background: '#ffffff', padding: '22px', borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Table Status</h3>
            <button onClick={() => onNavigateTab('tables')} style={{ background: 'transparent', color: '#ff6b35', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              View All ➔
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { id: 'T1', status: 'Occupied' },
              { id: 'T2', status: 'Occupied' },
              { id: 'T3', status: 'Available' },
              { id: 'T4', status: 'Occupied' },
              { id: 'T5', status: 'Available' },
              { id: 'T6', status: 'Occupied' },
              { id: 'T7', status: 'Available' },
              { id: 'T8', status: 'Available' },
            ].map((tbl) => {
              const isOccupied = tbl.status === 'Occupied';
              return (
                <div
                  key={tbl.id}
                  style={{
                    padding: '12px 8px',
                    borderRadius: 12,
                    textAlign: 'center',
                    background: isOccupied ? '#fff7ed' : '#f0fdf4',
                    border: `1px solid ${isOccupied ? '#fed7aa' : '#bbf7d0'}`,
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 800, color: isOccupied ? '#9a3412' : '#166534' }}>
                    {tbl.id}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: isOccupied ? '#c2410c' : '#15803d', marginTop: 2 }}>
                    {tbl.status}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
