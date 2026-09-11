'use client';

import { useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';

interface MarkReadButtonProps {
  /** The /learn href this button marks as read. */
  href: string;
  /** Display title — used in the success message and ARIA. */
  title: string;
}

/**
 * "Mark as read" button — appears at the bottom of every /learn subpage.
 *
 * Behavior:
 *  - Hidden if signed out (Clerk `useUser()` returns isLoaded=false or isSignedIn=false).
 *  - On mount: fetches GET /api/learn/progress; if href already in readHrefs,
 *    shows "✓ Marked as read" immediately (no click needed).
 *  - On click: POSTs /api/learn/mark-read with the current dwell time.
 *    Idempotent on the server (UPSERT on user_id+href).
 *  - Tracks dwell time so we can later distinguish "marked-read without reading"
 *    from "actually read for X min". Hidden inside a useRef so re-renders
 *    don't reset it.
 */
export default function MarkReadButton({ href, title }: MarkReadButtonProps) {
  const { isSignedIn, isLoaded } = useUser();
  const [state, setState] = useState<'checking' | 'unread' | 'read' | 'just-marked'>('checking');
  const mountedAt = useRef<number>(Date.now());
  const lastChecked = useRef<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setState('unread');
      lastChecked.current = null;
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/learn/progress', { credentials: 'same-origin' });
        if (!res.ok) throw new Error('progress fetch failed');
        const json = await res.json();
        if (cancelled) return;
        const list: string[] = json.readHrefs || [];
        const alreadyRead = list.includes(href);
        lastChecked.current = alreadyRead;
        setState(alreadyRead ? 'read' : 'unread');
      } catch {
        if (!cancelled) setState('unread');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, href]);

  if (!isLoaded) return null;
  if (!isSignedIn) return null;

  async function handleMarkRead() {
    const dwell = Math.max(0, Math.floor((Date.now() - mountedAt.current) / 1000));
    try {
      const res = await fetch('/api/learn/mark-read', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ href, dwellSeconds: dwell }),
      });
      if (!res.ok) throw new Error('mark-read failed');
      setState('just-marked');
    } catch (err) {
      console.error('[MarkReadButton] failed:', err);
    }
  }

  if (state === 'read') {
    return (
      <div
        data-testid="mark-read-status"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.625rem 1rem',
          background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '6px',
          color: 'rgba(34, 197, 94, 0.95)',
          fontSize: '0.875rem',
          fontWeight: 600,
        }}
      >
        <span aria-hidden="true">✓</span>
        <span>You&apos;ve read this page</span>
      </div>
    );
  }

  if (state === 'just-marked') {
    return (
      <div
        data-testid="mark-read-just-marked"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.625rem 1rem',
          background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '6px',
          color: 'rgba(34, 197, 94, 0.95)',
          fontSize: '0.875rem',
          fontWeight: 600,
        }}
      >
        <span aria-hidden="true">✓</span>
        <span>Marked as read. Your progress is saved.</span>
      </div>
    );
  }

  // state === 'checking' or 'unread'
  return (
    <button
      type="button"
      onClick={handleMarkRead}
      disabled={state === 'checking'}
      aria-label={`Mark "${title}" as read`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.625rem 1rem',
        background: state === 'checking' ? 'rgba(255,255,255,0.04)' : '#C8102E',
        border: '1px solid #C8102E',
        borderRadius: '6px',
        color: '#fff',
        fontSize: '0.875rem',
        fontWeight: 700,
        cursor: state === 'checking' ? 'wait' : 'pointer',
        opacity: state === 'checking' ? 0.6 : 1,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <span aria-hidden="true">{state === 'checking' ? '...' : '✓'}</span>
      <span>{state === 'checking' ? 'Checking progress...' : 'Mark as read'}</span>
    </button>
  );
}
