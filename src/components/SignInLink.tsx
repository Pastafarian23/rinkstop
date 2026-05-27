'use client';
import Link from 'next/link';

export default function SignInLink() {
  return (
    <Link
      href="/login"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.5rem 0.875rem',
        borderRadius: '6px',
        color: 'rgba(255,255,255,0.75)',
        fontSize: '0.8125rem',
        fontWeight: 700,
        textDecoration: 'none',
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
    >
      Sign In
    </Link>
  );
}