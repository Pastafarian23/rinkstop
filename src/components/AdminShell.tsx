'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { UserButton } from '@clerk/nextjs';
import { userButtonAppearance } from '@/lib/clerk-appearance';

const NAV = [
  { href: '/admin', label: 'Overview', icon: '📊', exact: true },
  { href: '/admin/teams', label: 'Teams', icon: '🏒' },
  { href: '/admin/rinks', label: 'Rinks', icon: '🏟️' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/games', label: 'Games', icon: '🎮' },
  { href: '/admin/leagues', label: 'Leagues', icon: '🏆' },
  { href: '/admin/players', label: 'Players', icon: '⭐' },
  { href: '/admin/brands', label: 'Brands', icon: '👕' },
  { href: '/admin/fixtures', label: 'Fixtures', icon: '📅' },
  { href: '/admin/data-quality', label: 'Data Quality', icon: '✅' },
  { href: '/admin/revenue', label: 'Revenue', icon: '💰' },
  { href: '/admin/cron-health', label: 'Cron Health', icon: '⏰' },
  { href: '/admin/blog', label: 'Blog', icon: '✍️' },
  { href: '/admin/stats', label: 'Stats', icon: '📈' },
  { href: '/admin/intake', label: 'Intake', icon: '📥' },
  { href: '/admin/audit-log', label: 'Audit Log', icon: '🧾' },
];

interface AdminShellProps {
  email: string;
  role: 'admin' | 'super_admin';
  displayName: string;
  avatarUrl: string;
  children: React.ReactNode;
}

function pageTitleFor(pathname: string): string {
  const item = NAV.find(
    (n) => n.href === pathname || (pathname?.startsWith(n.href + '/') && n.href !== '/admin')
  );
  if (item) return item.label;
  if (pathname?.startsWith('/admin/')) return 'Admin';
  return 'RinkStop Admin';
}

export default function AdminShell({ email, role, displayName, avatarUrl, children }: AdminShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const roleLabel = role.replace('_', ' ');
  const pageTitle = pageTitleFor(pathname || '/admin');

  return (
    <div
      data-admin="true"
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Mobile top bar */}
      <div
        className="admin-mobile-bar"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: '#041E42',
          borderBottom: '3px solid #C8102E',
          padding: '0.75rem 1rem',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              padding: '0.4rem 0.6rem',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '1.1rem',
              lineHeight: 1,
            }}
          >
            {open ? '✕' : '☰'}
          </button>
          <Link
            href="/admin"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              color: '#fff',
              fontSize: '1.1rem',
              letterSpacing: '0.06em',
              textDecoration: 'none',
            }}
          >
            RinkStop <span style={{ color: '#FFB81C' }}>Admin</span>
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Link
            href="/dashboard"
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: '#fff',
              padding: '0.4rem 0.7rem',
              borderRadius: 6,
              fontSize: '0.75rem',
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.15)',
              whiteSpace: 'nowrap',
            }}
          >
            ← Dashboard
          </Link>
          <UserButton
            appearance={userButtonAppearance}
            userProfileUrl="/dashboard/profile"
          />
        </div>
      </div>

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar overlay (mobile) */}
        {open ? (
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 60,
            }}
            className="admin-overlay"
          />
        ) : null}

        {/* Sidebar */}
        <aside
          className="admin-sidebar"
          data-open={open ? 'true' : 'false'}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: 260,
            background: 'linear-gradient(180deg, #041E42 0%, #051d3d 100%)',
            borderRight: '1px solid #0a2a55',
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.2s',
            zIndex: 70,
          }}
        >
          {/* Brand */}
          <div
            style={{
              padding: '1.25rem 1.25rem 1rem',
              borderBottom: '1px solid #0a2a55',
            }}
          >
            <Link
              href="/admin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: '#C8102E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  fontSize: '1.1rem',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                RS
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                    fontSize: '1.05rem',
                    color: '#fff',
                    letterSpacing: '0.06em',
                    lineHeight: 1.1,
                  }}
                >
                  RinkStop
                </div>
                <div
                  style={{
                    fontSize: '0.65rem',
                    color: '#FFB81C',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    lineHeight: 1,
                    marginTop: 2,
                  }}
                >
                  ADMIN CONSOLE
                </div>
              </div>
            </Link>
          </div>

          {/* Back to user dashboard */}
          <div style={{ padding: '0.75rem' }}>
            <Link
              href="/dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 6,
                background: 'rgba(255, 184, 28, 0.1)',
                border: '1px solid rgba(255, 184, 28, 0.25)',
                color: '#FFB81C',
                fontSize: '0.8rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              ← Back to User Dashboard
            </Link>
          </div>

          {/* Nav */}
          <nav
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.25rem 0.5rem 1rem',
            }}
          >
            {NAV.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`admin-nav-link-${item.href.replace(/\//g, '-')}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.55rem 0.75rem',
                    marginBottom: 2,
                    borderRadius: 6,
                    color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                    background: active
                      ? 'linear-gradient(90deg, rgba(200,16,46,0.85) 0%, rgba(200,16,46,0.4) 100%)'
                      : 'transparent',
                    borderLeft: active ? '3px solid #FFB81C' : '3px solid transparent',
                    fontSize: '0.85rem',
                    fontWeight: active ? 600 : 500,
                    textDecoration: 'none',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  <span style={{ fontSize: '0.95rem' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User card */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderTop: '1px solid #0a2a55',
              background: 'rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #FFB81C',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: '#C8102E',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    border: '2px solid #FFB81C',
                  }}
                >
                  {displayName?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayName || email}
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    marginTop: 2,
                    padding: '0.05rem 0.4rem',
                    background: role === 'super_admin' ? '#FFB81C' : '#C8102E',
                    color: role === 'super_admin' ? '#041E42' : '#fff',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    borderRadius: 3,
                  }}
                >
                  {roleLabel}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main
          style={{
            flex: 1,
            marginLeft: 260,
            minWidth: 0,
          }}
        >
          {/* Top bar (desktop) */}
          <div
            className="admin-desktop-topbar"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 40,
              background: 'rgba(10,10,10,0.85)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderBottom: '1px solid #1e1e1e',
              padding: '0.85rem 2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link
                href="/admin"
                style={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '0.8rem',
                  textDecoration: 'none',
                }}
              >
                Admin
              </Link>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
              <span
                style={{
                  color: '#fff',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                {pageTitle}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <UserButton
                appearance={userButtonAppearance}
                userProfileUrl="/dashboard/profile"
              />
            </div>
          </div>

          <div style={{ padding: '1.5rem 2rem 3rem' }} className="admin-content">
            {children}
          </div>
        </main>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .admin-mobile-bar { display: flex !important; }
          .admin-sidebar {
            transform: translateX(-100%);
          }
          .admin-sidebar[data-open="true"] {
            transform: translateX(0);
          }
          .admin-desktop-topbar { display: none !important; }
          main { margin-left: 0 !important; }
          .admin-content { padding: 1rem 1rem 3rem !important; }
        }
      `}</style>
    </div>
  );
}
