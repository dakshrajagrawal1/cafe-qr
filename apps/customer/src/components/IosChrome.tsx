import React from 'react';

export const IosStatusBar: React.FC<{ overlay?: boolean }> = ({ overlay = false }) => {
  return (
    <div className={`ios-status-bar ${overlay ? 'overlay' : ''}`}>
      <span>9:41</span>
      <div className="ios-status-icons">
        {/* Signal */}
        <svg width="15" height="11" viewBox="0 0 17 11" fill="currentColor">
          <rect x="0" y="8" width="3" height="3" rx="1"/>
          <rect x="4.5" y="5" width="3" height="6" rx="1"/>
          <rect x="9" y="2.5" width="3" height="8.5" rx="1"/>
          <rect x="13.5" y="0" width="3" height="11" rx="1"/>
        </svg>
        {/* Wi-Fi */}
        <svg width="15" height="11" viewBox="0 0 16 12" fill="currentColor">
          <path d="M8 9.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM4.5 7a4.95 4.95 0 0 1 7 0 .75.75 0 0 0 1.06-1.06 6.45 6.45 0 0 0-9.12 0A.75.75 0 0 0 4.5 7zm-3-3a9.15 9.15 0 0 1 13 0 .75.75 0 1 0 1.06-1.06 10.65 10.65 0 0 0-15.12 0A.75.75 0 1 0 1.5 4z"/>
        </svg>
        {/* Battery */}
        <svg width="22" height="11" viewBox="0 0 24 12" fill="currentColor">
          <rect x="1" y="1" width="19" height="10" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="3" y="3" width="13" height="6" rx="1.5"/>
          <path d="M22 4.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
};

export const IosHomeBar: React.FC = () => {
  return <div className="ios-home-bar" />;
};
