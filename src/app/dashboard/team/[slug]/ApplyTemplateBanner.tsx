'use client';

import { useState } from 'react';

interface Props {
  teamSlug: string;
  federationName: string;
}

export function ApplyTemplateBanner({ teamSlug, federationName }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function apply() {
    setState('loading');
    try {
      const res = await fetch(
        `/api/team/${encodeURIComponent(teamSlug)}/apply-federation-template`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setState('done');
    } catch (err) {
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <div
        style={{
          background: 'rgba(20,184,166,0.08)',
          border: '1px solid rgba(20,184,166,0.35)',
          borderRadius: 10,
          padding: '0.85rem 1.1rem',
          fontSize: '0.85rem',
          color: '#14B8A6',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
        }}
      >
        <span style={{ fontSize: '1rem' }}>✅</span>
        <span>
          <strong>{federationName}</strong> required documents template applied. Reload the page to
          see them in the compliance widget.
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'rgba(4,30,66,0.35)',
        border: '1px solid rgba(4,30,66,0.7)',
        borderRadius: 10,
        padding: '0.85rem 1.1rem',
        fontSize: '0.85rem',
        color: 'rgba(255,255,255,0.85)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: '1rem' }}>📋</span>
      <span style={{ flex: 1 }}>
        <strong>{federationName}</strong> template available —{' '}
        {federationName} requires{' '}
        documents like birth certificates, insurance, safeguarding, and codes of conduct.
        Import the required-doc template now.
      </span>
      <button
        onClick={apply}
        disabled={state === 'loading'}
        style={{
          padding: '0.4rem 0.9rem',
          background: state === 'loading' ? 'rgba(200,16,46,0.5)' : '#C8102E',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontWeight: 700,
          fontSize: '0.8rem',
          cursor: state === 'loading' ? 'wait' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {state === 'loading' ? 'Applying…' : 'Apply template →'}
      </button>
      {state === 'error' && (
        <span style={{ color: '#FF6B7A', fontSize: '0.75rem' }}>
          Failed. Check your admin role or try again.
        </span>
      )}
    </div>
  );
}
