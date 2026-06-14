'use client';

import { useState } from 'react';
import UsernamePromptModal from './UsernamePromptModal';

interface Props {
  displayName: string;
  onComplete: () => void;
}

/**
 * Yellow banner at the top of the dashboard when username is unset.
 * Clicking the CTA opens the UsernamePromptModal.
 */
export default function UsernameBanner({ displayName, onComplete }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed && !showModal) return null;

  return (
    <>
      <div className="bg-[#FFB81C]/10 border-b border-[#FFB81C]/30 px-4 py-3 flex items-center justify-between">
        <p className="text-sm text-white">
          <span className="text-[#FFB81C] font-semibold">Set your username</span>
          <span className="text-white/70"> to get your public profile URL.</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="text-xs bg-[#FFB81C] hover:bg-[#FFB81C]/90 text-[#041E42] font-semibold rounded px-3 py-1"
          >
            Set username
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs text-white/40 hover:text-white/70 px-2"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>

      {showModal && (
        <UsernamePromptModal
          displayName={displayName}
          onComplete={() => {
            setShowModal(false);
            onComplete();
          }}
          onSkip={() => setShowModal(false)}
        />
      )}
    </>
  );
}
