'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { formatTierPrice } from '@/lib/pricing';
import {
  FOUNDING_PROMO_CODE,
  FOUNDING_PROMO_MAX_REDEMPTIONS,
  FOUNDING_PROMO_PERCENT_OFF,
  FOUNDING_PROMO_RENEWAL_NOTE,
  foundingPromoFirstYearPrice,
} from '@/lib/founding-promo';

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

/**
 * localStorage key for the Founding Member promo popup.
 *
 * CHANGED 2026-11-07 from `rinkstop_founders_popup_seen` to a new key when
 * the popup's offer changed. Keeping the old key would have meant every
 * existing visitor who had already dismissed the old popup would never see
 * the new offer — which is the bug the new key fixes.
 */
const PROMO_SEEN_KEY = 'rinkstop_founding_promo_seen_v1';

/** localStorage key for the plain "Founders Club" (non-promo) popup. */
const FOUNDERS_SEEN_KEY = 'rinkstop_founders_popup_seen';

export default function FoundersClubPopup({ frequency = 'once', entityType, entityId }: FoundersClubPopupProps) {
  const [showPopup, setShowPopup] = useState(false);
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    // Path suppression first — the popup should never compete with auth UI
    // (which is what caused the React #300 cascade reported 2026-06-23).
    // Read on the client only; during SSR window is undefined.
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    if (SUPPRESS_PREFIXES.some(p => path.startsWith(p))) {
      return;
    }

    // Conflict prevention: signed-in users should never see the "Join Free" CTA.
    // UpgradeNudgePopup (z-index 1001) handles the signed-in free user flow.
    if (isSignedIn) {
      return;
    }

    if (frequency === 'always') {
      setShowPopup(true);
      return;
    }
    if (frequency === 'once') {
      // The Founding Member promo popup is the one that shows on a first
      // visit. It is gated on its OWN key so that dismissing it suppresses
      // the promo popup for good, and the legacy Founders Club key is not
      // consulted — otherwise a visitor who had seen the old popup years ago
      // would still be shown the new offer (or vice versa).
      let promoSeen: string | null = null;
      let foundersSeen: string | null = null;
      try {
        promoSeen = localStorage.getItem(PROMO_SEEN_KEY);
        foundersSeen = localStorage.getItem(FOUNDERS_SEEN_KEY);
      } catch {
        // Storage unavailable — show the popup rather than hide the offer.
      }
      const hasSeen = promoSeen === 'true' || foundersSeen === 'true';
      setShowPopup(!hasSeen);
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
  }, [frequency, isSignedIn, isLoaded]);

  /**
   * Dismissal. Marks the promo as seen so the visitor is NOT shown it again.
   *
   * "easy to dismiss" means three things here:
   *   1. the X button,
   *   2. clicking the backdrop,
   *   3. the explicit "No thanks" button.
   * All three funnel through `dismiss()` so the localStorage flag is always
   * written — there is no path where the popup closes but reappears on the
   * next page load.
   */
  const dismiss = () => {
    try {
      localStorage.setItem(PROMO_SEEN_KEY, 'true');
    } catch {
      // Private browsing / storage disabled — the popup will show again,
      // which is an acceptable degradation (no crash).
    }
    setShowPopup(false);
  };

  if (!showPopup) return null;

  const passportFull = 24.99;
  const passportFirstYear = foundingPromoFirstYearPrice('verified_identity', passportFull);

  return (
    <div
      data-testid="founding-promo-popup"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
        backdropFilter: 'blur(6px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) dismiss(); }}
    >
      {/* Desktop modal */}
      <div className="founders-modal-desktop" style={{
        background: '#0B1622', border: '1px solid #C8102E',
        borderRadius: '12px', padding: '2rem',
        maxWidth: '500px', width: '100%', position: 'relative',
      }}>
        <button onClick={dismiss} aria-label="Close" data-testid="promo-popup-close" style={{
          position: 'absolute', top: '0.75rem', right: '0.75rem',
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
          fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1,
        }}>×</button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', justifyContent: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFB81C', display: 'inline-block' }} />
            <span style={{ fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.15em', color: '#FFB81C', textTransform: 'uppercase' }}>Founding Member Promotion</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFB81C', display: 'inline-block' }} />
          </div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.5rem', color: '#fff', letterSpacing: '0.04em', margin: '0 0 0.5rem' }}>
            {FOUNDING_PROMO_PERCENT_OFF}% OFF YOUR FIRST YEAR
          </h2>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginBottom: '0.25rem' }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.25rem', color: '#FFB81C', lineHeight: 1 }}>
              ${passportFirstYear?.toFixed(2)}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>/ first year</span>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.45)', marginBottom: '0.75rem' }}>
            then {formatTierPrice('verified_identity')}/year
          </div>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', margin: '0 auto', maxWidth: 360, lineHeight: 1.6 }}>
            Claim your player profile, link unlimited roles under one identity, and unlock the only verified checkmark in hockey.
          </p>
        </div>

        {/* The three required facts */}
        <ul
          data-testid="promo-popup-points"
          style={{
            listStyle: 'none',
            margin: '0 0 1.5rem',
            display: 'flex', flexDirection: 'column', gap: '0.6rem',
            background: 'rgba(255,184,28,0.06)',
            border: '1px solid rgba(255,184,28,0.25)',
            borderRadius: 8,
            padding: '0.875rem 1rem',
          }}
        >
          {[
            `${FOUNDING_PROMO_PERCENT_OFF}% off your first annual payment`,
            `Only the first ${FOUNDING_PROMO_MAX_REDEMPTIONS} new customers get this price`,
            `${FOUNDING_PROMO_RENEWAL_NOTE} Your second year is charged at the standard price.`,
          ].map(point => (
            <li key={point} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <span style={{ color: '#4ade80', fontSize: '0.875rem', flexShrink: 0, lineHeight: 1.5 }}>✓</span>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.8125rem', lineHeight: 1.5 }}>{point}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link
            href="/pricing?tier=verified_identity"
            onClick={dismiss}
            data-testid="promo-popup-cta"
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
            Claim {FOUNDING_PROMO_PERCENT_OFF}% Off →
          </Link>
          <Link
            href="/pricing"
            onClick={dismiss}
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '0.625rem',
              color: '#FFB81C',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            See all plans
          </Link>
          <button
            onClick={dismiss}
            data-testid="promo-popup-dismiss"
            style={{
              background: 'none',
              border: 'none',
              padding: '0.5rem',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            No thanks, I&apos;ll pay full price
          </button>
          <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
            Code {FOUNDING_PROMO_CODE} applies automatically at checkout
          </div>
        </div>
      </div>

      {/* Mobile modal */}
      <div className="founders-modal-mobile" style={{
        background: '#0B1622', border: '1px solid #C8102E',
        borderRadius: '12px', padding: '1.25rem',
        width: '100%', maxWidth: '420px', maxHeight: '92vh', overflowY: 'auto',
        position: 'relative',
      }}>
        <button onClick={dismiss} aria-label="Close" data-testid="promo-popup-close-mobile" style={{
          position: 'absolute', top: '0.5rem', right: '0.5rem',
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
          fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1,
          padding: '0.25rem',
        }}>×</button>

        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', justifyContent: 'center' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFB81C', display: 'inline-block' }} />
            <span style={{ fontSize: '0.5625rem', fontWeight: 800, letterSpacing: '0.15em', color: '#FFB81C', textTransform: 'uppercase' }}>Founding Member Promotion</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFB81C', display: 'inline-block' }} />
          </div>
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', color: '#fff', letterSpacing: '0.04em', margin: '0 0 0.375rem' }}>
            {FOUNDING_PROMO_PERCENT_OFF}% OFF YOUR FIRST YEAR
          </h2>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 5, marginBottom: '0.125rem' }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: '#FFB81C', lineHeight: 1 }}>
              ${passportFirstYear?.toFixed(2)}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>/ first year</span>
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.45)', marginBottom: '0.5rem' }}>
            then {formatTierPrice('verified_identity')}/year
          </div>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, margin: 0 }}>
            Verified hockey identity, unlimited roles, the only checkmark in hockey.
          </p>
        </div>

        <ul
          style={{
            listStyle: 'none', margin: '0 0 1rem',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
            background: 'rgba(255,184,28,0.06)',
            border: '1px solid rgba(255,184,28,0.25)',
            borderRadius: 8,
            padding: '0.75rem 0.875rem',
          }}
        >
          {[
            `${FOUNDING_PROMO_PERCENT_OFF}% off your first annual payment`,
            `First ${FOUNDING_PROMO_MAX_REDEMPTIONS} new customers only`,
            `${FOUNDING_PROMO_RENEWAL_NOTE}`,
          ].map(point => (
            <li key={point} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span style={{ color: '#4ade80', fontSize: '0.8125rem', flexShrink: 0, lineHeight: 1.5 }}>✓</span>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', lineHeight: 1.45 }}>{point}</span>
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link
            href="/pricing?tier=verified_identity"
            onClick={dismiss}
            data-testid="promo-popup-cta-mobile"
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
            Claim {FOUNDING_PROMO_PERCENT_OFF}% Off →
          </Link>
          <Link
            href="/pricing"
            onClick={dismiss}
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '0.5rem',
              color: '#FFB81C',
              fontSize: '0.75rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            See all plans
          </Link>
          <button
            onClick={dismiss}
            data-testid="promo-popup-dismiss-mobile"
            style={{
              background: 'none',
              border: 'none',
              padding: '0.5rem',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            No thanks, I&apos;ll pay full price
          </button>
          <div style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
            Code {FOUNDING_PROMO_CODE} applies automatically at checkout
          </div>
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
