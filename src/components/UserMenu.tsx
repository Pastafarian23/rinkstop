'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { ACCOUNT_TYPE_META, getAccountTypeMeta } from './AccountTypeBadges';
import {
  WORKSPACES,
  getWorkspaceAccess,
  type WorkspaceAccess,
} from '@/lib/dashboard/workspaces';
import {
  switchWorkspace,
  getActiveWorkspace,
  migrateActiveRoleToWorkspace,
  type WorkspaceId,
} from '@/lib/dashboard/switchWorkspace';

interface UserMenuProps {
  initials: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  size?: number;
  /**
   * Account types from profile_account_types. Used to render a role-switcher
   * in the menu (Day 4 — Instagram-style multi-profile switching).
   */
  accountTypes?: Array<{ account_type: string; is_primary: boolean }>;
  /** Currently active role (drives the tab bar). */
  activeRole?: string | null;
  /**
   * User tier (drives the workspace switcher — Personal is always available,
   * Organization requires club_starter, Business requires business_listing).
   */
  userTier?: string | null;
}

/**
 * Replaces the two-ambiguous-circles pattern in the dashboard header.
 *
 * Background: in 6d82f9d I shipped two adjacent red A circles — one linking
 * to /dashboard/profile and the other calling signOut(). Arnel correctly
 * flagged that two same-styled red circles is not an intuitive UI. This
 * component merges them into a single avatar button that opens a menu with
 * labeled options.
 *
 * Why a custom popover, not Clerk's <UserButton>:
 * - Clerk's <UserButton> was throwing during RSC stream on 2026-06-16
 *   (digest 1026421780). A Client Component popover avoids the same trap.
 * - Built on useClerk().signOut() — the same hook <UserButton> uses.
 * - Click-outside / Escape handling are pure DOM, no RSC concerns.
 *
 * a11y:
 * - button[aria-haspopup="menu"] + aria-expanded
 * - role="menu" on the popover, role="menuitem" on items
 * - Escape closes, focus returns to the button
 */
