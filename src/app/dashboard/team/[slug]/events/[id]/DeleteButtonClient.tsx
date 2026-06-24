'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteButtonClientProps {
  teamSlug: string;
  eventId: string;
  title: string;
}

export default function DeleteButtonClient({ teamSlug, eventId, title }: DeleteButtonClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    setError(null);
    try {
      const res = await fetch(`/api/team/${teamSlug}/events/${eventId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Delete failed (${res.status})`);
      }
      startTransition(() => {
        router.push(`/dashboard/team/${teamSlug}/events`);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  if (confirming) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          style={{
            padding: '0.5rem 0.85rem', background: '#C8102E', color: '#fff',
            border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700,
            cursor: isPending ? 'wait' : 'pointer', opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? 'Deleting…' : 'Confirm delete'}
        </button>
        <button
          type="button"
          onClick={() => { setConfirming(false); setError(null); }}
          disabled={isPending}
          style={{
            padding: '0.5rem 0.85rem', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6,
            color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        {error && (
          <span style={{ color: '#C8102E', fontSize: 12 }}>{error}</span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      style={{
        padding: '0.5rem 1rem', background: 'transparent',
        border: '1px solid rgba(200,16,46,0.4)', borderRadius: 6,
        color: '#C8102E', fontSize: 13, fontWeight: 600, cursor: 'pointer',
      }}
    >
      Delete
    </button>
  );
}