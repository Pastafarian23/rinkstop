'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { getAccountTypeMeta } from '@/lib/accountTypeMeta';
import { countryFlag } from '@/lib/team';
import { WORKSPACES } from '@/lib/dashboard/workspaces';
import {
  switchWorkspace,
  getActiveWorkspace,
  migrateActiveRoleToWorkspace,
  type WorkspaceId,
} from '@/lib/dashboard/switchWorkspace';

export interface MobileMenuTeam {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  avatar_url: string | null;
  level: string | null;
  age_label: string | null;
  home_city: string | null;
  home_country: string | null;
  country_code: string | null;
  role: string | null;
  href: string;
}

interface NavLink {
  href: string;
  label: string;
  badge?: number;
  icon: string;
}

interface AccountTypeRow {
  account_type: string;
  is_primary: boolean;
}

interface UserMenuIdentity {
  initials: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

interface MobileMenuProps {
  user: UserMenuIdentity;
  isAdmin: boolean;
  navLinks: NavLink[];
  accountTypes: AccountTypeRow[];
  activeRole: string | null;
  currentTier: string;
}

/**
 * Hamburger menu for mobile/tablet (≤1023px). Contains:
 *  - User identity (avatar + name + email + tier)
 *  - Primary nav (links from the bottom nav bar)
 *  - Team switcher (if user has any)
 *  - Admin link (if super_admin)
 *  - Sign out
 *
 * The panel opens from the right edge on mobile, full-screen on small phones.
 * Closes on route change, click outside, or Escape.
 */
export default function MobileMenu({
  user,
  isAdmin,
  navLinks,
  accountTypes,
  activeRole,
  currentTier,
}: MobileMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<MobileMenuTeam[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Step 5 — workspace switcher state. Mirrors the UserMenu implementation:
  // migrate legacy rinkstop_active_role to rinkstop_active_workspace on mount,
  // then read the active workspace for the active-state highlight.
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId | null>(null);
  useEffect(() => {
    migrateActiveRoleToWorkspace();
    setActiveWorkspace(getActiveWorkspace());
  }, []);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lazy-load teams when the panel opens (avoid fetching for desktop users
  // who never see this menu). The /api/my-teams endpoint is shared with
  // TeamSwitcher so the response shape is identical.
  useEffect(() => {
    if (!open || teamsLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/my-teams');
        if (!r.ok) {
          if (!cancelled) setTeamsLoaded(true);
          return;
        }
        const d = await r.json();
        if (!cancelled) {
          setTeams(d.teams || []);
          setTeamsLoaded(true);
        }
      } catch {
        if (!cancelled) setTeamsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, teamsLoaded]);


  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on click outside (only when open)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    try {
      await signOut({ redirectUrl: '/' });
    } catch {
      router.push('/');
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open menu"
        data-testid="mobile-menu-trigger"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          padding: 0,
          background: 'rgba(255,255,255,0.08)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: '1.1rem',
          lineHeight: 1,
        }}
      >
        {open ? '✕' : '☰'}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 90,
            }}
          />

          {/* Panel */}
          <div
            role="dialog"
            aria-label="Main menu"
            data-testid="mobile-menu-panel"
            style={{
              position: 'absolute',
              top: 'calc(100% + 0.5rem)',
              right: 0,
              width: 'min(360px, calc(100vw - 2rem))',
              maxHeight: 'calc(100vh - 6rem)',
              overflowY: 'auto',
              background: '#0F1A2E',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              zIndex: 100,
            }}
          >
            {/* Identity card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #C8102E' }}
                />
              ) : (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #C8102E 0%, #8b0a1e 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    border: '2px solid #C8102E',
                  }}
                >
                  {user.initials}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    color: '#fff',
                    fontSize: '0.95rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.displayName}
                </div>
                <div
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.75rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.email}
                </div>
                {currentTier && currentTier !== 'free' && (
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: 4,
                      padding: '0.1rem 0.5rem',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      borderRadius: 999,
                      background: 'rgba(255,184,28,0.15)',
                      color: '#FFB81C',
                    }}
                  >
                    {currentTier}
                  </span>
                )}
              </div>
            </div>

            {/* Step 5 — workspace switcher (mobile equivalent of UserMenu section) */}
            {(() => {
              const typeStrings = accountTypes.map(t => t.account_type);
              const tierRank: Record<string, number> = {
                free: 0,
                verified_identity: 1,
                identity_plus: 2,
                business_listing: 1,
                business_plus: 2,
              };
              const userRank = tierRank[currentTier] ?? 0;
              const meets = (min: string | null) => !min || (tierRank[min] ?? 0) <= userRank;
              const access = WORKSPACES.map(ws => {
                const unlocked =
                  ws.requiredAccountTypes.length === 0 ||
                  ws.requiredAccountTypes.some(t => typeStrings.includes(t));
                const fullyAvailable = unlocked && meets(ws.minTier);
                return { workspace: ws, unlocked, fullyAvailable };
              }).filter(a => a.unlocked);
              if (access.length === 0) return null;
              return (
                <div
                  data-testid="mobile-menu-workspace-section"
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    style={{
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Switch workspace
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {access.map(({ workspace: ws, fullyAvailable }) => {
                      const isActive = activeWorkspace === ws.id;
                      return (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={() => switchWorkspace(ws.id)}
                          disabled={isActive || !fullyAvailable}
                          data-testid={`mobile-menu-workspace-${ws.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.3rem 0.7rem',
                            fontSize: '0.75rem',
                            fontWeight: isActive ? 700 : 600,
                            color: isActive ? '#0a0a0a' : '#fff',
                            background: isActive
                              ? '#14B8A6'
                              : fullyAvailable
                                ? 'rgba(255,255,255,0.08)'
                                : 'rgba(255,255,255,0.04)',
                            border: isActive
                              ? '1px solid #14B8A6'
                              : '1px solid rgba(255,255,255,0.15)',
                            borderRadius: 999,
                            cursor: isActive ? 'default' : 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          <span aria-hidden>{ws.icon}</span>
                          <span>{ws.name}</span>
                          {!fullyAvailable ? <span aria-label="locked">🔒</span> : null}
                          {isActive ? <span aria-label="active">✓</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Account types (Day 4 multi-role) */}
            {accountTypes.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.35rem',
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {accountTypes.map((row) => {
                  const m = getAccountTypeMeta(row.account_type);
                  const isPrimary = row.is_primary || row.account_type === activeRole;
                  return (
                    <span
                      key={row.account_type}
                      title={m.label}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.15rem 0.55rem',
                        fontSize: 10,
                        fontWeight: isPrimary ? 700 : 600,
                        color: m.color,
                        background: m.bg,
                        border: isPrimary ? `1.5px solid ${m.color}` : `1px solid ${m.border}`,
                        borderRadius: 999,
                      }}
                    >
                      <span aria-hidden>{m.emoji}</span>
                      <span>{m.label}</span>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Primary nav */}
            <nav aria-label="Dashboard sections" style={{ padding: '0.5rem' }}>
              {navLinks.map(({ href, label, badge, icon }) => {
                const isActive = pathname === href || (href !== '/dashboard' && pathname?.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.7rem 0.85rem',
                      borderRadius: 8,
                      textDecoration: 'none',
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
                      background: isActive ? 'rgba(200,16,46,0.15)' : 'transparent',
                      fontSize: '0.9rem',
                      fontWeight: isActive ? 700 : 500,
                    }}
                  >
                    <span aria-hidden style={{ fontSize: '1.05rem', width: 22, textAlign: 'center' }}>
                      {icon}
                    </span>
                    <span style={{ flex: 1 }}>{label}</span>
                    {typeof badge === 'number' && badge > 0 && (
                      <span
                        style={{
                          background: '#C8102E',
                          color: '#fff',
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '0.1rem 0.5rem',
                          minWidth: 22,
                          textAlign: 'center',
                        }}
                      >
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Team switcher */}
            {teams.length > 0 && (
              <div
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  padding: '0.5rem',
                }}
              >
                <div
                  style={{
                    padding: '0.5rem 0.85rem 0.25rem',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  🏒 Your teams
                </div>
                {teams.slice(0, 6).map((t) => {
                  const flag = countryFlag(t.country_code);
                  return (
                    <Link
                      key={t.id}
                      href={t.href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.55rem 0.85rem',
                        borderRadius: 8,
                        textDecoration: 'none',
                        color: 'rgba(255,255,255,0.85)',
                        fontSize: '0.85rem',
                      }}
                    >
                      <span aria-hidden style={{ fontSize: '1.1rem' }}>{flag}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t.name}
                        </div>
                        {t.role && (
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>
                            {t.role.replace(/_/g, ' ')}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
                {teams.length > 6 && (
                  <Link
                    href="/dashboard/team"
                    style={{
                      display: 'block',
                      padding: '0.5rem 0.85rem',
                      fontSize: '0.78rem',
                      color: '#14B8A6',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    See all {teams.length} teams →
                  </Link>
                )}
              </div>
            )}

            {/* Admin + sign out */}
            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.08)',
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              {isAdmin && (
                <Link
                  href="/admin"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.7rem 0.85rem',
                    borderRadius: 8,
                    textDecoration: 'none',
                    color: '#FFB81C',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    background: 'rgba(255,184,28,0.08)',
                    border: '1px solid rgba(255,184,28,0.25)',
                  }}
                >
                  <span aria-hidden style={{ fontSize: '1.05rem' }}>🛡️</span>
                  <span>Admin dashboard</span>
                </Link>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                data-testid="mobile-menu-signout"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.7rem 0.85rem',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <span aria-hidden style={{ fontSize: '1.05rem' }}>↪️</span>
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
