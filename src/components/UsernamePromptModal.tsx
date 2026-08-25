'use client';

import { useState } from 'react';
import Link from 'next/link';
import UsernameField from './UsernameField';
import { generateSlugFromName } from '@/lib/username';

interface Props {
  displayName: string;
  onComplete: (username: string) => void;
  onSkip: () => void;
  /**
   * Free-tier flag. When true, the modal renders an "Upgrade to claim a
   * custom username" CTA instead of a save button. Added 2026-08-25 per
   * Option A tier plan — custom username requires Verified Identity.
   */
  isFree?: boolean;
}

/**
 * First-dashboard-visit prompt.
 * Auto-suggests a slug from the display name.
 * Skip-able but encouraged.
 */
export default function UsernamePromptModal({ displayName, onComplete, onSkip, isFree }: Props) {
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
        // Tier gate (402) — show the API's upgrade message verbatim.
        // The free-tier layout already shows the upgrade CTA below, so
        // we only need to surface the error if the user submitted anyway.
        if (data.error === 'tier_required') {
          setError(data.message ?? 'Upgrade to pick your own username.');
          return;
        }
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
        <h2 className="text-xl font-bold text-white mb-2">
          {isFree ? 'Pick your own username' : 'Claim your username'}
        </h2>
        <p className="text-sm text-white/80 mb-4">
          Your profile will live at <span className="text-[#FFB81C]">rinkstop.com/profile/{username || '...'}</span>.
          {isFree ? (
            <> Custom usernames are available on Hockey Passport and above.</>
          ) : (
            <> You can change it later from your profile settings.</>
          )}
        </p>

        <UsernameField value={username} onChange={setUsername} autoFocus disabled={isFree} />

        {error && (
          <p className="text-xs text-red-400 mt-2">{error}</p>
        )}

        <div className="flex gap-2 mt-6">
          {isFree ? (
            <>
              <Link
                href="/pricing"
                className="flex-1 bg-[#FFB81C] hover:bg-[#FFB81C]/90 text-[#041E42] font-semibold rounded-lg px-4 py-2 text-center"
              >
                Upgrade to Hockey Passport
              </Link>
              <button
                type="button"
                onClick={onSkip}
                className="text-white/60 hover:text-white text-sm px-4 py-2"
              >
                Keep auto-handle
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
