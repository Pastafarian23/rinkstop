'use client';

/**
 * src/components/passport/PassportCardActions.tsx
 *
 * Bottom action buttons for the Passport Card.
 *
 * Per WS2 PR2 spec (workstreams/passport-card-design-system.md, "Card Anatomy — Bottom Actions"):
 *
 * 1. Copy Passport ID — primary, always enabled. Writes to clipboard.
 * 2. Share Passport — disabled, tooltip "Public Passport sharing ships in a future release".
 * 3. View Public Passport — disabled, tooltip "Coming soon".
 *
 * All three exist from day one so users understand the roadmap. PR3 (WS2)
 * enables buttons 2 and 3 once the public Passport surface exists.
 *
 * Server-side rendering: this is a client component solely because the copy
 * action uses navigator.clipboard. The Card itself stays server-rendered; only
 * this small interactive footer is client.
 */

import { useState } from 'react';

interface PassportCardActionsProps {
  passportId: string;
  /** Optional resolved URL to the public Passport page; undefined while PR3 ships. */
  publicPassportUrl?: string;
}

export function PassportCardActions({
  passportId,
  publicPassportUrl,
}: PassportCardActionsProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function handleCopy(): Promise<void> {
    setCopyError(null);
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        throw new Error('Clipboard API not available in this environment.');
      }
      await navigator.clipboard.writeText(passportId);
      setCopied(true);
      // Reset the confirmation state after 2.5s
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : 'Copy failed');
      setTimeout(() => setCopyError(null), 4000);
    }
  }

  const baseStyle: React.CSSProperties = {
    borderRadius: 8,
    padding: '0.5rem 0.875rem',
    fontSize: '0.8125rem',
    fontFamily: 'inherit',
    cursor: 'pointer',
  };

  const primaryStyle: React.CSSProperties = {
    ...baseStyle,
    background: copied ? 'rgba(255, 184, 28, 0.15)' : 'rgba(255, 184, 28, 0.08)',
    border: `1px solid ${copied ? '#FFB81C' : 'rgba(255, 184, 28, 0.4)'}`,
    color: copied ? '#FFB81C' : '#fff',
    fontWeight: 500,
  };

  const disabledStyle: React.CSSProperties = {
    ...baseStyle,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'not-allowed',
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Passport ID copied to clipboard' : 'Copy Passport ID to clipboard'}
        style={primaryStyle}
      >
        {copied ? '✓ Copied' : 'Copy Passport ID'}
      </button>
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Public Passport sharing ships in a future release"
        style={disabledStyle}
      >
        Share Passport
      </button>
      {publicPassportUrl ? (
        <a
          href={publicPassportUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View your public Passport in a new tab"
          style={{
            ...baseStyle,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#fff',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          View Public Passport
        </a>
      ) : (
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Coming soon"
          style={disabledStyle}
        >
          View Public Passport
        </button>
      )}
      {copyError && (
        <span
          role="status"
          style={{
            fontSize: '0.75rem',
            color: 'rgba(248, 113, 113, 0.9)',
            marginLeft: '0.25rem',
          }}
        >
          {copyError}
        </span>
      )}
    </div>
  );
}
