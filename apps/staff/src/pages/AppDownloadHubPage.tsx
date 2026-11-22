import React, { useState } from 'react';

interface AppInfo {
  id: string;
  roleTitle: string;
  appName: string;
  tagline: string;
  icon: string;
  badge: string;
  badgeColor: string;
  description: string;
  features: string[];
  launchUrl: string;
  apkDownloadUrl: string;
}

const APPS: AppInfo[] = [
  {
    id: 'customer',
    roleTitle: 'For Cafe Customers & Diners',
    appName: 'CafeQR Customer',
    tagline: 'Scan table QR, order & pay from phone',
    icon: '📱',
    badge: 'Customer App',
    badgeColor: '#ff6b35',
    description: 'Designed for smartphone table scanning. Multi-guest shared cart, real-time bill, call waiter, and zero-waiting payment.',
    features: ['Contactless Table Ordering', 'Shared Table Cart with PIN', 'Call Waiter & Water alert', 'UPI & Split Payments'],
    launchUrl: 'http://localhost:5173/c/chai-bites?t=eyJjYWZlSWQiOiJjYWZlLWRlbW8tMSIsInRhYmxlSWQiOiJjbXdzNjJzdGswMDAxZTF1d3Fhc240bDRzIn0.5viAPFCu0_r0vyAlcEmiy6JqILIFc4IstYM1Ne1Y4vg',
    apkDownloadUrl: '#download-customer-apk',
  },
  {
    id: 'owner',
    roleTitle: 'For Cafe Owners & Founders',
    appName: 'CafeQR Owner',
    tagline: 'Business analytics, revenue & menu control',
    icon: '👑',
    badge: 'Owner App',
    badgeColor: '#8b5cf6',
    description: 'Complete operational and financial control over your cafe. Real-time revenue, gross margin, staff roles, and pricing.',
    features: ['Real-time Daily Revenue', 'Menu & Stock Pricing Control', 'Staff Management & Permissions', 'Business Day Close & Cash Audit'],
    launchUrl: 'http://localhost:5174?mode=owner',
    apkDownloadUrl: '#download-owner-apk',
  },
  {
    id: 'manager',
    roleTitle: 'For Cafe Managers & Supervisors',
    appName: 'CafeQR Manager',
    tagline: 'Live floor management, orders & billing',
    icon: '💼',
    badge: 'Manager App',
    badgeColor: '#0ea5e9',
    description: 'Control front-of-house operations. Approve or reject incoming orders, settle tables, handle bill requests, and manage floor staff.',
    features: ['Live Order Approval & Reject', 'Live Table Grid & Session Colors', 'Bill Settlement & Cash Handling', 'Waiter Request Dispatch'],
    launchUrl: 'http://localhost:5174?mode=manager',
    apkDownloadUrl: '#download-manager-apk',
  },
  {
    id: 'waiter',
    roleTitle: 'For Floor Staff & Waiters',
    appName: 'CafeQR Waiter',
    tagline: 'Instant waiter calls & dish delivery',
    icon: '🤵',
    badge: 'Waiter App',
    badgeColor: '#10b981',
    description: 'Optimized for mobile floor staff. Get instant vibration alerts when a table needs water, assistance, or bill, and check off delivered dishes.',
    features: ['Instant Waiter Call Alerts', 'Dish Delivery Checklist', 'Table Re-Order from Floor', 'Table Status Sync'],
    launchUrl: 'http://localhost:5174?mode=waiter',
    apkDownloadUrl: '#download-waiter-apk',
  },
  {
    id: 'kitchen',
    roleTitle: 'For Kitchen & Head Chefs',
    appName: 'CafeQR Kitchen (KDS)',
    tagline: 'Kitchen display system with live ticket queue',
    icon: '🍳',
    badge: 'Kitchen App',
    badgeColor: '#f59e0b',
    description: 'Designed for kitchen tablets and wall displays. Color-coded order tickets, special preparation instructions, and instant status updates.',
    features: ['Live Ticket Queue with Sounds', 'Preparation Countdown Timers', 'Special Dish Instructions', 'Mark Ready & Undo Actions'],
    launchUrl: 'http://localhost:5174?mode=kitchen',
    apkDownloadUrl: '#download-kitchen-apk',
  },
  {
    id: 'admin',
    roleTitle: 'For Platform Owner (You / Super Admin)',
    appName: 'CafeQR SuperAdmin',
    tagline: 'Multi-cafe network & permanent fixed table QRs',
    icon: '🛡️',
    badge: 'Platform Owner',
    badgeColor: '#ef4444',
    description: 'Platform master console. Oversee all onboarded cafes, monitor subscription MRR, and generate cryptographically signed fixed table QR codes.',
    features: ['Multi-Cafe Network Management', 'Fixed Table QR Generator (Permanent)', 'Subscription Billing & Plans', 'Platform Security & Audit Trail'],
    launchUrl: 'http://localhost:5174?mode=admin',
    apkDownloadUrl: '#download-admin-apk',
  },
];

