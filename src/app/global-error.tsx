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
    // Log to console so Chrome devtools (and Vercel browser console
    // captures if enabled) show the real error.
    console.error('[rinkstop] global error boundary:', error);
  }, [error]);

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
          {error.digest ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', margin: '0 0 1rem', fontFamily: 'monospace' }}>
              Ref: {error.digest}
            </p>
          ) : null}
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
