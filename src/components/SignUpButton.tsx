'use client';

import Link from 'next/link';

export default function SignUpButton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Link
        href="/login"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0.5rem 0.875rem',
          borderRadius: '6px',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '0.8125rem',
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
      >
        Sign In
      </Link>
      <Link
        href="/login"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0.5rem 1rem',
          background: 'linear-gradient(135deg, #FFD700 0%, #FCC419 100%)',
          border: 'none',
          borderRadius: '6px',
          color: '#000',
          fontSize: '0.75rem',
          fontWeight: 700,
          cursor: 'pointer',
          textDecoration: 'none',
          boxShadow: '0 2px 8px rgba(255,215,0,0.2)',
          whiteSpace: 'nowrap',
        }}
      >
        Sign Up Free
      </Link>
    </div>
  );
}