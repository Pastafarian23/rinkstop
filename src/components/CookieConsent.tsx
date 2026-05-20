'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('cookie_consent');
    if (!stored) {
      // Small delay so it doesn't flash on page load
      setTimeout(() => setVisible(true), 800);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: '#041E42',
      borderTop: '2px solid #C8102E',
      padding: '1rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1.5rem',
      flexWrap: 'wrap',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
    }}>
      <div style={{ flex: '1 1 300px' }}>
        <p style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: '0.875rem',
          lineHeight: 1.5,
          margin: 0,
        }}>
          RinkStop uses cookies and similar technologies to deliver a better browsing experience,
          analyze site traffic, and personalize content. We also share information about your
          use of our site with our advertising and analytics partners.{' '}
          <Link href="/privacy" style={{ color: '#C8102E', textDecoration: 'underline' }}>
            Learn more
          </Link>
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
        <button
          onClick={decline}
          style={{
            padding: '0.5rem 1.25rem',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '4px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.8125rem',
            cursor: 'pointer',
          }}
        >
          Decline
        </button>
        <button
          onClick={accept}
          style={{
            padding: '0.5rem 1.25rem',
            background: '#C8102E',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Accept All
        </button>
      </div>
    </div>
  );
}