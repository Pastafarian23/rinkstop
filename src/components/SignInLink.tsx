'use client';
import Link from 'next/link';

export default function SignInLink() {
  return (
    <Link
      href="/login"
      style={{
        color: 'rgba(255,255,255,0.6)',
        fontSize: '0.8125rem',
        fontWeight: 600,
        textDecoration: 'none',
        padding: '0.5rem 0.75rem',
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
    >
      Sign In
    </Link>
  );
}