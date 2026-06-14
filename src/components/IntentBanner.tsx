'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

type ViewState =
  | { kind: 'hidden' }                      // not the right surface or dismissed
  | { kind: 'anon_first' }                   // anonymous, 0-1 views this session
  | { kind: 'anon_returning' }              // anonymous, 2+ views
  | { kind: 'signed_in_no_favs' };          // signed in, no favorites yet

interface IntentBannerProps {
  /** Current path — passed to the post-signup redirect. If omitted,
   *  reads window.location.pathname on the client. */
  currentPath?: string;
}

const VIEW_COUNT_KEY = 'rinkstop_directory_views';
const DISMISS_KEY = 'rinkstop_intent_banner_dismissed_v1';
const DISMISS_HOURS = 6;
const VIEW_THRESHOLD = 2;       // show "returning" copy after 2+ page views this session
const FIRST_VIEW_DELAY_MS = 4000; // don't show on first page, give them time to read

/**
 * IntentBanner — sticky bottom bar on directory detail pages that surfaces
 * a soft-signup pitch for users with intent signals.
 *
 * Variants:
 *   - Anonymous, 0-1 directory views this session: hidden (don't be the
 *     first thing they see; let them explore)
 *   - Anonymous, 2+ directory views: "You've checked out [N] rinks. Save
 *     them all in one place — free."
 *   - Signed in, 0 favorites: "Save your first rink to start tracking
 *     it. One click."
 *   - Signed in, 1+ favorites: hidden (don't nag active users)
 *
 * Dismissal: 6-hour localStorage TTL (shorter than the modal because this
 * is a passive surface, not a click action — the user might re-engage
 * later in the day).
 *
 * Detection: Clerk's useUser() for auth state, /api/favorites GET for
 * the favorites count (already exists, returns the user's saved list).
 * View count is tracked in localStorage and incremented on every mount.
 */
