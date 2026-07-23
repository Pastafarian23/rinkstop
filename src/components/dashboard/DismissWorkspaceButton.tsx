'use client';

/**
 * DismissWorkspaceButton
 *
 * 2026-07-22 (Arnel): client-side "Hide" button for fully-available
 * workspace cards. Posts to /api/dashboard/dismiss, then refreshes the
 * route so the layout re-renders with the dismissed card filtered out
 * and the workspace moved to the "Hidden workspaces" footer.
 *
 * Why client + router.refresh(): the dismiss state lives on the server
 * (profile_dismissed_workspaces table). The cleanest UX is to refresh
 * the current route so the server component re-runs and re-filters. We
 * don't optimistically hide the card because the dismiss could fail
 * (network, validation, server error) and we'd have to roll back.
 *
 * Only shown for fully-available workspaces. Locked workspaces
 * (unlocked=false OR fullyAvailable=false) have no dismiss affordance —
 * the "never hide locked features" rule means dismissing them would
 * silently flip their visibility, defeating the product signal.
 *
 * After dismiss, we scroll the hidden-workspaces footer into view so the
 * user sees their action took effect and can restore if it was a mistake.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  workspaceId: string;
  workspaceName: string;
}

export default function DismissWorkspaceButton({ workspaceId, workspaceName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleDismiss() {
    setError(null);
    try {
      const res = await fetch('/api/dashboard/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || `Dismiss failed (${res.status})`);
        return;
      }
      // Server state changed → refresh the route so the layout re-filters.
      startTransition(() => {
        router.refresh();
        // Scroll the hidden footer into view after the refresh commits.
        // 250ms is enough for the server round-trip on typical Next.js dev.
        setTimeout(() => {
          const el = document.getElementById('hidden-workspaces-footer');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 250);
      });
    } catch (err: any) {
      setError(err?.message || 'Network error');
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        data-testid={`dismiss-trigger-${workspaceId}`}
        title={`Hide ${workspaceName} workspace from your dashboard`}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.75rem',
          cursor: 'pointer',
          padding: '0.25rem 0.5rem',
          borderRadius: 4,
          letterSpacing: '0.02em',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
        }}
      >
        Hide
      </button>
    );
  }

  return (
    <div
      data-testid={`dismiss-confirm-${workspaceId}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: '0.75rem',
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.55)' }}>Hide {workspaceName}?</span>
      <button
        type="button"
        onClick={handleDismiss}
        disabled={pending}
        data-testid={`dismiss-confirm-yes-${workspaceId}`}
        style={{
          background: 'rgba(200,16,46,0.15)',
          border: '1px solid rgba(200,16,46,0.5)',
          color: '#ff8a96',
          padding: '0.2rem 0.5rem',
          borderRadius: 4,
          fontSize: '0.75rem',
          cursor: pending ? 'wait' : 'pointer',
          fontWeight: 600,
        }}
      >
        {pending ? 'Hiding…' : 'Yes, hide'}
      </button>
      <button
        type="button"
        onClick={() => {
          setConfirming(false);
          setError(null);
        }}
        disabled={pending}
        style={{
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.55)',
          padding: '0.2rem 0.5rem',
          borderRadius: 4,
          fontSize: '0.75rem',
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>
      {error ? (
        <span style={{ color: '#ff8a96', fontSize: '0.7rem' }} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
