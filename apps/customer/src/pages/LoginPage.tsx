import React, { useState } from 'react';
import { api } from '../services/api.js';
import { useCustomerStore } from '../stores/customerStore.js';

interface LoginPageProps {
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [consentGiven, setConsentGiven] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAuth = useCustomerStore((s) => s.setAuth);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
    if (formattedPhone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendOtp(formattedPhone);
      if (res?.devOtp) {
        setOtp(res.devOtp);
      }
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;

    setLoading(true);
    try {
      const res = await api.verifyOtp(formattedPhone, otp, name.trim(), consentGiven);
      setAuth(res.data.customer, res.data.token, res.data.deviceToken);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'space-between', padding: '40px 24px' }}>
      <div>
        <div style={{ display: 'inline-block', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 16 }}>
          1-Step Verification
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)' }}>
          {step === 'phone' ? 'Enter your details' : 'Verify phone number'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6, marginBottom: 28 }}>
          {step === 'phone'
            ? 'We need your details so the cafe staff can reach you about your order.'
            : `Enter the 6-digit code sent to ${phone}`}
        </p>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', padding: '12px 14px', borderRadius: 10, fontSize: 14, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Your Name</label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Phone Number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: '0 12px', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#475569' }}>
                  +91
                </span>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
              <input
                type="checkbox"
                id="consent"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                style={{ width: 'auto', marginTop: 4 }}
              />
              <label htmlFor="consent" style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                I agree to share my phone number with the cafe so they can contact me regarding my order and updates.
              </label>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 12 }}>
              {loading ? 'Sending OTP...' : 'Send OTP ➔'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>6-Digit OTP</label>
              <input
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center', fontWeight: 700 }}
                autoFocus
                required
              />
              <p style={{ fontSize: 12, color: '#f97316', textAlign: 'center', marginTop: 8, fontWeight: 500 }}>
                💡 Local Dev Mode: Use code <strong>{otp || '123456'}</strong>
              </p>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Continue ➔'}
            </button>

            <button
              type="button"
              onClick={() => setStep('phone')}
              style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}
            >
              ← Edit Phone Number
            </button>
          </form>
        )}
      </div>

      <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
        TableQR • Fast, Secure & Contactless
      </div>
    </div>
  );
};
