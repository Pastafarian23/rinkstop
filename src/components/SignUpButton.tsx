'use client';

import Link from 'next/link';

export default function SignUpButton() {
  return (
    <Link
      href="/sign-up"
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
  );
}