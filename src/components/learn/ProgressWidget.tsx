'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

interface NextStep {
  href: string;
  title: string;
  reason: string;
}

interface ProgressWidgetState {
  /** "checking" while we wait for Clerk + the API */
  status: 'checking' | 'signed-out' | 'loading' | 'empty' | 'progress';
  readCount: number;
  totalCount: number;
  next: NextStep | null;
  suggestedAction: 'continue' | 'revisit' | 'none' | null;
}

/**
 * "Your progress + Next step" widget — appears at the top of the /learn
 * index page when the user is signed in.
 *
 * States:
 *   - signed-out: renders nothing (don't gate the page on sign-in)
 *   - loading / checking: subtle skeleton
 *   - empty: no progress yet, suggest first-read entry
 *   - progress: read-count + next-step card
 *
 * Both progress + next-step endpoints are hit in parallel on mount.
 */
export default function ProgressWidget() {
  const { isSignedIn, isLoaded } = useUser();
  const [state, setState] = useState<ProgressWidgetState>({
    status: 'checking',
    readCount: 0,
    totalCount: 0,
    next: null,
    suggestedAction: null,
  });

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setState((s) => ({ ...s, status: 'signed-out' }));
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading' }));

    (async () => {
      try {
        const [progressRes, nextRes] = await Promise.all([
          fetch('/api/learn/progress', { credentials: 'same-origin' }),
          fetch('/api/learn/next-step', { credentials: 'same-origin' }),
        ]);
        if (cancelled) return;
        if (!progressRes.ok || !nextRes.ok) throw new Error('api failed');
        const progress = await progressRes.json();
        const next = await nextRes.json();
        if (cancelled) return;
        setState({
          status: progress.readCount === 0 ? 'empty' : 'progress',
          readCount: progress.readCount,
          totalCount: progress.totalCount,
          next: next.next,
          suggestedAction: next.suggestedAction,
        });
      } catch (err) {
        console.error('[ProgressWidget] failed:', err);
        if (!cancelled) setState((s) => ({ ...s, status: 'signed-out' }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || state.status === 'signed-out') return null;

  // Subtle skeleton during load.
  if (state.status === 'checking' || state.status === 'loading') {
    return (
      <div
        style={{
          background: 'var(--s2)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.875rem',
        }}
      >
        Loading your progress...
      </div>
    );
  }

  const pct = state.totalCount > 0 ? Math.round((state.readCount / state.totalCount) * 100) : 0;

  return (
    <section
      aria-label="Your learning progress"
      style={{
        background: 'var(--s2)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '2rem',
      }}
    >
      {/* Header: progress count + bar */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.625rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.125rem', color: '#fff', letterSpacing: '0.04em', margin: 0 }}>
          YOUR PROGRESS
        </h2>
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8125rem', fontWeight: 600 }}>
          {state.readCount} of {state.totalCount} pages read · {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={state.readCount}
        aria-valuemin={0}
        aria-valuemax={state.totalCount}
        aria-label={`${pct}% of /learn pages read`}
        style={{
          width: '100%',
          height: '8px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: state.next ? '1rem' : '0',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background:
              pct >= 100
                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                : 'linear-gradient(90deg, #C8102E, #FFB81C)',
            transition: 'width 0.4s ease-out',
          }}
        />
      </div>

      {/* Next step card — only shown if there's something to recommend */}
      {state.next && (
        <Link
          href={state.next.href}
          style={{
            display: 'block',
            background: 'rgba(200,16,46,0.06)',
            border: '1px solid rgba(200,16,46,0.25)',
            borderRadius: '8px',
            padding: '0.875rem 1rem',
            textDecoration: 'none',
            marginTop: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8102E' }}>
              {state.suggestedAction === 'revisit' ? 'Revisit' : 'Next up'}
            </span>
            <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>→</span>
          </div>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9375rem', marginTop: '0.25rem', marginBottom: '0.25rem' }}>
            {state.next.title}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
            {state.next.reason}
          </div>
        </Link>
      )}
    </section>
  );
}
