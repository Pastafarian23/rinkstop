'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
}

type MeResponse = Partial<MeProfile> & {
  created_at?: string;
  // /api/profiles/me returns { profile, managedProfiles, ... }
  profile?: MeProfile;
};

/**
 * Post-login upgrade nudge. Shows once to free users (or weekly if frequency='weekly')
 * with a single, clear ask: "Join Verified Identity".
 *
 * Mounted in the root layout, but only shows on the dashboard / homepage
 * (or whatever showOnPaths lists) — never on the pricing page itself.
 *
 * Tier-aware:
 *  - If user is already on a paid tier (roster/pro/business), show nothing
 *  - If user is founding member, show nothing
 *  - If user just dismissed, show nothing until cooldown
 *
 * Idempotency: stores localStorage keys per-tier ("rinkstop_upgrade_nudge_seen_roster"),
 * not per-user. If the user clears cookies, the popup shows again — that's fine,
 * it's a free user on a clean device, not a power user with storage they care about.
 */
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

        // /api/profiles/me returns the profile nested under `profile`.
        // Fall back to flat fields in case a future endpoint returns the legacy shape.
        const profile = data.profile ?? data;
        const tier = profile?.tier;
        const isFounding = Boolean(profile?.is_founding_member);
        const subStatus = profile?.subscription_status;

        // Don't show to anyone on a paid tier or with an active subscription,
        // even if the tier field is missing or stale.
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

        {/* Badge */}
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
          Founding Member — first 500 only
        </div>

        {/* Title */}
        <h2
          id="upgrade-nudge-title"
          className="font-sport"
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 1.875rem)',
            color: '#fff', lineHeight: 1.1, margin: '0 0 0.75rem',
            letterSpacing: '0.02em',
          }}
        >
          UNLOCK RINKSTOP
        </h2>

        {/* Body — feature-first pitch */}
        <ul style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9375rem', lineHeight: 1.55, margin: '0 0 1.25rem', padding: 0, listStyle: 'none' }}>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
            <span aria-hidden style={{ color: '#FFB81C', fontWeight: 800, flexShrink: 0 }}>✓</span>
            <span><strong style={{ color: '#FFB81C' }}>Founding Member badge</strong> on your profile — permanent, first 500 only</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
            <span aria-hidden style={{ color: '#FFB81C', fontWeight: 800, flexShrink: 0 }}>✓</span>
            <span>Claim <strong style={{ color: '#FFB81C' }}>1 listing</strong> — your home rink, your kid&apos;s team, your beer-league squad</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
            <span aria-hidden style={{ color: '#FFB81C', fontWeight: 800, flexShrink: 0 }}>✓</span>
            <span>Unlimited follows and the weekly digest in your dashboard</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span aria-hidden style={{ color: '#FFB81C', fontWeight: 800, flexShrink: 0 }}>✓</span>
            <span>Manage everything from <strong style={{ color: '#FFB81C' }}>/dashboard</strong></span>
          </li>
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
              $19.99<span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', fontFamily: 'system-ui' }}> / year</span>
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              Annual plan · priced to stay
            </div>
          </div>
          <Link
            href="/pricing?tier=roster"
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
            Join Verified Identity →
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
