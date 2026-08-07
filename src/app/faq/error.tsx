'use client';

/**
 * /faq error boundary.
 *
 * Catches unhandled errors in the /faq segment so the layout chrome
 * (nav, footer, tab bar) stays visible. Without this, errors bubble
 * to global-error.tsx which replaces the whole HTML document.
 *
 * Added 2026-08-02.
 */

import Link from 'next/link';
import { useEffect } from 'react';

export default function FaqError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[rinkstop] /faq error boundary:', error);
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
        FAQ is unavailable right now
      </h1>
      <p style={{ color: '#aaa', fontSize: '0.95rem', lineHeight: 1.5, margin: '0 0 1rem' }}>
        We couldn&rsquo;t load the FAQ just now. Your account and data are safe.
        Try again, or email us if it keeps failing.
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
          href="mailto:support@rinkstop.com"
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
          Email support
        </Link>
      </div>
    </div>
  );
}