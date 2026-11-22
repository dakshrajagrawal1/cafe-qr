import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import { useCustomerStore } from '../stores/customerStore.js';

interface LoginPageProps {
  onSuccess: () => void;
  onBack?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onBack }) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [consentGiven, setConsentGiven] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(300); // 5 mins in seconds

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const setAuth = useCustomerStore((s) => s.setAuth);
  const cafe = useCustomerStore((s) => s.cafe);

  // Timer countdown for OTP
  useEffect(() => {
    let timer: any;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const formatCountdown = () => {
    const mins = Math.floor(countdown / 60);
    const secs = countdown % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanNumber = phone.replace(/\D/g, '');
    const formattedPhone = phone.startsWith('+') ? phone : `+91${cleanNumber}`;
    if (cleanNumber.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendOtp(formattedPhone);
      if (res?.devOtp) {
        setDevOtpCode(res.devOtp);
        // Pre-fill the 6 OTP input boxes in dev mode
        const digits = res.devOtp.slice(0, 6).split('');
        while (digits.length < 6) digits.push('');
        setOtpValues(digits);
      }
      setStep('otp');
      setCountdown(300);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const digit = val.slice(-1).replace(/\D/g, '');
    const updated = [...otpValues];
    updated[index] = digit;
    setOtpValues(updated);

    // Auto-advance to next input
    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fullOtp = otpValues.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of the OTP');
      return;
    }

    const cleanNumber = phone.replace(/\D/g, '');
    const formattedPhone = phone.startsWith('+') ? phone : `+91${cleanNumber}`;

    setLoading(true);
    try {
      const res = await api.verifyOtp(formattedPhone, fullOtp, name.trim(), consentGiven);
      setAuth(res.data.customer, res.data.token, res.data.deviceToken);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const defaultHero = 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#ffffff', position: 'relative' }}>
      {/* SCREEN 2: PHONE & NAME WELCOME */}
      {step === 'phone' && (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'space-between' }}>
          <div>
            {/* Top Banner Image with Floating Logo */}
            <div
              style={{
                height: 200,
                backgroundImage: `url(${defaultHero})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.55) 100%)' }} />

              {/* Floating CafeQR Logo */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -34,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid #ffffff',
                }}
              >
                <span style={{ fontSize: 24, lineHeight: 1 }}>👨‍🍳</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#ff6b35', marginTop: 1 }}>CafeQR</span>
              </div>
            </div>

            {/* Form Container */}
            <div style={{ padding: '50px 24px 20px', textAlign: 'center' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--dark)' }}>
                Welcome to {cafe?.name || "The Foodie's Cafe"}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Let's get started</p>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginTop: 16 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24, textAlign: 'left' }}>
                {/* Name Field */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>
                    What should we call you?
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: 15, fontSize: 16, color: '#94a3b8' }}>👤</span>
                    <input
                      type="text"
                      placeholder="e.g. Vimal"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{ paddingLeft: 42 }}
                      required
                    />
                  </div>
                </div>

                {/* Phone Field */}
                <div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        padding: '0 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#334155',
                      }}
                    >
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </span>
                    <input
                      type="tel"
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={14}
                      required
                    />
                  </div>
                </div>

                {/* Consent Checkbox */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
                  <input
                    type="checkbox"
                    id="consent"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    style={{ width: 18, height: 18, marginTop: 2, accentColor: '#ff6b35', flexShrink: 0 }}
                  />
                  <label htmlFor="consent" style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    I agree to share my phone number with the cafe for order notifications & updates
                  </label>
                </div>

                {/* Trust Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: '#64748b', marginTop: 8 }}>
                  <span>🛡</span>
                  <span>We never spam or sell your information</span>
                </div>

                {/* Send OTP Button */}
                <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 12 }}>
                  <span>{loading ? 'Sending OTP...' : 'Send OTP'}</span>
                  <span style={{ fontSize: 18 }}>➔</span>
                </button>
              </form>
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '16px 20px', fontSize: 12, color: '#94a3b8' }}>
            TableQR • Fast, Secure & Contactless
          </div>
        </div>
      )}

      {/* SCREEN 3: VERIFY YOUR NUMBER (OTP) */}
      {step === 'otp' && (
        <div style={{ padding: '24px 24px 32px', display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'space-between' }}>
          <div>
            {/* Top Bar with Back Arrow */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
              <button
                onClick={() => setStep('phone')}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--dark)',
                }}
              >
                ←
              </button>
            </div>

            {/* Glowing Shield Icon */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: '50%',
                  background: '#fff2ec',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 10px rgba(255, 107, 53, 0.08), 0 0 0 20px rgba(255, 107, 53, 0.04)',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: '#ff6b35',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                  }}
                >
                  🛡
                </div>
              </div>

              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)', marginTop: 20 }}>
                Verify Your Number
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
                Enter the 6-digit OTP sent to{' '}
                <strong style={{ color: 'var(--dark)' }}>
                  {phone.startsWith('+') ? phone : `+91 ${phone.replace(/\D/g, '')}`}
                </strong>
              </p>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
                {error}
              </div>
            )}

            {/* 6 Individual OTP Boxes */}
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                {otpValues.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpInputsRef.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    style={{
                      width: 48,
                      height: 54,
                      textAlign: 'center',
                      fontSize: 22,
                      fontWeight: 800,
                      borderRadius: 12,
                      border: `1.5px solid ${digit ? '#ff6b35' : '#e2e8f0'}`,
                      background: digit ? '#fffaf8' : '#ffffff',
                      boxShadow: digit ? '0 2px 8px rgba(255, 107, 53, 0.15)' : 'var(--shadow-sm)',
                    }}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              {/* Dev Mode Banner */}
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: '#f97316', background: '#fff7ed', border: '1px solid #ffedd5', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
                  💡 Local Dev: Use code <strong>{devOtpCode || '123456'}</strong>
                </span>
              </div>

              {/* Countdown & Resend */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, color: 'var(--text-muted)' }}>
                <span>⏱</span>
                <span style={{ fontWeight: 700, color: 'var(--dark)' }}>{formatCountdown()}</span>
              </div>

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={countdown > 240}
                  style={{
                    background: 'transparent',
                    color: countdown > 240 ? '#94a3b8' : '#ff6b35',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: countdown > 240 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Resend Code
                </button>
              </div>

              {/* Verify & Continue Button */}
              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 12 }}>
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </form>
          </div>

          <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
            TableQR • Fast, Secure & Contactless
          </div>
        </div>
      )}
    </div>
  );
};
