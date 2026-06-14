'use client';

import { useState, useEffect } from 'react';
import UsernameField from './UsernameField';
import { COOLDOWN_DAYS } from '@/lib/username';

interface Props {
  currentUsername: string | null;
  onClose: () => void;
  onSuccess: (newUsername: string) => void;
}

/**
 * Change-username dialog used in /dashboard/profile.
 * Gates the field by the 14-day cooldown.
 */
export default function ChangeUsernameDialog({ currentUsername, onClose, onSuccess }: Props) {
  const [username, setUsername] = useState(currentUsername ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canChange, setCanChange] = useState<{ can: boolean; nextChangeAt?: Date }>({
    can: true,
  });

  useEffect(() => {
    async function checkCooldown() {
      try {
        const res = await fetch('/api/usernames/can-change');
        const data = await res.json();
        setCanChange({
          can: data.can_change,
          nextChangeAt: data.next_change_at ? new Date(data.next_change_at) : undefined,
        });
      } catch {
        // Default to allowing change on error
      }
    }
    checkCooldown();
  }, []);

  const daysUntilChange = canChange.nextChangeAt
    ? Math.ceil((canChange.nextChangeAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/usernames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.message ?? data.error);
        return;
      }

      onSuccess(data.username);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#041E42] border border-white/10 rounded-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-white mb-2">Change username</h2>
        <p className="text-sm text-white/60 mb-4">
          You can change your username once every {COOLDOWN_DAYS} days.
        </p>

        <UsernameField
          value={username}
          onChange={setUsername}
          disabled={!canChange.can}
          disabledReason={
            canChange.can
              ? undefined
              : `You can change your username again in ${daysUntilChange} day${daysUntilChange === 1 ? '' : 's'}`
          }
        />

        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !canChange.can || !username.trim() || username === currentUsername}
            className="flex-1 bg-[#FFB81C] hover:bg-[#FFB81C]/90 text-[#041E42] font-semibold rounded-lg px-4 py-2 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-white/60 hover:text-white text-sm px-4 py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
