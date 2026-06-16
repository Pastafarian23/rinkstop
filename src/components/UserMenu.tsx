'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

interface UserMenuProps {
  initials: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  size?: number;
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
}: UserMenuProps) {
  const { signOut } = useClerk();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
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
          style={{
            position: 'absolute',
            top: `calc(${size}px + 8px)`,
            right: 0,
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
