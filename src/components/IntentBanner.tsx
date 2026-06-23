'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

type ViewState =
  | { kind: 'hidden' }                      // not the right surface or dismissed
  | { kind: 'anon_returning' }              // anonymous, 2+ counted views this session
  | { kind: 'signed_in_no_favs' };          // signed in, no favorites yet

interface IntentBannerProps {
  /** Current path — passed to the post-signup redirect. If omitted,
   *  reads window.location.pathname on the client. */
  currentPath?: string;
}

const VIEW_COUNT_KEY = 'rinkstop_directory_views_session';
const DISMISS_KEY = 'rinkstop_intent_banner_dismissed_v1';
const DISMISS_HOURS = 6;
const VIEW_THRESHOLD = 2;       // show "returning" copy after 2+ page views this session

// Only count directory pages toward the "you've checked out N listings"
// copy. Auth/dashboard pages are excluded because:
// - They're not listings (the copy would be misleading)
// - The banner is a signup CTA — useless on /sign-up, /login
// - Dashboard pages are post-signup, the banner should be hidden
// - /pricing is the comparison page; pitching them to sign up is weird
// - /blog/* articles count (they're part of the discovery funnel)
const COUNTED_PREFIXES = ['/directory/', '/blog/'];

// Suppress the banner entirely on these paths. The funnel is past the
// point where the banner is useful (or already done).
const SUPPRESS_PREFIXES = [
  '/sign-up', '/login', '/forgot-password', '/reset-password',
  '/dashboard', '/onboarding', '/sso-callback',
  '/api', '/_next',
];

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

  const { isLoaded, isSignedIn } = useUser();
  const [state, setState] = useState<ViewState>({ kind: 'hidden' });

  useEffect(() => {
    // 0. Suppress on auth/dashboard/etc. paths. The banner is a signup
    // CTA — useless where the user is already in the funnel.
    // Use functional state update to avoid redundant re-renders.
    const path = currentPathProp || (typeof window !== 'undefined' ? window.location.pathname : '/');
    if (SUPPRESS_PREFIXES.some(p => path.startsWith(p))) {
      setState(prev => prev.kind === 'hidden' ? prev : { kind: 'hidden' });
      return;
    }

    // 1. Increment this-session view count, BUT only on counted paths.
    // The key is suffixed with the session-start timestamp so it auto-
    // resets when the user closes and reopens the browser.
    let viewCount = 0;
    const isCountedPage = COUNTED_PREFIXES.some(p => path.startsWith(p));
    if (isCountedPage) {
      try {
        const sessionKey = `${VIEW_COUNT_KEY}_${getSessionId()}`;
        viewCount = parseInt(localStorage.getItem(sessionKey) || '0', 10) || 0;
        viewCount += 1;
        localStorage.setItem(sessionKey, String(viewCount));
      } catch { /* localStorage blocked — just keep viewCount in memory */ }
    }

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
      setState(prev => prev.kind === 'hidden' ? prev : { kind: 'hidden' });
      return;
    }

    // 3. Decide variant. First, wait for Clerk to load.
    if (!isLoaded) return;

    // Signed-in path: poll favorites count
    if (isSignedIn) {
      fetch('/api/favorites', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d) { setState(prev => prev.kind === 'hidden' ? prev : { kind: 'hidden' }); return; }
          const favs = d.favorites || [];
          if (favs.length === 0) {
            setState(prev => prev.kind === 'signed_in_no_favs' ? prev : { kind: 'signed_in_no_favs' });
          } else {
            setState(prev => prev.kind === 'hidden' ? prev : { kind: 'hidden' }); // active user, don't nag
          }
        })
        .catch(() => setState(prev => prev.kind === 'hidden' ? prev : { kind: 'hidden' }));
      return;
    }

    // Anonymous path. Show the banner immediately on the 2nd counted
    // page view (viewCount starts at 1 for the first counted page in
    // the session, so we need >= 2 to mean "the user has looked at
    // 2 listings this session").
    const targetState: ViewState = viewCount >= VIEW_THRESHOLD
      ? { kind: 'anon_returning' }
      : { kind: 'hidden' };
    setState(prev => JSON.stringify(prev) === JSON.stringify(targetState) ? prev : targetState);
  }, [isLoaded, isSignedIn, currentPathProp]);

  // (The original spec included a 4-second delay on the first view, but
  // the banner is more useful as a passive surface that appears on the
  // second counted view immediately. The original delay logic was dead
  // code; the new path increments a session-scoped counter on
  // /directory/* and /blog/* pages only, then shows on view 2+.)

  function handleDismiss() {
    try { localStorage.setItem(DISMISS_KEY, Date.now().toString()); } catch {}
    setState(prev => prev.kind === 'hidden' ? prev : { kind: 'hidden' });
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
          onClick={handleDismiss}
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
    // Read this session's view count for the "N listings" copy. The key
    // is suffixed with the session id so a fresh browser session starts
    // back at 0 (no more "you've checked out 100 listings" after a year).
    let count = 0;
    try { count = parseInt(localStorage.getItem(`${VIEW_COUNT_KEY}_${getSessionId()}`) || '0', 10) || 0; } catch {}
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
  return null;
}

// Session id — persists for the lifetime of the browser tab, resets on
// new tab/browser. We use a date-based key so storage is self-cleaning:
// old session keys just sit there (a few hundred bytes), and a new
// session gets a new key.
function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  // The session id is the date the tab was opened. Persists in
  // sessionStorage (cleared on tab close) and falls back to today if
  // sessionStorage is blocked.
  try {
    let sid = sessionStorage.getItem('rinkstop_session_id');
    if (!sid) {
      sid = new Date().toISOString().slice(0, 10) + '_' + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem('rinkstop_session_id', sid);
    }
    return sid;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
