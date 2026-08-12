'use client';

// Day 7 (Arnel, 2026-06-23 06:17 CDT): auth-specific error boundary.
//
// Background: the global `global-error.tsx` shows a generic "Something
// went wrong" message on ANY 500 in the app. The login page is the
// most-visited route for new users, so a generic error is especially
// bad — new visitors think the site is broken and leave.
//
// This file (the App Router `error.tsx` for /login) overrides the
// global error for this route only. It:
//   1. Renders auth-page chrome (same shell as the login form)
//   2. Auto-retries the failed render once after 1.2s (catches the
//      Vercel cold-start race that the keep-warm cron was added to
//      prevent, but if a new deploy happens between cron runs, this
//      gives the second chance to succeed)
//   3. Tells the user what to do: "Wait a moment — we'll try again,
//      or refresh if you'd rather." Removes "try again in a moment"
//      (passive, unclear).
//   4. Logs the error to console for support debugging.

import { useEffect } from 'react';

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error so we can see it in DevTools. The "digest" is the
    // server-side log reference; quote it in any bug report.
    console.error('[login error]', { message: error.message, digest: error.digest });

    // 2026-08-12: also capture client-side errors server-side so
    // intermittent login failures are visible in production logs.
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

    // Auto-retry once after a short delay. The reset() function re-runs
    // the route's render. If Vercel's edge function just warmed up, the
    // retry usually succeeds. The delay is small enough that the user
    // doesn't feel like they're waiting.
    const timer = setTimeout(() => {
      try {
        reset();
      } catch {
        // If reset() itself throws (rare), fall through and let the
        // user click the manual button.
      }
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
