/**
 * App header shown on authenticated pages. Logo + optional back link
 * + Clerk UserButton. Renders as a server component; the UserButton is
 * a client component nested inside.
 */

import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

interface HeaderProps {
  /** When true, show a "← Back" link to the dashboard. */
  showBack?: boolean;
  /** Optional title shown in the header center. */
  title?: string;
}

export function Header({ showBack = false, title }: HeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.25)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #FFD66B 0%, #FFB81C 60%, #B45309 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 12,
          color: '#0B1E3F',
          letterSpacing: '0.05em',
          flexShrink: 0,
        }}
      >
        RS
      </div>
      <Link
        href="/scoresheet"
        style={{
          fontSize: 11,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: '#FFB81C',
          fontWeight: 700,
          textDecoration: 'none',
          lineHeight: 1.1,
        }}
      >
        RinkStop
        <br />
        <span style={{ color: '#fff', fontSize: 13, letterSpacing: '0.02em', textTransform: 'none' }}>
          {title || 'Scoresheet'}
        </span>
      </Link>
      <div style={{ flex: 1 }} />
      {showBack && (
        <Link
          href="/scoresheet"
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.875rem',
            textDecoration: 'none',
            padding: '0.5rem 0.75rem',
          }}
        >
          ← Back
        </Link>
      )}
      <UserButton />
    </header>
  );
}
