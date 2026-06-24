'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface SaveButtonProps {
  planId: string;
  initialSaved: boolean;
}

export default function SaveButton({ planId, initialSaved }: SaveButtonProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    const next = !saved;
    setSaved(next);

    try {
      const res = await fetch('/api/plans/save', {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Save failed (${res.status})`);
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setSaved(!next);
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
          saved
            ? 'border border-white/15 bg-[#111823] text-white/80 hover:bg-white/5'
            : 'bg-[#C8102E] text-white hover:bg-[#C8102E]/90'
        }`}
      >
        {saved ? '❤️ Saved' : '🤍 Save plan'}
      </button>
      {error && (
        <p className="mt-1 text-xs text-[#C8102E]" role="alert">{error}</p>
      )}
    </div>
  );
}
