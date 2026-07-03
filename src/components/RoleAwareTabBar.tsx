'use client';

/**
 * Workspace-aware bottom tab bar for mobile + Capacitor WebView.
 *
 * Day 4 feature (per Arnel's design 2026-06-18):
 * - Signed-out users: tab bar is hidden entirely (RinkStop = directory/news site)
 * - Signed-in users: 4 tabs based on the active workspace (read from
 *   rinkstop_active_workspace cookie + localStorage mirror)
 *
 * Step 6 (2026-07-03): TABS_BY_ROLE per-role tab sets were retired. Tabs
 * now come from WORKSPACES[activeWorkspace].subpages, filtered by tier.
 * The registry is the single source of truth. Breaking change documented
 * in the commit.
 *
 * Tab definitions live in src/lib/dashboard/workspaces.ts.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  WORKSPACES,
  getWorkspaceAccess,
} from '@/lib/dashboard/workspaces';
import { migrateActiveRoleToWorkspace, getActiveWorkspace, type WorkspaceId } from '@/lib/dashboard/switchWorkspace';
import { tierAtLeast as tierAtLeastShared } from '@/lib/tier';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------
// Step 6 (2026-07-03): TABS_BY_ROLE / DEFAULT_TABS / FREE_TIER_ONLY_KEYS were
// removed in the cleanup commit. The workspace registry (lib/dashboard/
// workspaces.ts) is the single source of truth for tab/page definitions.
// Tabs now come from WORKSPACES[active].subpages.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  userId: string | null | undefined;
  signedIn: boolean;
  /**
   * Account types from profile_account_types. Each entry is the row from the
   * table. Server-rendered dashboard layout passes these in. We do NOT fetch
   * here — keeps this component pure render.
   */
  accountTypes: Array<{ account_type: string; is_primary: boolean }>;
  /**
   * User tier from profiles.tier. 'free' / 'roster' / 'roster_plus' / 'pro' / 'business_starter' / 'business_pro' / 'business_premium' / 'enterprise'.
   */
  tier: string;
}

