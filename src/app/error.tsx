'use client';

/**
 * Root-level error boundary for the App Router.
 *
 * Catches unhandled errors in any segment that doesn't have its own
 * error.tsx. Without this, errors in /faq, /advertise, /pricing, etc.
 * bubble all the way up to global-error.tsx which replaces the entire
 * layout (no nav, no footer). With this, the layout chrome stays
 * intact and only the page body is replaced with a friendly error.
 *
 * Added 2026-08-02 in response to a user report of "Something went
 * wrong" appearing on /faq, /advertise, /pricing, /dashboard in
 * Chrome mobile. Once errors stop happening here, we can revisit.
 */

import Link from 'next/link';
import { useEffect } from 'react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console so Chrome devtools (and Vercel browser console
    // captures, if enabled) show the real error.
    console.error('[rinkstop] root error boundary:', error);
  }, [error]);

  return (
    <div
      style={{
        maxWidth: 720,
        margin: '4rem auto',
        padding: '0 1.5rem',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '2rem',
          color: '#fff',
          letterSpacing: '0.04em',
          margin: '0 0 0.5rem',
        }}
      >
        Something went wrong
      </h1>
      <p style={{ color: '#aaa', fontSize: '0.95rem', lineHeight: 1.5, margin: '0 0 1rem' }}>
        RinkStop hit an unexpected error on this page. Your account and data are safe.
        Try again, or head back home in the meantime.
      </p>
      {error.digest ? (
        <p
          style={{
            color: 'rgba(255,255,255,0.3)',
            fontSize: '0.7rem',
            margin: '0 0 1rem',
            fontFamily: 'monospace',
          }}
        >
          Ref: {error.digest}
        </p>
      ) : null}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={reset}
          style={{
            padding: '0.55rem 1.1rem',
            background: '#C8102E',
            color: '#fff',
            borderRadius: 6,
            border: 'none',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{
            padding: '0.55rem 1.1rem',
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.8)',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}