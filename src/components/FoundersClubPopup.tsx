'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface FoundersClubPopupProps {
  frequency?: 'always' | 'once' | 'weekly';
  entityType?: string;
  entityId?: string;
}

// Day 7 hotfix (2026-06-23 20:55 CDT, Arnel): the popup was mounting on
// /sign-up and /login pages, where it stacked on top of the Clerk form and
// produced React #300 ("render was interrupted by another render"). The
// modal also has z-index 1000, which covers any UI Clerk tries to mount
// beneath it. Both bugs are solved by suppressing the popup on auth pages —
// which is also correct product behavior, because pitching "Join Free" to
// someone who is already on the sign-up page is redundant.
//
// Keep this list in sync with src/components/IntentBanner.tsx SUPPRESS_PREFIXES.
const SUPPRESS_PREFIXES = [
  '/sign-up',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/sso-callback',
  '/verify',
  '/onboarding',
  '/dashboard',
  '/api',
  '/_next',
];

export default function FoundersClubPopup({ frequency = 'once', entityType, entityId }: FoundersClubPopupProps) {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    // Path suppression first — the popup should never compete with auth UI
    // (which is what caused the React #300 cascade reported 2026-06-23).
    // Read on the client only; during SSR window is undefined.
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    if (SUPPRESS_PREFIXES.some(p => path.startsWith(p))) {
      return;
    }

    if (frequency === 'always') {
      setShowPopup(true);
      return;
    }
    if (frequency === 'once') {
      const hasSeen = localStorage.getItem('rinkstop_founders_popup_seen');
      setShowPopup(!hasSeen);
      if (!hasSeen) localStorage.setItem('rinkstop_founders_popup_seen', 'true');
      return;
    }
    if (frequency === 'weekly') {
      const lastSeen = localStorage.getItem('rinkstop_founders_popup_weekly');
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      if (!lastSeen || (Date.now() - parseInt(lastSeen)) >= weekMs) {
        setShowPopup(true);
        localStorage.setItem('rinkstop_founders_popup_weekly', Date.now().toString());
      }
    }
  }, [frequency]);

  if (!showPopup) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
        backdropFilter: 'blur(6px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) setShowPopup(false); }}
    >
      {/* Desktop modal */}
      <div className="founders-modal-desktop" style={{
        background: '#0B1622', border: '1px solid #C8102E',
        borderRadius: '12px', padding: '2rem',
        maxWidth: '500px', width: '100%', position: 'relative',
      }}>
        <button onClick={() => setShowPopup(false)} style={{
          position: 'absolute', top: '0.75rem', right: '0.75rem',
          background: 'none', border: 'none', color: '#555',
          fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1,
        }}>×</button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', justifyContent: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C8102E', display: 'inline-block' }} />
            <span style={{ fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.15em', color: '#C8102E', textTransform: 'uppercase' }}>RinkStop Founding Club</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C8102E', display: 'inline-block' }} />
          </div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', color: '#fff', letterSpacing: '0.04em', margin: '0 0 0.5rem' }}>
            JOIN FREE TODAY
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#888', margin: '0 auto', maxWidth: 360, lineHeight: 1.6 }}>
            Create your free account. Unlock verified profiles, save favorites, leave reviews, and more.
          </p>
        </div>

        {/* Benefits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
          {[
            '✅ Verified player, coach & team profiles',
            '✅ Save your favorite rinks & players',
            '✅ Leave reviews on any rink',
            '✅ Priority support access',
          ].map(benefit => (
            <div key={benefit} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: '#4ade80', fontSize: '1rem', flexShrink: 0 }}>{benefit.slice(0, 2)}</span>
              <span style={{ color: '#ccc', fontSize: '0.875rem' }}>{benefit.slice(2)}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link
            href="/sign-up"
            onClick={() => setShowPopup(false)}
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '0.875rem',
              background: 'linear-gradient(135deg, #FFD700 0%, #FCC419 100%)',
              borderRadius: '8px',
              color: '#000',
              fontWeight: 800,
              fontSize: '1rem',
              textDecoration: 'none',
              letterSpacing: '0.02em',
              boxShadow: '0 4px 16px rgba(255,215,0,0.25)',
            }}
          >
            Join Free →
          </Link>
          <button
            onClick={() => setShowPopup(false)}
            style={{
              background: 'none',
              border: '1px solid #1e2d3d',
              borderRadius: '8px',
              padding: '0.75rem',
              color: '#555',
              fontSize: '0.875rem',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Maybe Later
          </button>
        </div>
      </div>

      {/* Mobile modal */}
      <div className="founders-modal-mobile" style={{
        background: '#0B1622', border: '1px solid #C8102E',
        borderRadius: '12px', padding: '1.5rem',
        width: '100%', maxHeight: '92vh', overflowY: 'auto',
        position: 'relative',
      }}>
        <button onClick={() => setShowPopup(false)} style={{
          position: 'absolute', top: '0.5rem', right: '0.5rem',
          background: 'none', border: 'none', color: '#555',
          fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1,
        }}>×</button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', justifyContent: 'center' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C8102E', display: 'inline-block' }} />
            <span style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.15em', color: '#C8102E', textTransform: 'uppercase' }}>RinkStop Founding Club</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C8102E', display: 'inline-block' }} />
          </div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', margin: '0 0 0.5rem' }}>
            JOIN FREE TODAY
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.55 }}>
            Free account. Verified profiles, saved items, reviews & more.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.5rem' }}>
          {['✅ Verified profiles', '✅ Save favorites', '✅ Leave reviews', '✅ Priority support'].map(benefit => (
            <div key={benefit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#4ade80', fontSize: '0.875rem', flexShrink: 0 }}>{benefit.slice(0, 2)}</span>
              <span style={{ color: '#ccc', fontSize: '0.8rem' }}>{benefit.slice(2)}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <Link
            href="/sign-up"
            onClick={() => setShowPopup(false)}
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '0.875rem',
              background: 'linear-gradient(135deg, #FFD700 0%, #FCC419 100%)',
              borderRadius: '8px',
              color: '#000',
              fontWeight: 800,
              fontSize: '0.95rem',
              textDecoration: 'none',
              letterSpacing: '0.02em',
            }}
          >
            Join Free →
          </Link>
          <button
            onClick={() => setShowPopup(false)}
            style={{
              background: 'none',
              border: '1px solid #1e2d3d',
              borderRadius: '8px',
              padding: '0.625rem',
              color: '#555',
              fontSize: '0.8rem',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Maybe Later
          </button>
        </div>
      </div>

      <style>{`
        @media (min-width: 480px) {
          .founders-modal-mobile { display: none !important; }
          .founders-modal-desktop { display: block !important; }
        }
        @media (max-width: 479px) {
          .founders-modal-mobile { display: block !important; }
          .founders-modal-desktop { display: none !important; }
        }
      `}</style>
    </div>
  );
}