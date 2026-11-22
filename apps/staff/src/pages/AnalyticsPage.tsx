import React, { useState, useEffect } from 'react';
import { staffApi } from '../services/staffApi.js';
import { useStaffStore } from '../stores/staffStore.js';

export const AnalyticsPage: React.FC = () => {
  const { user } = useStaffStore();
  const [range, setRange] = useState<'today' | 'week' | 'month'>('today');
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const isOwner = user?.role === 'owner' || user?.role === 'super_admin';

  const fetchAnalytics = async (selectedRange: 'today' | 'week' | 'month') => {
    setLoading(true);
    try {
      const res = await staffApi.getAnalytics(selectedRange);
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchAnalytics(range);
    }
  }, [range, isOwner]);

  if (!isOwner) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
        <h3 style={{ fontSize: 20, color: 'var(--dark)' }}>Access Restricted</h3>
        <p style={{ fontSize: 14 }}>
          Financial and revenue analytics are reserved exclusively for the Cafe Owner.
        </p>
      </div>
    );
  }

  const revenue = data ? (data.totalRevenuePaise / 100).toFixed(0) : '0';
  const avgTicket = data ? (data.avgTicketPaise / 100).toFixed(0) : '0';
  const cashSales = data ? (data.paymentSplit.cashPaise / 100).toFixed(0) : '0';
  const onlineSales = data ? (data.paymentSplit.onlinePaise / 100).toFixed(0) : '0';

  return (
    <div style={{ flex: 1, height: '100vh', overflowY: 'auto', padding: '24px 32px' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Overview & Revenue Analytics</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Track sales, ticket size, payment breakdown, and popular dishes in real time.
          </p>
        </div>

        {/* Range Selector */}
        <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 10, padding: 4 }}>
          {(['today', 'week', 'month'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                background: range === r ? '#ffffff' : 'transparent',
                color: range === r ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: 13,
                border: 'none',
                cursor: 'pointer',
                boxShadow: range === r ? 'var(--shadow-sm)' : 'none',
                textTransform: 'capitalize',
              }}
            >
              {r === 'today' ? 'Today' : r === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          Loading revenue analytics...
        </div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          No analytics data available yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Stat Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 20,
            }}
          >
            {/* Total Revenue */}
            <div
              style={{
                background: '#ffffff',
                padding: 20,
                borderRadius: 14,
                border: '1.5px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>
                Total Revenue
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--primary)', marginTop: 8 }}>
                ₹{Number(revenue).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 11, color: '#10b981', marginTop: 4, fontWeight: 700 }}>
                ● Settled bills
              </div>
            </div>

            {/* Total Orders */}
            <div
              style={{
                background: '#ffffff',
                padding: 20,
                borderRadius: 14,
                border: '1.5px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>
                Total Orders Placed
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--dark)', marginTop: 8 }}>
                {data.totalOrders}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Across QR tables
              </div>
            </div>

            {/* Average Ticket Size */}
            <div
              style={{
                background: '#ffffff',
                padding: 20,
                borderRadius: 14,
                border: '1.5px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>
                Avg Order Value
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#2563eb', marginTop: 8 }}>
                ₹{Number(avgTicket).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Per table order
              </div>
            </div>

            {/* Cash vs Online Split */}
            <div
              style={{
                background: '#ffffff',
                padding: 20,
                borderRadius: 14,
                border: '1.5px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>
                Cash vs Online Split
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 14, fontWeight: 800 }}>
                <span style={{ color: '#16a34a' }}>Cash: {data.paymentSplit.cashPercent}%</span>
                <span style={{ color: '#0284c7' }}>Online: {data.paymentSplit.onlinePercent}%</span>
              </div>
              {/* Progress bar */}
              <div
                style={{
                  height: 8,
                  background: '#e2e8f0',
                  borderRadius: 4,
                  overflow: 'hidden',
                  display: 'flex',
                  marginTop: 10,
                }}
              >
                <div style={{ width: `${data.paymentSplit.cashPercent}%`, background: '#16a34a' }} />
                <div style={{ width: `${data.paymentSplit.onlinePercent}%`, background: '#0284c7' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                ₹{cashSales} cash | ₹{onlineSales} online
              </div>
            </div>
          </div>

          {/* Section 2: Revenue Timeline Bars & Top Dishes */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            {/* Timeline Bars */}
            <div
              style={{
                background: '#ffffff',
                padding: 24,
                borderRadius: 14,
                border: '1.5px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 0, marginBottom: 16 }}>
                Revenue Timeline
              </h3>

              {data.timeline.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
                  No timeline data for this period
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {data.timeline.map((slot: any, idx: number) => {
                    const maxRevenue = Math.max(...data.timeline.map((s: any) => s.revenuePaise), 1);
                    const percent = Math.round((slot.revenuePaise / maxRevenue) * 100);

                    return (
                      <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700 }}>{slot.label}</span>
                          <span style={{ color: 'var(--primary)', fontWeight: 800 }}>
                            ₹{(slot.revenuePaise / 100).toFixed(0)} ({slot.ordersCount} orders)
                          </span>
                        </div>
                        <div style={{ height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${percent}%`,
                              height: '100%',
                              background: 'var(--primary)',
                              borderRadius: 5,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top 5 Most Ordered Dishes */}
            <div
              style={{
                background: '#ffffff',
                padding: 24,
                borderRadius: 14,
                border: '1.5px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 0, marginBottom: 16 }}>
                Top Selling Dishes
              </h3>

              {data.topItems.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
                  No dish sales recorded yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {data.topItems.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: idx === 0 ? '#fef3c7' : '#f1f5f9',
                            color: idx === 0 ? '#b45309' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {item.quantity} sold
                          </div>
                        </div>
                      </div>

                      <strong style={{ fontSize: 14, color: 'var(--dark)' }}>
                        ₹{(item.revenuePaise / 100).toFixed(0)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