export default function IntentBanner({ currentPath: currentPathProp }: IntentBannerProps = {}) {
  // currentPath can be passed from a server component OR read from
  // window on the client. Default to '/' if neither is available.
  const [currentPath, setCurrentPath] = useState<string>(currentPathProp || '/');
  useEffect(() => {
    if (!currentPathProp && typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname);
    }
  }, [currentPathProp]);

  const { isLoaded, isSignedIn, user } = useUser();
  const [state, setState] = useState<ViewState>({ kind: 'hidden' });

  useEffect(() => {
    // 1. Increment this-session view count
    let viewCount = 0;
    try {
      viewCount = parseInt(localStorage.getItem(VIEW_COUNT_KEY) || '0', 10) || 0;
      viewCount += 1;
      localStorage.setItem(VIEW_COUNT_KEY, String(viewCount));
    } catch { /* localStorage blocked — just keep viewCount in memory */ }

    // 2. Check dismissal TTL
    const recentlyDismissed = (() => {
      try {
        const v = localStorage.getItem(DISMISS_KEY);
        if (!v) return false;
        const ts = parseInt(v, 10);
        if (!ts) return false;
        return Date.now() - ts < DISMISS_HOURS * 60 * 60 * 1000;
      } catch { return false; }
    })();
    if (recentlyDismissed) {
      setState({ kind: 'hidden' });
      return;
    }

    // 3. Decide variant. First, wait for Clerk to load.
    if (!isLoaded) return;

    // Signed-in path: poll favorites count
    if (isSignedIn) {
      fetch('/api/favorites', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d) { setState({ kind: 'hidden' }); return; }
          const favs = d.favorites || [];
          if (favs.length === 0) {
            setState({ kind: 'signed_in_no_favs' });
          } else {
            setState({ kind: 'hidden' }); // active user, don't nag
          }
        })
        .catch(() => setState({ kind: 'hidden' }));
      return;
    }

    // Anonymous path
    if (viewCount >= VIEW_THRESHOLD) {
      setState({ kind: 'anon_returning' });
    } else {
      // First view: hide now, then re-evaluate on a delay so the banner
      // appears AFTER they've had time to read the page (4s). This is
      // less aggressive than showing immediately.
      setState({ kind: 'anon_first' });
    }
  }, [isLoaded, isSignedIn]);

  // For anon_first, delay showing by 4s. We re-evaluate when the state changes.
  useEffect(() => {
    if (state.kind !== 'anon_first') return;
    const t = setTimeout(() => {
      // Re-check view count — user may have navigated away
      try {
        const vc = parseInt(localStorage.getItem(VIEW_COUNT_KEY) || '0', 10) || 0;
        if (vc >= VIEW_THRESHOLD) {
          setState({ kind: 'anon_returning' });
        }
        // Else keep hidden — the next page load will handle it
      } catch { /* fine */ }
    }, FIRST_VIEW_DELAY_MS);
    return () => clearTimeout(t);
  }, [state.kind]);

  function handleDismiss() {
    try { localStorage.setItem(DISMISS_KEY, Date.now().toString()); } catch {}
    setState({ kind: 'hidden' });
  }

  if (state.kind === 'hidden') return null;

  const copy = getCopy(state, currentPath);
  if (!copy) return null;

  return (
    <div
      role="region"
      aria-label="Save your progress"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        zIndex: 100,
        background: 'linear-gradient(180deg, rgba(11,22,34,0.96) 0%, rgba(11,22,34,1) 100%)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
        animation: 'intent-banner-slide-in 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes intent-banner-slide-in {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .intent-banner-cta:hover { background: #E0324E !important; }
        .intent-banner-dismiss:hover { color: #fff !important; }
        @media (max-width: 600px) {
          .intent-banner-msg { font-size: 0.85rem !important; }
          .intent-banner-cta { padding: 0.5rem 0.85rem !important; font-size: 0.85rem !important; }
        }
      `}</style>

      <div style={{
        maxWidth: 1280, margin: '0 auto',
        padding: '0.75rem 1rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>{copy.icon}</div>
        <div className="intent-banner-msg" style={{
          color: '#fff', fontSize: '0.9rem', fontWeight: 500,
          flex: 1, minWidth: 200, lineHeight: 1.4,
        }}>
          {copy.message}
        </div>
        <Link
          href={copy.ctaHref}
          className="intent-banner-cta"
          style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '0.55rem 1rem', borderRadius: 6,
            background: '#C8102E', color: '#fff',
            fontWeight: 700, fontSize: '0.875rem',
            textDecoration: 'none', transition: 'background 0.15s',
            flexShrink: 0,
          }}
        >
          {copy.cta}
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="intent-banner-dismiss"
          style={{
            background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '1.4rem', cursor: 'pointer',
            lineHeight: 1, padding: '0 0.25rem',
            transition: 'color 0.15s', flexShrink: 0,
          }}
        >×</button>
      </div>
    </div>
  );
}

function getCopy(state: Exclude<ViewState, { kind: 'hidden' }>, currentPath: string) {
  if (state.kind === 'anon_returning') {
    // Try to read view count for the "N rinks" copy
    let count = 0;
    try { count = parseInt(localStorage.getItem(VIEW_COUNT_KEY) || '0', 10) || 0; } catch {}
    return {
      icon: '🏒',
      message: count > 0
        ? `You've checked out ${count} listings. Save them all in one place — free, no card.`
        : 'Save rinks and teams you care about — free, no card.',
      cta: 'Create free account',
      ctaHref: `/sign-up?redirect_url=${encodeURIComponent(currentPath)}`,
    };
  }
  if (state.kind === 'signed_in_no_favs') {
    return {
      icon: '♡',
      message: 'Save your first rink to start tracking new games and updates.',
      cta: 'Browse rinks',
      ctaHref: '/directory/rinks',
    };
  }
  // anon_first never renders (we delay-evaluate to anon_returning or stay hidden)
  return null;
}