export default function UserMenu({
  initials,
  displayName,
  email,
  avatarUrl,
  size = 40,
  accountTypes = [],
  activeRole = null,
  userTier = 'free',
}: UserMenuProps) {
  const { signOut } = useClerk();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // Step 5 — workspace switcher. Migrate from legacy active_role on mount.
  // The active workspace is stored in localStorage; this state holds the
  // value once we've read it. Initialized lazily so SSR doesn't crash.
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId | null>(null);
  useEffect(() => {
    // Run migration first (idempotent), then read.
    migrateActiveRoleToWorkspace();
    setActiveWorkspace(getActiveWorkspace());
  }, []);

  function switchRole(role: string) {
    try {
      window.localStorage.setItem('rinkstop_active_role', role);
    } catch { /* noop */ }
    setOpen(false);
    // Reload the page so RoleAwareTabBar re-reads localStorage and re-renders.
    // router.refresh() alone won't work because localStorage is read on mount.
    window.location.reload();
  }
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    try {
      await signOut({ redirectUrl: '/' });
      router.push('/');
      router.refresh();
    } catch {
      window.location.href = '/';
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Open menu for ${displayName}`}
        data-testid="user-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'transparent',
          border: '2px solid #C8102E',
          padding: 0,
          cursor: 'pointer',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #C8102E 0%, #8b0a1e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: size * 0.45,
              letterSpacing: '0.04em',
            }}
          >
            {(initials || '?').toUpperCase()}
          </div>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account menu"
          data-testid="user-menu-popover"
          className="dashboard-dropdown-panel"
          style={{
            position: 'absolute',
            top: `calc(${size}px + 8px)`,
            right: 0,
            // Day 7: clamp width to viewport so the popover never bleeds
            // off-screen on narrow viewports.
            width: 'min(280px, calc(100vw - 2rem))',
            minWidth: 240,
            background: '#0f0f0f',
            border: '1px solid #1e1e1e',
            borderRadius: 10,
            boxShadow: '0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(200,16,46,0.15)',
            padding: '0.5rem',
            zIndex: 50,
          }}
        >
          <div
            style={{
              padding: '0.625rem 0.75rem',
              borderBottom: '1px solid #1e1e1e',
              marginBottom: '0.375rem',
            }}
          >
            <p
              style={{
                color: '#fff',
                fontWeight: 600,
                margin: 0,
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                letterSpacing: '0.04em',
                fontSize: '1rem',
              }}
            >
              {displayName}
            </p>
            <p
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '0.75rem',
                margin: '0.125rem 0 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {email}
            </p>
          </div>

          <Link
            href="/dashboard/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0.55rem 0.75rem',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: 6,
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 16 }}>👤</span>
            <span>Edit profile</span>
          </Link>

          <Link
            href="/dashboard/subscription"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0.55rem 0.75rem',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: 6,
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 16 }}>⭐</span>
            <span>Subscription</span>
          </Link>

          <Link
            href="/dashboard/support"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0.55rem 0.75rem',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: 6,
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 16 }}>🛟</span>
            <span>Help &amp; support</span>
          </Link>

          {/* Day 4: Role switcher (Instagram-style profile switching). */}
          {accountTypes.length > 1 && (
            <>
              <div
                style={{
                  height: 1,
                  background: '#1e1e1e',
                  margin: '0.375rem 0',
                }}
              />
              <p
                style={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '0.5rem 0.75rem 0.25rem',
                  margin: 0,
                }}
              >
                Switch workspace
              </p>
              {(() => {
                // Step 5 — workspace switcher. Show workspaces the user has
                // access to based on account types + tier. Hidden = no entry,
                // never locked here (the hub shows locked workspaces).
                const typeStrings = accountTypes.map(t => t.account_type);
                // Inline tierAtLeast for workspace gating. Mirrors the logic
                // in getWorkspaceAccess() — duplicated here to avoid a heavy
                // import of tierAtLeast from lib/connections.
                const tierRank: Record<string, number> = {
                  free: 0,
                  verified_identity: 1,
                  identity_plus: 2,
                  business_listing: 1,
                  business_plus: 2,
                };
                const userRank = tierRank[userTier || 'free'] ?? 0;
                const meets = (min: string | null) => !min || (tierRank[min] ?? 0) <= userRank;
                const access = WORKSPACES.map(ws => {
                  const unlocked =
                    ws.requiredAccountTypes.length === 0 ||
                    ws.requiredAccountTypes.some(t => typeStrings.includes(t));
                  const fullyAvailable = unlocked && meets(ws.minTier);
                  return { workspace: ws, unlocked, fullyAvailable };
                }).filter(a => a.unlocked);
                if (access.length === 0) return null;
                if (access.length === 1 && access[0].workspace.id === 'personal') {
                  return (
                    <div
                      data-testid="user-menu-workspace-section"
                      style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                    >
                      You only have one workspace — Personal
                    </div>
                  );
                }
                return (
                  <div data-testid="user-menu-workspace-section">
                    {access.map(({ workspace: ws, fullyAvailable }) => {
                      const isActive = activeWorkspace === ws.id;
                      return (
                        <button
                          key={ws.id}
                          type="button"
                          role="menuitem"
                          onClick={() => switchWorkspace(ws.id)}
                          disabled={isActive || !fullyAvailable}
                          data-testid={`user-menu-workspace-${ws.id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '0.55rem 0.75rem',
                            color: isActive ? 'rgba(255,255,255,0.45)' : '#fff',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: isActive ? 'default' : 'pointer',
                            width: '100%',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <span aria-hidden style={{ fontSize: '1rem' }}>{ws.icon}</span>
                          <span style={{ flex: 1 }}>{ws.name}</span>
                          {!fullyAvailable ? <span aria-label="locked">🔒</span> : null}
                          {isActive ? <span aria-label="active" style={{ color: '#14B8A6' }}>✓</span> : null}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
              <div
                style={{
                  height: 1,
                  background: '#1e1e1e',
                  margin: '0.375rem 0',
                }}
              />
              <p
                style={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '0.5rem 0.75rem 0.25rem',
                  margin: 0,
                }}
              >
                Switch role
              </p>
              {accountTypes.map(t => {
                const meta = getAccountTypeMeta(t.account_type);
                const isActive = (activeRole || t.account_type) === t.account_type;
                return (
                  <button
                    key={t.account_type}
                    type="button"
                    role="menuitem"
                    onClick={() => switchRole(t.account_type)}
                    disabled={isActive}
                    data-testid={`user-menu-role-${t.account_type}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '0.55rem 0.75rem',
                      color: isActive ? 'rgba(255,255,255,0.45)' : '#fff',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      cursor: isActive ? 'default' : 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span aria-hidden="true" style={{ fontSize: 16 }}>{meta.emoji}</span>
                    <span style={{ flex: 1 }}>{meta.label}</span>
                    {t.is_primary && (
                      <span
                        style={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          color: '#FFB81C',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        Primary
                      </span>
                    )}
                    {isActive && (
                      <span aria-hidden="true" style={{ fontSize: 14, color: '#FFB81C' }}>✓</span>
                    )}
                  </button>
                );
              })}
            </>
          )}

          <div
            style={{
              height: 1,
              background: '#1e1e1e',
              margin: '0.375rem 0',
            }}
          />

          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={handleSignOut}
            data-testid="user-menu-signout"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0.55rem 0.75rem',
              color: busy ? 'rgba(255,255,255,0.4)' : '#fff',
              background: 'transparent',
              border: 'none',
              borderRadius: 6,
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: busy ? 'wait' : 'pointer',
              width: '100%',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              if (!busy) e.currentTarget.style.background = 'rgba(200,16,46,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 16 }}>↩</span>
            <span>{busy ? 'Signing out…' : 'Sign out'}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
