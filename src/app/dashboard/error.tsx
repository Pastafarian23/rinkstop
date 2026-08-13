'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console — Vercel will pick it up from the browser too.
    console.error('[dashboard] route error:', error);

    // 2026-08-12: capture route-level dashboard errors server-side
    // so they are visible in production logs, not just DevTools.
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
    <div style={{ maxWidth: 720, margin: '4rem auto', padding: '0 1.5rem', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div
        style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: 12,
          padding: '1.75rem',
        }}
      >
        <h2
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '1.5rem',
            color: '#fff',
            letterSpacing: '0.04em',
            margin: '0 0 0.5rem',
          }}
        >
          Dashboard hit a snag
        </h2>
        <p style={{ color: '#aaa', fontSize: '0.9rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
          We couldn&rsquo;t load your dashboard just now. Your account and data are safe.
          Try again in a moment, or head back to the home page in the meantime.
        </p>
        {error.digest ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', margin: '0 0 1rem', fontFamily: 'monospace' }}>
            Ref: {error.digest}
          </p>
        ) : null}
        {(error as any)?.message ? (
          <details style={{ margin: '0 0 1rem' }}>
            <summary style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', cursor: 'pointer' }}>Error details</summary>
            <pre style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: '0.5rem 0 0', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: 4, overflow: 'auto', maxHeight: 200 }}>
{(error as any).name}: {(error as any).message}
{(error as any).stack}
            </pre>
          </details>
        ) : null}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1rem',
              background: '#C8102E',
              color: '#fff',
              borderRadius: 6,
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <Link
            href="/"
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.8)',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
