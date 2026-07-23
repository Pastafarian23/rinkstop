'use client';

/**
 * RestoreAllWorkspacesButton
 *
 * 2026-07-22 (Arnel): bulk-restore trigger used in the
 * "Hidden workspaces" footer header. POSTs { all: true } to
 * /api/dashboard/restore, then router.refresh() so all dismissed
 * workspaces reappear in the main grid.
 *
 * Intentionally does NOT show a confirmation step: the user is already
 * on a small footer section explicitly labeled "Hidden workspaces",
 * so context is clear. If we ever move this to settings, we'll add a
 * confirm step there.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function RestoreAllWorkspacesButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleRestoreAll() {
    setError(null);
    try {
      const res = await fetch('/api/dashboard/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || `Restore failed (${res.status})`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      startTransition(() => router.refresh());
      // Surface the count briefly so users know something happened.
      if (typeof data.restoredCount === 'number') {
        // eslint-disable-next-line no-console
        console.info(`[RestoreAll] restored ${data.restoredCount} workspace(s)`);
      }
    } catch (err: any) {
      setError(err?.message || 'Network error');
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        onClick={handleRestoreAll}
        disabled={pending}
        data-testid="restore-all-workspaces"
        style={{
          background: 'transparent',
          border: '1px solid rgba(20,184,166,0.5)',
          color: '#14B8A6',
          padding: '0.3rem 0.7rem',
          borderRadius: 4,
          fontSize: '0.75rem',
          cursor: pending ? 'wait' : 'pointer',
          fontWeight: 600,
          letterSpacing: '0.02em',
        }}
      >
        {pending ? 'Restoring all…' : 'Show all workspaces'}
      </button>
      {error ? (
        <span style={{ color: '#ff8a96', fontSize: '0.7rem' }} role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
