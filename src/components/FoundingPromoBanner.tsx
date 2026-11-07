'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import {
  FOUNDING_PROMO_CODE,
  FOUNDING_PROMO_HEADLINE,
  FOUNDING_PROMO_MAX_REDEMPTIONS,
  FOUNDING_PROMO_PERCENT_OFF,
  foundingPromoRenewalSentence,
} from '@/lib/founding-promo';

/**
 * FoundingPromoBanner — slim promo bar under the header on every public page.
 *
 * This is the fourth surface for the Founding Member promotion, alongside:
 *   - FoundersClubPopup (first-visit modal)
 *   - /pricing page (founding-promo-banner)
 *   - /sign-up page (founding-promo-signup)
 *
 * The banner is a passive, always-visible reminder that the 50%-off offer
 * exists. It is dismissible (6-hour TTL) so it does not become wallpaper,
 * but it is NOT gated on page-view count like IntentBanner — the point is
 * that every visitor sees the offer in the header, not just the ones who
 * have already browsed 2+ listings.
 *
 * Suppression rules (mirror FoundersClubPopup):
 *   - Auth pages (/sign-up, /login, etc.) — the offer is already on those pages
 *   - Signed-in users — the offer is for NEW customers; signed-in users get
 *     UpgradeNudgePopup instead
 *   - /dashboard, /onboarding, /api, /_next — funnel is past the point
 */

const SUPPRESS_PREFIXES = [
  '/sign-up',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/sso-callback',
  '/verify',
  '/onboarding',
  '/dashboard',
  '/pricing',
  '/api',
  '/_next',
];

const DISMISS_KEY = 'rinkst…n_v1';
const DISMISS_HOURS = 6;

export default function FoundingPromoBanner() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(true); // hidden until client confirms
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    setMounted(true);

    const path = typeof window !== 'undefined' ? window.location.pathname : '';

    // Suppress on auth/dashboard paths.
    if (SUPPRESS_PREFIXES.some(p => path.startsWith(p))) {
      return;
    }

    // Suppress for signed-in users — this is a NEW-customer offer.
    if (isSignedIn) {
      return;
    }

    // Check dismissal TTL.
    try {
      const v = localStorage.getItem(DISMISS_KEY);
      if (v) {
        const ts = parseInt(v, 10);
        if (ts && Date.now() - ts < DISMISS_HOURS * 60 * 60 * 1000) {
          setDismissed(true);
          return;
        }
      }
    } catch {
      // Storage unavailable — show the banner rather than hide the offer.
    }

    setDismissed(false);
  }, [isSignedIn, isLoaded]);

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      // Private browsing / storage disabled — the banner will show again.
    }
    setDismissed(true);
  }

  // SSR shell: render nothing so the layout stays static and ISR works.
  // The banner mounts client-side only.
  if (!mounted || dismissed) return null;

  return (
    <div
      data-testid="founding-promo-header-banner"
      style={{
        background: 'linear-gradient(90deg, rgba(255,215,0,0.10) 0%, rgba(255,184,28,0.05) 100%)',
        borderBottom: '1px solid rgba(255,184,28,0.25)',
        color: '#fff',
        fontSize: '0.875rem',
        lineHeight: 1.4,
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFB81C', display: 'inline-block' }} />
          <strong style={{ color: '#FFB81C', fontWeight: 800, letterSpacing: '0.02em' }}>
            {FOUNDING_PROMO_HEADLINE}
          </strong>
        </span>

        <span style={{ color: 'rgba(255,255,255,0.7)', flex: 1, minWidth: 200 }}>
          New customers only — first {FOUNDING_PROMO_MAX_REDEMPTIONS} sign-ups. {foundingPromoRenewalSentence()}
        </span>

        <Link
          href="/pricing"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.35rem 0.875rem',
            background: '#FFB81C',
            color: '#0D1117',
            fontWeight: 800,
            fontSize: '0.8125rem',
            borderRadius: 6,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Claim {FOUNDING_PROMO_PERCENT_OFF}% Off →
        </Link>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss promo banner"
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            fontSize: '1.1rem',
            lineHeight: 1,
            padding: '0.25rem',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}