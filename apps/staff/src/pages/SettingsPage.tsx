import React, { useState, useEffect } from 'react';
import { staffApi } from '../services/staffApi.js';
import { useStaffStore } from '../stores/staffStore.js';

export const SettingsPage: React.FC = () => {
  const { user } = useStaffStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Settings State
  const [kitchenMode, setKitchenMode] = useState(false);
  const [allowPayAtEnd, setAllowPayAtEnd] = useState(true);
  const [useManagerLogin, setUseManagerLogin] = useState(false);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstPercent, setGstPercent] = useState<number>(5);
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(false);
  const [serviceChargePercent, setServiceChargePercent] = useState<number>(2.5);

  const isOwner = user?.role === 'owner' || user?.role === 'super_admin';

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await staffApi.getSettings();
        const s = res.data;
        if (s) {
          setKitchenMode(s.kitchenMode ?? false);
          setAllowPayAtEnd(s.allowPayAtEnd ?? true);
          setUseManagerLogin(s.useManagerLogin ?? false);
          setGstEnabled(s.gstEnabled ?? false);
          setGstPercent((s.gstRate || 500) / 100);
          setServiceChargeEnabled(s.serviceChargeEnabled ?? false);
          setServiceChargePercent((s.serviceChargeRate || 250) / 100);
        }
      } catch (err: any) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }

    if (isOwner) {
      fetchSettings();
    }
  }, [isOwner]);

  if (!isOwner) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
        <h3 style={{ fontSize: 20, color: 'var(--dark)' }}>Settings Restricted</h3>
        <p style={{ fontSize: 14 }}>
          Only the Cafe Owner can modify platform and billing settings.
        </p>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      await staffApi.updateSettings({
        kitchenMode,
        allowPayAtEnd,
        useManagerLogin,
        gstEnabled,
        gstRate: Math.round(gstPercent * 100),
        serviceChargeEnabled,
        serviceChargeRate: Math.round(serviceChargePercent * 100),
      });

      setSuccessMsg('Settings updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading cafe settings...
      </div>
    );
  }

  return (
    <div style={{ flex: 1, height: '100vh', overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Cafe & Platform Settings</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Configure operational modes, payment policies, taxes, and staff access rules.
        </p>
      </div>

      {successMsg && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontWeight: 700 }}>
          ✓ {successMsg}
        </div>
      )}

      <form onSubmit={handleSave} style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Card 1: Operational Modes */}
        <div style={{ background: '#ffffff', border: '1.5px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 0, marginBottom: 16 }}>
            Operational Modes
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* kitchen_mode */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', fontSize: 14 }}>Kitchen Display Mode (KDS)</strong>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  ON: Dedicated kitchen screen for chefs. OFF: Managers mark dishes ready directly.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setKitchenMode(!kitchenMode)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 20,
                  background: kitchenMode ? 'var(--primary)' : '#e2e8f0',
                  color: kitchenMode ? '#ffffff' : '#64748b',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {kitchenMode ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* allow_pay_at_end */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
              <div>
                <strong style={{ display: 'block', fontSize: 14 }}>Allow Pay at End / Cash at Counter</strong>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  ON: Foodies can order and pay later. OFF: Online payment required at order placement.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAllowPayAtEnd(!allowPayAtEnd)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 20,
                  background: allowPayAtEnd ? 'var(--primary)' : '#e2e8f0',
                  color: allowPayAtEnd ? '#ffffff' : '#64748b',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {allowPayAtEnd ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* use_manager_login */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
              <div>
                <strong style={{ display: 'block', fontSize: 14 }}>Manager Role & Permissions</strong>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  ON: Allows creating granular manager accounts. OFF: Owner manages all operations directly.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUseManagerLogin(!useManagerLogin)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 20,
                  background: useManagerLogin ? 'var(--primary)' : '#e2e8f0',
                  color: useManagerLogin ? '#ffffff' : '#64748b',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {useManagerLogin ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Taxes & Billing */}
        <div style={{ background: '#ffffff', border: '1.5px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 0, marginBottom: 16 }}>
            Taxes & Charges (INR ₹)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* GST */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <strong style={{ fontSize: 14 }}>Goods and Services Tax (GST)</strong>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block' }}>
                    Automatically applied to all customer bills
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setGstEnabled(!gstEnabled)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 20,
                    background: gstEnabled ? '#10b981' : '#e2e8f0',
                    color: gstEnabled ? '#ffffff' : '#64748b',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {gstEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {gstEnabled && (
                <div style={{ marginTop: 10, background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    GST Rate (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={28}
                    step={0.5}
                    value={gstPercent}
                    onChange={(e) => setGstPercent(Number(e.target.value))}
                    style={{ width: 120, padding: '6px 10px', borderRadius: 6 }}
                  />
                </div>
              )}
            </div>

            {/* Service Charge */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <strong style={{ fontSize: 14 }}>Service Charge</strong>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block' }}>
                    Optional discretionary service charge
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setServiceChargeEnabled(!serviceChargeEnabled)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 20,
                    background: serviceChargeEnabled ? '#10b981' : '#e2e8f0',
                    color: serviceChargeEnabled ? '#ffffff' : '#64748b',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {serviceChargeEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {serviceChargeEnabled && (
                <div style={{ marginTop: 10, background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    Service Charge Rate (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={15}
                    step={0.5}
                    value={serviceChargePercent}
                    onChange={(e) => setServiceChargePercent(Number(e.target.value))}
                    style={{ width: 120, padding: '6px 10px', borderRadius: 6 }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary"
          style={{ padding: '14px 0', fontSize: 15 }}
        >
          {saving ? 'Saving Settings...' : 'Save Settings Changes'}
        </button>
      </form>
    </div>
  );
};
