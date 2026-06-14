'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

interface EmailCaptureInlineProps {
  /** Context for the email capture. Shown in the pitch. */
  pitch: string;
  /** CTA button label */
  cta?: string;
  /** Entity type — used for analytics and deduplication */
  entityType?: 'rink' | 'team' | 'player' | 'league' | 'business';
  /** Entity id — for the source record */
  entityId?: string;
  /** Short label for the entity (e.g. "A3 Arena" or "Toronto Maple Leafs") */
  entityName?: string;
  /** Intent label — defaults to 'email_capture' */
  intent?: string;
  /** CSS class name for the container */
  className?: string;
}

/**
 * EmailCaptureInline — inline soft-signup form that appears below directory
 * detail page content.
 *
 * Shows only to anonymous users (signed-in users don't need to give their
 * email again). Fires on submit: captures email + context to the
 * `email_captures` table via POST /api/email-capture.
 *
 * Success state: shows a "You're in!" confirmation (no duplicate submissions).
 * Error state: shows a friendly retry message.
 *
 * Placed on team, rink, and league detail pages — at moments of high intent
 * when the user is reading about an entity they care about.
 */
export default function EmailCaptureInline({
  pitch,
  cta = 'Get updates',
  entityType,
  entityId,
  entityName,
  intent = 'email_capture',
  className,
}: EmailCaptureInlineProps) {
  const { isLoaded, isSignedIn } = useUser();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Don't render for signed-in users (they already have an account)
  if (isLoaded && isSignedIn) return null;

  // Don't render during SSR
  if (!isLoaded) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/email-capture', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': '', // empty if not signed in
        },
        body: JSON.stringify({
          email: email.trim(),
          entityType,
          entityId,
          intent,
          sourcePath: typeof window !== 'undefined' ? window.location.pathname : undefined,
          sourceUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong');
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div
        className={className}
        style={{
          background: 'rgba(200, 16, 46, 0.08)',
          border: '1px solid rgba(200, 16, 46, 0.25)',
          borderRadius: 10,
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ fontSize: '1.5rem' }}>✅</span>
        <div>
          <p style={{ color: '#fff', fontWeight: 700, margin: 0, fontSize: '0.95rem' }}>
            {entityName ? `You're following ${entityName}!` : "You're on the list!"}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: '4px 0 0', fontSize: '0.85rem' }}>
            We'll email you when there are updates. No spam, unsubscribe anytime.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: '1.25rem 1.5rem',
      }}
    >
      <p
        style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: '0.9rem',
          lineHeight: 1.5,
          margin: '0 0 1rem',
        }}
      >
        {pitch}
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          style={{
            flex: 1,
            minWidth: 180,
            padding: '0.6rem 0.85rem',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff',
            fontSize: '0.875rem',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            padding: '0.6rem 1.1rem',
            borderRadius: 6,
            background: '#C8102E',
            color: '#fff',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            opacity: status === 'loading' ? 0.7 : 1,
            transition: 'opacity 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          {status === 'loading' ? 'Sending…' : cta}
        </button>
      </form>

      {status === 'error' && (
        <p style={{ color: '#f87171', fontSize: '0.8rem', margin: '8px 0 0' }}>
          {errorMsg}
        </p>
      )}

      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', margin: '8px 0 0' }}>
        Free forever. No spam. Unsubscribe anytime.
      </p>
    </div>
  );
}
