'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatTierPricePerYear, TIERS, TierName } from '@/lib/pricing';

interface UpgradeNudgePopupProps {
  /** When the popup should fire. 'once' = until dismissed; 'weekly' = 7-day cooldown. */
  frequency?: 'once' | 'weekly';
  /** Pages where the popup is allowed to show. Defaults to ['/dashboard', '/']. */
  showOnPaths?: string[];
  /** Suppress popup entirely (e.g. on pricing page, welcome page, or after dismiss). */
  disabled?: boolean;
}

interface MeProfile {
  user_id: string;
  tier: string;
  is_founding_member?: boolean;
  subscription_status?: string;
  created_at?: string;
}

type MeResponse = Partial<MeProfile> & {
  created_at?: string;
  profile?: MeProfile;
};

// Tier the popup promotes. Single source of truth: TIERS.verified_identity in
// src/lib/pricing.ts. If we change the tier, the title, price, features, and
// CTA href all update automatically.
const PROMOTED_TIER: TierName = 'verified_identity';
const PROMOTED = TIERS[PROMOTED_TIER];

/**
 * Post-login upgrade nudge. Shows once to free users (or weekly if frequency='weekly')
 * with a single, clear ask: upgrade to Verified Identity.
 *
 * Mounted in the root layout, but only shows on the dashboard / homepage
 * (or whatever showOnPaths lists) — never on the pricing page itself, the
 * welcome page, or auth pages.
 *
 * Tier-aware:
 *  - If user is already on a paid tier, show nothing
 *  - If user is founding member, show nothing
 *  - If user just signed up (within last 24h), show nothing
 *  - If user just dismissed, show nothing until cooldown
 *
 * Conflict prevention:
 *  - SUPPRESS_PREFIXES ensures the popup never fires on auth, welcome, or
 *    pricing pages — those have their own UI flows.
 *  - The 24h post-signup grace period prevents this popup from stacking on
 *    top of a fresh sign-up experience.
 *  - Single modal at a time (z-index 1001, above FoundersClubPopup's 1000).
 *
 * Idempotency: stores localStorage keys for last-seen + signup grace period,
 * not per-user. If the user clears cookies, the popup shows again — that's
 * fine, it's a free user on a clean device.
 */
const SUPPRESS_PREFIXES = [
  '/sign-up', '/login', '/forgot-password', '/reset-password',
  '/sso-callback', '/verify', '/onboarding',
  '/pricing', '/partner',
  '/dashboard/welcome',
  '/api', '/_next',
];
const SIGNUP_GRACE_MS = 24 * 60 * 60 * 1000; // 24h post-signup grace period

