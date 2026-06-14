'use client';

import { useState } from 'react';
import UsernameField from './UsernameField';
import { generateSlugFromName } from '@/lib/username';

interface Props {
  displayName: string;
  onComplete: (username: string) => void;
  onSkip: () => void;
}

/**
 * First-dashboard-visit prompt.
 * Auto-suggests a slug from the display name.
 * Skip-able but encouraged.
 */
export default function UsernamePromptModal({ displayName, onComplete, onSkip }: Props) {
  const [username, setUsername] = useState(generateSlugFromName(displayName));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      onComplete(data.username);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#041E42] border border-white/10 rounded-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-white mb-2">Claim your username</h2>
        <p className="text-sm text-white/60 mb-4">
          Your profile will live at <span className="text-[#FFB81C]">rinkstop.com/profile/{username || '...'}</span>.
          You can change it later from your profile settings.
        </p>

        <UsernameField value={username} onChange={setUsername} autoFocus />

        {error && (
          <p className="text-xs text-red-400 mt-2">{error}</p>
        )}

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !username.trim()}
            className="flex-1 bg-[#FFB81C] hover:bg-[#FFB81C]/90 text-[#041E42] font-semibold rounded-lg px-4 py-2 disabled:opacity-50"
          >
            {submitting ? 'Setting...' : 'Claim username'}
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={submitting}
            className="text-white/60 hover:text-white text-sm px-4 py-2"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
