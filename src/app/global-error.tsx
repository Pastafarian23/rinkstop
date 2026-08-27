'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[rinkstop] global error boundary:', error);
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
      try {
        fetch('/api/log/profile-page-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, stack, digest, url, ua, ts: Date.now(), source: 'global-error-boundary' }),
          keepalive: true,
        }).catch(() => { /* logging must not throw */ });
      } catch { /* noop */ }
    } catch { /* logging must never throw */ }
  }, [error]);

  const message = (error?.message ?? 'Unknown error').substring(0, 1000);
  const stack = (error?.stack ?? '').substring(0, 4000);
  const digest = (error?.digest ?? '').substring(0, 200);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 720, margin: '4rem auto', padding: '0 1.5rem' }}>
          <h1 style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '2rem', color: '#fff', letterSpacing: '0.04em', margin: '0 0 0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#aaa', fontSize: '0.95rem', lineHeight: 1.5, margin: '0 0 1rem' }}>
            RinkStop hit an unexpected error. Your account and data are safe.
            Try again in a moment.
          </p>
          {digest ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', margin: '0 0 1rem', fontFamily: 'monospace' }}>
              Ref: {digest}
            </p>
          ) : null}
          <details style={{ marginBottom: '1rem' }}>
            <summary style={{ color: '#fff', cursor: 'pointer', marginBottom: '0.5rem' }}>Error details</summary>
            <pre style={{ background: '#111', padding: '1rem', borderRadius: 6, overflow: 'auto', fontSize: '0.8rem', color: '#f87171' }}>{message}</pre>
            {stack ? (
              <pre style={{ background: '#111', padding: '1rem', borderRadius: 6, marginTop: '0.5rem', overflow: 'auto', fontSize: '0.75rem', color: '#aaa' }}>{stack}</pre>
            ) : null}
          </details>
          <button
            onClick={reset}
            style={{
              padding: '0.6rem 1.25rem',
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
        </div>
      </body>
    </html>
  );
}