export default function UpgradeNudgePopup({
  frequency = 'once',
  showOnPaths = ['/dashboard', '/'],
  disabled = false,
}: UpgradeNudgePopupProps) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (disabled) {
      setLoading(false);
      return;
    }

    // Path check: only show on allowed paths
    const path = window.location.pathname;
    if (SUPPRESS_PREFIXES.some(p => path === p || path.startsWith(p + '/') || path === p)) {
      setLoading(false);
      return;
    }
    const onAllowedPath = showOnPaths.some((p) => path === p || path.startsWith(p + '/') || path === p);
    if (!onAllowedPath) {
      setLoading(false);
      return;
    }

    // Cooldown check
    const lastSeen = localStorage.getItem('rinkstop_upgrade_nudge_last_seen');
    if (lastSeen) {
      const ageMs = Date.now() - parseInt(lastSeen, 10);
      if (frequency === 'once' && ageMs < 365 * 24 * 60 * 60 * 1000) {
        setLoading(false);
        return;
      }
      if (frequency === 'weekly' && ageMs < 7 * 24 * 60 * 60 * 1000) {
        setLoading(false);
        return;
      }
    }

    // Tier check: only show to free users
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/profiles/me', { cache: 'no-store' });
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data: MeResponse = await res.json();
        if (cancelled) return;

        const profile = data.profile ?? data;
        const tier = profile?.tier;
        const isFounding = Boolean(profile?.is_founding_member);
        const subStatus = profile?.subscription_status;

        // Don't show to anyone on a paid tier or with an active subscription.
        if (isFounding) {
          setLoading(false);
          return;
        }
        if (tier && tier !== 'free') {
          setLoading(false);
          return;
        }
        if (subStatus === 'active' || subStatus === 'trialing') {
          setLoading(false);
          return;
        }

        // Post-signup grace period (24h): don't pester a brand-new free user
        // with an upgrade popup right after they just created an account.
        const createdAt = profile?.created_at;
        if (createdAt) {
          const accountAgeMs = Date.now() - new Date(createdAt).getTime();
          if (accountAgeMs >= 0 && accountAgeMs < SIGNUP_GRACE_MS) {
            setLoading(false);
            return;
          }
        }

        setShow(true);
        localStorage.setItem('rinkstop_upgrade_nudge_last_seen', Date.now().toString());
      } catch {
        // Silent — don't bother the user if the API is down
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [frequency, showOnPaths, disabled]);

  const dismiss = () => setShow(false);

  if (loading || !show) return null;

  // Top 4 features from pricing.ts (single source of truth)
  const features = PROMOTED.features.slice(0, 4);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-nudge-title"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.78)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1001, // one above FoundersClubPopup (1000) so this wins
        padding: '1rem',
        backdropFilter: 'blur(6px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #041E42 0%, #0A2E5C 100%)',
          border: '1px solid rgba(255,184,28,0.4)',
          borderRadius: 16,
          maxWidth: 460,
          width: '100%',
          padding: 'clamp(1.5rem, 4vw, 2rem)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
            width: 32, height: 32,
            borderRadius: 6,
            fontSize: 18, lineHeight: 1,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ×
        </button>

        {/* Badge — names the canonical tier */}
        <div
          style={{
            display: 'inline-block',
            background: 'rgba(255,184,28,0.12)',
            color: '#FFB81C',
            fontSize: '0.625rem', fontWeight: 800,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            padding: '0.25rem 0.625rem', borderRadius: 999,
            marginBottom: '0.75rem',
          }}
        >
          {PROMOTED.label} — most popular
        </div>

        {/* Title */}
        <h2
          id="upgrade-nudge-title"
          className="font-sport"
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 1.875rem)',
            color: '#fff', lineHeight: 1.1, margin: '0 0 0.5rem',
            letterSpacing: '0.02em',
          }}
        >
          UNLOCK RINKSTOP
        </h2>

        {/* Subtitle — tagline from pricing.ts */}
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', lineHeight: 1.5, margin: '0 0 1rem' }}>
          {PROMOTED.tagline}
        </p>

        {/* Body — top 4 features from pricing.ts */}
        <ul style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9375rem', lineHeight: 1.55, margin: '0 0 1.25rem', padding: 0, listStyle: 'none' }}>
          {features.map((f, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
              <span aria-hidden style={{ color: '#FFB81C', fontWeight: 800, flexShrink: 0 }}>✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {/* Price + CTA */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, flexWrap: 'wrap', marginBottom: '0.5rem',
          }}
        >
          <div>
            <div className="font-sport" style={{ fontSize: '1.75rem', color: '#FFB81C', lineHeight: 1 }}>
              {formatTierPricePerYear(PROMOTED_TIER)}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              Annual plan · priced to stay
            </div>
          </div>
          <Link
            href={`/pricing?tier=${PROMOTED_TIER}`}
            onClick={dismiss}
            className="btn"
            style={{
              background: '#FFB81C', color: '#041E42',
              padding: '0.75rem 1.25rem',
              borderRadius: 8, border: 'none',
              fontWeight: 800, fontSize: '0.875rem',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {PROMOTED.cta} →
          </Link>
        </div>

        {/* Alt paths */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            type="button"
            onClick={dismiss}
            style={{
              background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.55)',
              fontSize: '0.8125rem', cursor: 'pointer', padding: 0,
              textDecoration: 'underline',
            }}
          >
            Maybe later
          </button>
          <Link
            href="/pricing"
            onClick={dismiss}
            style={{
              color: 'rgba(255,255,255,0.55)', fontSize: '0.8125rem',
              textDecoration: 'none',
            }}
          >
            Compare all plans →
          </Link>
        </div>
      </div>
    </div>
  );
}