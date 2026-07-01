'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface MarkReadButtonProps {
  postTable: 'team_news' | 'team_events' | 'team_results';
  postId: string;
}

export default function MarkReadButton({ postTable, postId }: MarkReadButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/coach-feed/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postTable, postId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed (${res.status})`);
      }
      setDone(true);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return <span className="text-xs italic text-slate-400">Marked as read</span>;
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting || isPending}
        className="rounded text-xs font-medium text-[#041E42] hover:underline disabled:opacity-50"
      >
        {submitting ? '…' : 'Mark as read'}
      </button>
      {error && <span className="text-xs text-red-600" role="alert">{error}</span>}
    </span>
  );
}
