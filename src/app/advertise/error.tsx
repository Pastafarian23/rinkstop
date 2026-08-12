'use client';

/**
 * /advertise error boundary.
 *
 * Catches unhandled errors in the /advertise segment so the layout
 * chrome stays visible. Added 2026-08-02.
 */

import Link from 'next/link';
import { useEffect } from 'react';

export default function AdvertiseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[rinkstop] /advertise error boundary:', error);

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
        Advertise page is unavailable
      </h1>
      <p style={{ color: '#aaa', fontSize: '0.95rem', lineHeight: 1.5, margin: '0 0 1rem' }}>
        We couldn&rsquo;t load the advertising page just now. Reach out directly
        and we&rsquo;ll send you the media kit.
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
          href="mailto:support@rinkstop.com?subject=Advertising%20inquiry"
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
          Email us
        </Link>
      </div>
    </div>
  );
}