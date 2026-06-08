'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

interface Props {
  stateSlug: string;
  stateName: string;
  stateCode: string;
  source: string;
  magSource: string;
  rinkCount: number;
}

export default function LeadMagnetForm({ stateSlug, stateName, stateCode, source, magSource, rinkCount }: Props) {
  const { isSignedIn, user } = useUser();
  const [email, setEmail] = useState(isSignedIn && user?.emailAddresses?.[0]?.emailAddress || '');
  const [role, setRole] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          source,
          mag_source: magSource,
          state: stateCode,
          role: role || undefined,
          // Honeypot — bots fill this, humans don't see it
          website_url: '',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
        <p style={{
          color: '#fff', fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.5rem', margin: '0 0 0.5rem', letterSpacing: '0.04em',
        }}>
          ✓ YOU'RE IN
        </p>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', margin: '0 0 1rem' }}>
          Here's the complete {stateName} rink list:
        </p>
        <Link
          href={`/free/${stateSlug}/list`}
          style={{
            display: 'inline-block',
            background: '#fff', color: '#C8102E',
            padding: '0.75rem 1.5rem', borderRadius: 6,
            fontWeight: 700, fontSize: '0.95rem',
            textDecoration: 'none',
            letterSpacing: '0.02em',
          }}
        >
          VIEW {rinkCount} RINKS →
        </Link>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', margin: '1rem 0 0' }}>
          Tip: use your browser's "Save as PDF" to download the list.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{
        color: '#fff', fontFamily: "'Bebas Neue', Impact, sans-serif",
        fontSize: '1.5rem', margin: '0 0 0.25rem', letterSpacing: '0.04em',
        lineHeight: 1,
      }}>
        GET THE FREE {stateName.toUpperCase()} RINK LIST
      </p>
      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', margin: 0 }}>
        {rinkCount} rinks · addresses, phones, websites · 2025-26 season
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          autoComplete="email"
          style={{
            background: 'rgba(255,255,255,0.95)',
            border: 'none',
            borderRadius: 6,
            padding: '0.875rem 1rem',
            color: '#0a0a0a',
            fontSize: '1rem',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />

        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.95)',
            border: 'none',
            borderRadius: 6,
            padding: '0.875rem 1rem',
            color: role ? '#0a0a0a' : '#666',
            fontSize: '1rem',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        >
          <option value="">I am a... (optional)</option>
          <option value="parent">Parent of a player</option>
          <option value="player">Player</option>
          <option value="coach">Coach</option>
          <option value="fan">Hockey fan</option>
          <option value="rink_owner">Rink owner / manager</option>
          <option value="league_manager">League manager</option>
        </select>

        {/* Honeypot — visually hidden, not in the layout */}
        <input
          type="text"
          name="website_url"
          tabIndex={-1}
          autoComplete="off"
          style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
          aria-hidden="true"
        />
      </div>

      {error && (
        <p style={{ color: '#FFE082', fontSize: '0.85rem', margin: 0 }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          background: submitting ? '#1a1a1a' : '#041E42',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '0.875rem 1.5rem',
          fontSize: '1rem',
          fontWeight: 700,
          cursor: submitting ? 'not-allowed' : 'pointer',
          letterSpacing: '0.02em',
          fontFamily: 'inherit',
          marginTop: '0.25rem',
        }}
      >
        {submitting ? 'Sending...' : `SEND ME THE ${rinkCount} RINKS →`}
      </button>

      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', margin: 0, textAlign: 'center' }}>
        No spam. Unsubscribe in one click.
      </p>
    </form>
  );
}
