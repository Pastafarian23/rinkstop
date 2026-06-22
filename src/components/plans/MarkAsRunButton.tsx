'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface MarkAsRunButtonProps {
  planId: string;
  planTitle: string;
}

export default function MarkAsRunButton({ planId, planTitle }: MarkAsRunButtonProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/plans/mark-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          duration_actual_min: duration ? parseInt(duration, 10) : null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Could not mark as run (${res.status})`);
      }
      setShowForm(false);
      setDuration('');
      setNotes('');
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        ✓ Mark as run
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4"
    >
      <h3 className="mb-3 text-sm font-semibold text-slate-900">
        Log a run of "{planTitle}"
      </h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Actual duration (min)</span>
          <input
            type="number"
            min="1"
            max="240"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 60"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="What worked, what didn't, adjustments for next time..."
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </label>

      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={submitting || isPending}
          className="rounded-md bg-[#041E42] px-4 py-2 text-sm font-medium text-white hover:bg-[#041E42]/90 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save run'}
        </button>
        <button
          type="button"
          onClick={() => { setShowForm(false); setError(null); }}
          disabled={submitting}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
