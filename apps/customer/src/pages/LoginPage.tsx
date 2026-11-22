import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import { useCustomerStore } from '../stores/customerStore.js';
import { IosStatusBar, IosHomeBar } from '../components/IosChrome.js';

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
  const [countdown, setCountdown] = useState(272); // 4:32 in seconds (matching mockup!)

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const setAuth = useCustomerStore((s) => s.setAuth);
  const cafe = useCustomerStore((s) => s.cafe);

  // Timer countdown
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
        const digits = res.devOtp.slice(0, 6).split('');
        while (digits.length < 6) digits.push('');
        setOtpValues(digits);
      }
      setStep('otp');
      setCountdown(272); // 04:32 as in mockup
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
      const res = await api.verifyOtp(formattedPhone, fullOtp, name.trim() || 'Vimal', consentGiven);
      setAuth(res.data.customer, res.data.token, res.data.deviceToken);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  // Indian biryani/bowl image matching Screen 2 mockup
  const foodBannerImage = 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=85';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#ffffff', position: 'relative' }}>
      {/* SCREEN 2: PHONE & NAME WELCOME */}
      {step === 'phone' && (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', justifyContent: 'space-between' }}>
          <div>
            {/* Top Banner Image with iOS Status Bar & Back Button */}
            <div
              style={{
                height: 220,
                backgroundImage: `url(${foodBannerImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.55) 100%)' }} />

              <IosStatusBar overlay />

              {/* Back Arrow Button */}
              {onBack && (
                <button
                  onClick={onBack}
                  style={{
                    position: 'absolute',
                    top: 48,
                    left: 20,
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.25)',
                    backdropFilter: 'blur(6px)',
                    color: '#ffffff',
                    fontSize: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 20,
                  }}
                >
                  ←
                </button>
              )}

              {/* Floating CafeQR Logo */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -36,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 78,
                  height: 78,
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3.5px solid #ffffff',
                  zIndex: 10,
                }}
              >
                <span style={{ fontSize: 26, lineHeight: 1 }}>👨‍🍳</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#ff6b35', marginTop: 1 }}>CafeQR</span>
              </div>
            </div>

            {/* Form Content */}
            <div style={{ padding: '48px 24px 16px', textAlign: 'center' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--dark)' }}>
                Welcome to {cafe?.name || "The Foodie's Cafe"}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Let's get started</p>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginTop: 16 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 22, textAlign: 'left' }}>
                {/* What should we call you? */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--dark)', marginBottom: 6 }}>
                    What should we call you?
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: 15, fontSize: 16, color: '#94a3b8' }}>👤</span>
                    <input
                      type="text"
                      placeholder="Vimal"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{ paddingLeft: 42 }}
                      required
                    />
                  </div>
                </div>

                {/* Phone Input with +91 Country Badge */}
                <div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
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
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 2 }}>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: '#64748b', marginTop: 6 }}>
                  <span>🛡</span>
                  <span>We never spam or sell your information</span>
                </div>

                {/* Send OTP Button */}
                <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 10 }}>
                  <span>{loading ? 'Sending OTP...' : 'Send OTP'}</span>
                  <span style={{ fontSize: 17 }}>➔</span>
                </button>
              </form>
            </div>
          </div>

          <div>
            <IosHomeBar />
          </div>
        </div>
      )}

      {/* SCREEN 3: VERIFY YOUR NUMBER (OTP) */}
      {step === 'otp' && (
        <div style={{ padding: '0 24px 12px', display: 'flex', flexDirection: 'column', minHeight: '100%', justifyContent: 'space-between' }}>
          <div>
            <IosStatusBar />

            {/* Back Button */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0 20px' }}>
              <button
                onClick={() => setStep('phone')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--dark)',
                  padding: 4,
                }}
              >
                ←
              </button>
            </div>

            {/* Shield Graphic with Concentric Rings */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  background: '#fff2ec',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 10px rgba(255, 107, 53, 0.08), 0 0 0 22px rgba(255, 107, 53, 0.04)',
                }}
              >
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    background: '#ff6b35',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                  }}
                >
                  🛡
                </div>
              </div>

              <h2 style={{ fontSize: 23, fontWeight: 800, color: 'var(--dark)', marginTop: 22 }}>
                Verify Your Number
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
                Enter the 6-digit OTP sent to
              </p>
              <p style={{ fontWeight: 800, color: 'var(--dark)', fontSize: 15, marginTop: 2 }}>
                {phone.startsWith('+') ? phone : `+91 ${phone.replace(/\D/g, '') || '98765 43210'}`}
              </p>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 18, textAlign: 'center' }}>
                {error}
              </div>
            )}

            {/* 6 Individual OTP Boxes */}
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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
                      width: 46,
                      height: 52,
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
                  💡 Local Dev: Code is <strong>{devOtpCode || '123456'}</strong>
                </span>
              </div>

              {/* Countdown Timer with Clock Icon */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, color: '#ff6b35' }}>
                <span>⏱</span>
                <span style={{ fontWeight: 800 }}>{formatCountdown()}</span>
              </div>

              {/* Resend Code */}
              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  style={{
                    background: 'transparent',
                    color: '#64748b',
                    fontSize: 14,
                    fontWeight: 700,
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                  }}
                >
                  Resend Code
                </button>
              </div>

              {/* Verify & Continue Button */}
              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 8 }}>
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </form>
          </div>

          <div>
            <IosHomeBar />
          </div>
        </div>
      )}
    </div>
  );
};
