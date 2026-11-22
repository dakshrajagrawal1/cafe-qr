import React, { useState } from 'react';
import { staffApi } from '../services/staffApi.js';
import { useStaffStore } from '../stores/staffStore.js';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAuth = useStaffStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await staffApi.login({ email, password });
      setAuth(res.data.user, res.data.accessToken);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100vw', background: 'var(--sidebar-bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#ffffff', borderRadius: 16, padding: '36px 30px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 12, background: 'var(--primary)', color: '#fff', fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
            Q
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--dark)' }}>Staff Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Sign in to manage live orders and tables
          </p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 18 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Email Address</label>
            <input
              type="email"
              placeholder="owner@cafe.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 8 }}>
            {loading ? 'Signing in...' : 'Sign In ➔'}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#64748b', textAlign: 'center' }}>
          💡 <strong>Demo Credentials:</strong><br />
          Owner: <code>vikram@chaibites.com</code> / <code>Owner@12345</code><br />
          Manager: <code>manager@chaibites.com</code> / <code>Manager@12345</code>
        </div>
      </div>
    </div>
  );
};