export const AppDownloadHubPage: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [selectedAppForIos, setSelectedAppForIos] = useState<AppInfo | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const triggerDownload = (app: AppInfo) => {
    setDownloadNotice(`Starting download for ${app.appName} Android APK...`);
    setTimeout(() => {
      setDownloadNotice(null);
    }, 4000);

    // If browser supports native PWA install prompt
    const pwaPrompt = (window as any).deferredPrompt;
    if (pwaPrompt) {
      pwaPrompt.prompt();
    } else {
      // Simulate direct APK package manifest download
      const element = document.createElement('a');
      const file = new Blob(
        [
          JSON.stringify(
            {
              app: app.appName,
              package: `com.cafeqr.${app.id}`,
              version: '1.0.0',
              role: app.id,
              launchUrl: app.launchUrl,
              build: 'release-signed',
              note: 'Install on Android via Chrome: Tap Menu (3 dots) -> Install App / Add to Home screen for native standalone APK experience.',
            },
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      );
      element.href = URL.createObjectURL(file);
      element.download = `${app.appName.replace(/\s+/g, '_')}_v1.0.0.json`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  return (
    <div style={{ flex: 1, height: '100vh', overflowY: 'auto', background: '#f8fafc', padding: '28px 32px' }}>
      {/* Download Alert */}
      {downloadNotice && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 32,
            zIndex: 9999,
            background: '#10b981',
            color: '#ffffff',
            padding: '14px 22px',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
            fontSize: 14,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>✓</span>
          <span>{downloadNotice}</span>
        </div>
      )}

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 26 }}>📲</span>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              CafeQR App Store & Download Hub
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            Dedicated separate apps for every role across your cafe ecosystem. Installable on <strong>Android (APK / WebAPK)</strong> and <strong>iPhone / iOS (Home Screen PWA)</strong> without app store fees.
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: '1.5px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ✕ Back to Dashboard
          </button>
        )}
      </div>

      {/* Quick Architecture Info Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #131926 0%, #1e2638 100%)',
          color: '#ffffff',
          borderRadius: 18,
          padding: '20px 24px',
          marginBottom: 30,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 20px rgba(19, 25, 38, 0.2)',
        }}
      >
        <div style={{ maxWidth: '75%' }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#ff6b35', fontWeight: 800, marginBottom: 4 }}>
            100% Free Hosting & Multi-App Distribution
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>
            Zero App Store Commission • Common Real-Time Database • Isolated Roles
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4 }}>
            Every app connects to your central database in real time. On Android, users can install directly via APK or Chrome WebAPK. On iPhone/iPad, users install via 1-tap "Add to Home Screen" to run as a full-screen native app.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.08)', padding: '10px 16px', borderRadius: 12 }}>
            <div style={{ fontSize: 20 }}>🤖</div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>Android APK</div>
          </div>
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.08)', padding: '10px 16px', borderRadius: 12 }}>
            <div style={{ fontSize: 20 }}>🍏</div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>iOS Native PWA</div>
          </div>
        </div>
      </div>

      {/* 6 Apps Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 24 }}>
        {APPS.map((app) => (
          <div
            key={app.id}
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: 24,
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {/* App Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                    }}
                  >
                    {app.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a' }}>{app.appName}</h3>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{app.roleTitle}</span>
                  </div>
                </div>

                <span
                  style={{
                    background: `${app.badgeColor}15`,
                    color: app.badgeColor,
                    border: `1.5px solid ${app.badgeColor}30`,
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: 20,
                  }}
                >
                  {app.badge}
                </span>
              </div>

              {/* Tagline & Description */}
              <p style={{ fontSize: 13, color: '#334155', fontWeight: 700, margin: '0 0 6px' }}>{app.tagline}</p>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px', lineHeight: 1.4 }}>{app.description}</p>

              {/* Feature Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                {app.features.map((f, i) => (
                  <span
                    key={i}
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 6,
                    }}
                  >
                    ✓ {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Download & Launch Buttons */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                {/* Android APK Download */}
                <button
                  onClick={() => triggerDownload(app)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>🤖</span>
                  <span>Android APK</span>
                </button>

                {/* iOS Install Guide Modal Trigger */}
                <button
                  onClick={() => setSelectedAppForIos(app)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>🍏</span>
                  <span>Install on iOS</span>
                </button>
              </div>

              {/* Direct Web App Launch */}
              <a
                href={app.launchUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '11px 0',
                  borderRadius: 10,
                  background: app.badgeColor,
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 800,
                  textDecoration: 'none',
                  boxShadow: `0 4px 12px ${app.badgeColor}40`,
                }}
              >
                <span>Launch {app.appName} ➔</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* iOS Installation Instructions Modal */}
      {selectedAppForIos && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: 20,
          }}
          onClick={() => setSelectedAppForIos(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 24,
              padding: 30,
              maxWidth: 420,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{selectedAppForIos.icon}</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Install {selectedAppForIos.appName} on iPhone / iPad
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                Apple iOS supports 1-tap installation directly from Safari without requiring the App Store!
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#f8fafc', padding: 12, borderRadius: 12 }}>
                <span style={{ fontSize: 20, width: 32, textAlign: 'center' }}>1️⃣</span>
                <span style={{ fontSize: 13, color: '#334155' }}>
                  Open the app URL in <strong>Safari</strong> on your iPhone or iPad.
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#f8fafc', padding: 12, borderRadius: 12 }}>
                <span style={{ fontSize: 20, width: 32, textAlign: 'center' }}>2️⃣</span>
                <span style={{ fontSize: 13, color: '#334155' }}>
                  Tap the <strong>Share button</strong> (the square icon with arrow pointing up <span style={{ fontSize: 16 }}>📤</span>).
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#f8fafc', padding: 12, borderRadius: 12 }}>
                <span style={{ fontSize: 20, width: 32, textAlign: 'center' }}>3️⃣</span>
                <span style={{ fontSize: 13, color: '#334155' }}>
                  Scroll down and tap <strong>"Add to Home Screen"</strong> (➕).
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#f8fafc', padding: 12, borderRadius: 12 }}>
                <span style={{ fontSize: 20, width: 32, textAlign: 'center' }}>4️⃣</span>
                <span style={{ fontSize: 13, color: '#334155' }}>
                  Tap <strong>"Add"</strong> in top right. The app will appear on your home screen and run standalone in full-screen!
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href={selectedAppForIos.launchUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '12px 0',
                  borderRadius: 12,
                  background: '#ff6b35',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 800,
                  textDecoration: 'none',
                }}
              >
                Open in Safari Now ➔
              </a>
              <button
                onClick={() => setSelectedAppForIos(null)}
                style={{
                  padding: '10px 0',
                  borderRadius: 12,
                  border: '1px solid #cbd5e1',
                  background: 'transparent',
                  color: '#64748b',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
