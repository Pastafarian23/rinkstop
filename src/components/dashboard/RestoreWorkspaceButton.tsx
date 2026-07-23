'use client';

/**
 * RestoreWorkspaceButton
 *
 * 2026-07-22 (Arnel): client-side "Restore" button used in the
 * "Hidden workspaces" footer. POSTs to /api/dashboard/restore with
 * a single workspaceId, then router.refresh() so the layout re-filters
 * and the workspace card reappears in the main grid.
 *
 * If the API call fails (network, validation, server error), we surface
 * the error inline and leave the footer unchanged so the user can retry.
 * No optimistic UI — server state is the source of truth.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  workspaceId: string;
  workspaceName: string;
}

export default function RestoreWorkspaceButton({ workspaceId, workspaceName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleRestore() {
    setError(null);
    try {
      const res = await fetch('/api/dashboard/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || `Restore failed (${res.status})`);
        return;
      }
      startTransition(() => router.refresh());
    } catch (err: any) {
      setError(err?.message || 'Network error');
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        onClick={handleRestore}
        disabled={pending}
        data-testid={`restore-${workspaceId}`}
        style={{
          background: 'rgba(20,184,166,0.15)',
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
        {pending ? 'Restoring…' : `Restore ${workspaceName}`}
      </button>
      {error ? (
        <span style={{ color: '#ff8a96', fontSize: '0.7rem' }} role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