export default function RoleAwareTabBar({ userId: _userId, signedIn, accountTypes, tier }: Props) {
  const pathname = usePathname() || '/';
  const { isSignedIn } = useUser();
  const [pressedHref, setPressedHref] = useState<string | null>(null);

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURN.
  // Day 7 hotfix (Arnel, 2026-06-23 16:14 CDT): the previous version had
  // `if (hide) return null;` BEFORE the [activeRole, setActiveRole] useState
  // and the activeRole useEffect. When the user navigated from / to /sign-up
  // (or any auth page), the first render called all hooks, but the next
  // render on /sign-up returned null after only 3 hooks — React threw #300
  // ("Rendered fewer hooks than expected. This may be caused by an accidental
  // early return statement.") and the user landed on global-error.tsx
  // ("Something went wrong / RinkStop hit an unexpected error").
  //
  // Step 6 (2026-07-03): activeRole is now derived from the active workspace.
  // We still call migrateActiveRoleToWorkspace() to handle users with only
  // the legacy rinkstop_active_role key set (e.g. accounts that haven't
  // visited the switcher yet).
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId | null>(null);
  useEffect(() => {
    migrateActiveRoleToWorkspace();
    setActiveWorkspace(getActiveWorkspace());
  }, []);

  // Pointer events fire once per gesture (touch, pen, mouse), so a single
  // handler is the source of truth for both haptic and visual feedback.
  function tapHaptic() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(10); } catch { /* noop */ }
    }
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }

  function tapPressed(href: string) {
    setPressedHref(href);
    window.setTimeout(() => setPressedHref(null), 160);
  }

  // Hide on landing/auth pages where it would clutter.
  const hide = pathname === '/login' ||
               pathname.startsWith('/sign-') ||
               pathname === '/onboarding';

  // Step 6: tabs come from the active workspace's subpages. Falls back to
  // 'personal' if the cookie/storage is unset or the active workspace is no
  // longer unlocked (e.g. user removed the account type).
  const tabs = useMemo(() => {
    const accountTypeNames = accountTypes.map(t => t.account_type);
    const wsAccess = getWorkspaceAccess(
      accountTypeNames,
      tier || 'free',
      tierAtLeastShared,
    );
    const effective = wsAccess.find(a => a.workspace.id === (activeWorkspace || 'personal')) && wsAccess.find(a => a.workspace.id === (activeWorkspace || 'personal'))!.unlocked
      ? wsAccess.find(a => a.workspace.id === (activeWorkspace || 'personal'))!
      : wsAccess.find(a => a.workspace.id === 'personal')!;

    // Pick the first 4 subpages (already ordered by frequency-of-use in the
    // registry). Skip subpages above the user's tier.
    const result: Array<{ href: string; label: string; iconKey: string; match: (p: string) => boolean }> = [];
    for (const sub of effective.workspace.subpages) {
      if (sub.minTier && !tierAtLeastShared(tier || 'free', sub.minTier)) {
        continue;
      }
      // Skip /dashboard (Overview) since it's the entry point; on mobile the
      // first tab is usually the most-frequent task, not the home.
      if (sub.href === '/dashboard') continue;
      result.push({
        href: sub.href,
        label: sub.label,
        iconKey: sub.href,
        match: (p) => p === sub.href || p.startsWith(sub.href + '/'),
      });
      if (result.length >= 4) break;
    }
    // Always ensure at least 2 tabs (mobile UX minimum)
    if (result.length < 2) {
      const overview = {
        href: '/dashboard',
        label: 'Home',
        iconKey: '/dashboard',
        match: (p: string) => p === '/dashboard' || p.startsWith('/dashboard/'),
      };
      if (!result.find(r => r.href === '/dashboard')) {
        result.unshift(overview);
      }
    }
    return result;
  }, [activeWorkspace, accountTypes, tier]);

  // ALL HOOKS ABOVE THIS POINT. Both early returns come AFTER every hook.
  // Day 7 hotfix (Arnel, 2026-06-23 16:14 CDT, second attempt): moving only
  // the [activeRole, setActiveRole] useState above the early return was not
  // enough. The two useMemo calls for `role` and `tabs` were ALSO below
  // the early return, so on /sign-up React saw 4 hooks (pressedHref state,
  // activeRole state, activeRole effect) but on / it saw 6 hooks (the same
  // three plus role useMemo plus tabs useMemo). React #300 fires for any
  // hook-count mismatch, not just useState/useEffect. useMemo IS a hook.
  if (hide) return null;

  // Don't render if signed-out (per Arnel's design — public users get a clean
  // directory experience, no tab bar clutter).
  if (!signedIn && !isSignedIn) return null;

  return (
    <nav className="mob-bottom-tabbar" aria-label={`Bottom navigation for ${activeWorkspace || 'personal'}`}>
      {tabs.map(tab => {
        const Icon = ICONS[tab.iconKey] || ICONS.profile;
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`mob-tab ${active ? 'mob-tab-active' : ''} ${pressedHref === tab.href ? 'mob-tab-pressed' : ''}`}
            aria-current={active ? 'page' : undefined}
            onPointerDown={() => { tapPressed(tab.href); tapHaptic(); }}
          >
            <span className="mob-tab-icon"><Icon /></span>
            <span className="mob-tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Icons (inline SVG — keeps the tab bar bundle small)
// ---------------------------------------------------------------------------

const ICONS: Record<string, () => React.JSX.Element> = {
  profile: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  folder: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  news: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10M7 12h10M7 16h6" />
    </svg>
  ),
  calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  ),
  team: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M14 20a4 4 0 0 1 8 0" />
    </svg>
  ),
  feed: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1.5" fill="currentColor" />
    </svg>
  ),
  learn: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  kid: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <circle cx="12" cy="6" r="3" />
      <circle cx="7" cy="14" r="2" />
      <circle cx="17" cy="14" r="2" />
      <path d="M7 21v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  chat: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" />
    </svg>
  ),
  inbox: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  ),
  plans: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  star: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  compare: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <path d="M16 3h5v5M8 3H3v5M3 16v5h5M21 16v5h-5" />
      <path d="M21 3L14 10M3 21l7-7M21 21l-7-7M3 3l7 7" />
    </svg>
  ),
  whistle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <path d="M11 5h3l3 5h2a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4h-2l-3-5H6" />
      <circle cx="11" cy="14" r="3" />
    </svg>
  ),
  doc: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  ),
  wallet: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
      <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
      <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
    </svg>
  ),
  rink: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <rect x="2" y="6" width="20" height="12" rx="6" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  ),
  book: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  trophy: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z" />
    </svg>
  ),
  list: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  shop: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" aria-hidden="true">
      <path d="M3 9h18l-2 11H5L3 9z" />
      <path d="M16 9V5a4 4 0 0 0-8 0v4" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Step 6 (2026-07-03) -> cleanup (2026-07-03): the per-role tab sets
// (TABS_BY_ROLE / DEFAULT_TABS / FREE_TIER_ONLY_KEYS) are now removed.
// The workspace registry (lib/dashboard/workspaces.ts) is the single
// source of truth. Reference commit: see memory/2026-07-03.md.
