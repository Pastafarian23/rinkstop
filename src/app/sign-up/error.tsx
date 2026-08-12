'use client';

// Day 7 (Arnel, 2026-06-23): auth-specific error boundary for /sign-up.
//
// Mirrors /login/error.tsx: without this, an unhandled error in the
// Clerk <SignUp /> client component (which lives in the root layout's
// context) bubbles all the way to global-error.tsx — which shows a
// generic "Something went wrong" with no context for the user.
//
// What's known so far (2026-06-23 15:30 CDT):
//   - Direct nav to /sign-up works (form renders fully).
//   - Clicking "Sign Up Free" on the home page fails with React #300
//     in the production build, but not in `pnpm dev`.
//   - React #300 = "render was interrupted by another render" —
//     one of the layout-level components is doing a sync setState
//     during render when the SignUp client component mounts.
//
// This file does the same thing /login/error.tsx does: auto-retry once
// after a short delay (handles Vercel cold-start), and tells the user
// what to do.

import { useEffect } from 'react';

export default function SignUpError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console so the error is visible in DevTools. The digest
    // is the server-side log reference; quote it in any bug report.
    console.error('[sign-up error]', { message: error.message, digest: error.digest, stack: error.stack });

    // 2026-08-12: capture this error server-side so we can see the
    // real stack trace in production. Route boundaries were previously
    // console-only, which is invisible outside the user's browser.
    try {
      const stack = (error?.stack ?? '').substring(0, 4000);
      const message = (error?.message ?? '').substring(0, 1000);
      const digest = (error?.digest ?? '').substring(0, 200);
      const url = typeof window !== 'undefined' ? window.location.href : '';
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const body = JSON.stringify({ message, stack, digest, url, ua, ts: Date.now() });
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/log/error', body);
      } else {
        fetch('/api/log/error', { method: 'POST', body, keepalive: true }).catch(() => {});
      }
    } catch { /* logging must never throw */ }

    // Auto-retry once. Same logic as /login/error.tsx.
    const timer = setTimeout(() => {
      try { reset(); } catch { /* user can click manually */ }
    }, 1200);
    return () => clearTimeout(timer);
  }, [error, reset]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        <h1 style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.75rem',
          color: '#fff',
          letterSpacing: '0.04em',
          margin: '0 0 0.5rem',
        }}>
          Hang on — RinkStop is loading
        </h1>
        <p style={{ color: '#aaa', fontSize: '0.95rem', lineHeight: 1.5, margin: '0 0 1rem' }}>
          We hit a brief hiccup. Retrying automatically — this usually clears in a second or two.
        </p>
        {error.digest ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', margin: '0 0 1rem', fontFamily: 'monospace' }}>
            Ref: {error.digest}
          </p>
        ) : null}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => reset()}
            style={{
              padding: '0.6rem 1.25rem',
              background: '#C8102E',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.6rem 1.25rem',
              background: 'transparent',
              color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Refresh page
          </button>
        </div>
      </div>
    </div>
  );
}
