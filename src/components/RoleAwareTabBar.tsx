'use client';

/**
 * Mobile bottom tab bar for signed-in users.
 *
 * Simplified per Arnel 2026-07-30 — one fixed set of 4 tabs for every
 * signed-in user. No workspace switch, no role derivation. The drawer
 * (MobileNav) and the /dashboard hub page handle everything else.
 *
 * Tabs:
 *   1. Dashboard    (/dashboard)
 *   2. Profile      (/dashboard/profile)
 *   3. Passport     (/dashboard/passport)
 *   4. Notifications (/dashboard/notifications)
 *
 * Hidden on /login, /sign-*, /onboarding (auth pages where the bar
 * would clutter).
 *
 * Capacitor WebView: pointer-down fires the haptic via the same
 * navigator.vibrate fallback the previous version used.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Tab {
  href: string;
  label: string;
  icon: () => React.JSX.Element;
  match: (p: string) => boolean;
}

const TABS: Tab[] = [
  { href: '/dashboard',             label: 'Dashboard',     icon: DashboardIcon,   match: (p) => p === '/dashboard' || p.startsWith('/dashboard/') && !p.startsWith('/dashboard/profile') && !p.startsWith('/dashboard/passport') && !p.startsWith('/dashboard/notifications') },
  { href: '/dashboard/profile',     label: 'Profile',       icon: ProfileIcon,     match: (p) => p.startsWith('/dashboard/profile') },
  { href: '/dashboard/passport',    label: 'Passport',      icon: PassportIcon,    match: (p) => p.startsWith('/dashboard/passport') },
  { href: '/dashboard/notifications', label: 'Notifications', icon: BellIcon,        match: (p) => p.startsWith('/dashboard/notifications') },
];

export default function RoleAwareTabBar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname() || '/';
  const [pressedHref, setPressedHref] = useState<string | null>(null);
  const [consumerUnread, setConsumerUnread] = useState(0);

  // Hide on auth/onboarding pages — same rule as the legacy version.
  const hide =
    pathname === '/login' ||
    pathname.startsWith('/sign-') ||
    pathname === '/onboarding';
  if (hide) return null;

  // Use real auth state instead of pathname heuristics. If the server
  // says the user is signed out, do not render the tab bar.
  if (!signedIn) return null;

  function tapPressed(href: string) {
    setPressedHref(href);
    window.setTimeout(() => setPressedHref(null), 160);
  }

  // WS14 PR2: fetch consumer_notifications unread count for the badge.
  // Poll every 60s so the badge stays fresh without constant re-fetches.
  useEffect(() => {
    async function loadConsumerUnread() {
      try {
        const r = await fetch('/api/consumer-notifications/unread-count');
        if (r.ok) {
          const d = await r.json();
          setConsumerUnread(d.unread ?? 0);
        }
      } catch { /* silent — badge is non-critical */ }
    }
    loadConsumerUnread();
    const id = setInterval(loadConsumerUnread, 60_000);
    return () => clearInterval(id);
  }, []);

  function tapHaptic() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(10); } catch { /* noop */ }
    }
  }

  return (
    <nav className="mob-bottom-tabbar" aria-label="Bottom navigation">
      {TABS.map(tab => {
        const active = tab.match(pathname);
        const showBadge = tab.href === '/dashboard/notifications' && consumerUnread > 0;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`mob-tab ${active ? 'mob-tab-active' : ''} ${pressedHref === tab.href ? 'mob-tab-pressed' : ''}`}
            aria-current={active ? 'page' : undefined}
            aria-label={showBadge ? `${tab.label} (${consumerUnread} unread)` : tab.label}
            onPointerDown={() => { tapPressed(tab.href); tapHaptic(); }}
          >
            <span className="mob-tab-icon">
              <tab.icon />
              {showBadge && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    background: '#C8102E',
                    color: '#fff',
                    borderRadius: 999,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '0.1rem 0.4rem',
                    minWidth: 18,
                    textAlign: 'center',
                    lineHeight: 1.4,
                    border: '2px solid #041E42',
                  }}
                >
                  {consumerUnread > 99 ? '99+' : consumerUnread}
                </span>
              )}
            </span>
            <span className="mob-tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function PassportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <path d="M4 4h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <circle cx="10" cy="12" r="3" />
      <path d="M8 4v3M12 4v3" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}