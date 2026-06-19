'use client';

import { useState } from 'react';

interface Props {
  teamSlug: string;
  teamName: string;
}

export default function JoinWithCodeForm({ teamSlug, teamName }: Props) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function normalize(raw: string): string {
    return raw.toUpperCase().replace(/\s+/g, '').trim();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalize(code);
    if (normalized.length < 4) {
      setError('Codes are at least 4 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    // Hand off to the existing /join/[code] route. It handles auth,
    // identity-verification check, invite state, and the actual redeem.
    window.location.href = `/join/${encodeURIComponent(normalized)}?from_team=${encodeURIComponent(teamSlug)}`;
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        marginTop: '1.25rem',
        padding: '1rem',
        background: 'rgba(20,184,166,0.06)',
        border: '1px solid rgba(20,184,166,0.25)',
        borderRadius: 8,
        color: '#fff',
      }}
    >
      <label
        htmlFor="invite-code-input"
        style={{
          display: 'block',
          fontSize: '0.78rem',
          fontWeight: 700,
          color: '#14B8A6',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: '0.4rem',
        }}
      >
        Have an invite code?
      </label>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch', flexWrap: 'wrap' }}>
        <input
          id="invite-code-input"
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          placeholder="e.g. ABC123"
          autoComplete="off"
          spellCheck={false}
          maxLength={32}
          style={{
            flex: '1 1 200px',
            padding: '0.6rem 0.75rem',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 6,
            color: '#fff',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.95rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="submit"
          disabled={busy || code.trim().length === 0}
          style={{
            padding: '0.6rem 1.25rem',
            background: busy || code.trim().length === 0 ? 'rgba(20,184,166,0.35)' : '#14B8A6',
            color: '#041E42',
            border: 'none',
            borderRadius: 6,
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: busy || code.trim().length === 0 ? 'not-allowed' : 'pointer',
            letterSpacing: '0.02em',
          }}
        >
          {busy ? 'Joining…' : 'Join team'}
        </button>
      </div>
      <p
        style={{
          margin: '0.6rem 0 0',
          fontSize: '0.78rem',
          color: 'rgba(255,255,255,0.55)',
        }}
      >
        Codes are case-insensitive. You&rsquo;ll join <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{teamName}</strong> with
        the role assigned to the code.
      </p>
      {error && (
        <div
          role="alert"
          style={{
            marginTop: '0.6rem',
            padding: '0.5rem 0.75rem',
            background: 'rgba(200,16,46,0.10)',
            border: '1px solid rgba(200,16,46,0.35)',
            color: '#FF6B7A',
            borderRadius: 6,
            fontSize: '0.78rem',
          }}
        >
          {error}
        </div>
      )}
    </form>
  );
}