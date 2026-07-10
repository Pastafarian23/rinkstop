'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const TYPES = [
  { value: 'skills',                   label: 'Skills (on-ice performance, technique)' },
  { value: 'character',                label: 'Character (work ethic, attitude, coachability)' },
  { value: 'leadership',               label: 'Leadership (in locker room, on bench, on ice)' },
  { value: 'eligible_for_next_level', label: 'Eligible for next level (ready to move up)' },
  { value: 'rec_ready',                label: 'Recruitment ready (college/Junior eligible)' },
  { value: 'other',                    label: 'Other' },
];

const VISIBILITY = [
  { value: 'sport_scoped', label: 'Sport scoped (hockey only, visible everywhere)' },
  { value: 'cross_sport',  label: 'Cross-sport (also visible if player has other sports)' },
  { value: 'private',      label: 'Private (only you and the player see it)' },
];

export default function EndorsePlayerFormClient({
  playerId,
  playerName,
  playerHref,
}: {
  playerId: string;
  playerName: string;
  playerHref: string | null;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    endorsement_type: 'skills',
    text: '',
    visibility: 'sport_scoped',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.text.trim().length < 10) {
      setError('Endorsement text must be at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/coach/endorsements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: playerId,
          endorsement_type: form.endorsement_type,
          text: form.text,
          visibility: form.visibility,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to save.');
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
      setSubmitting(false);
    } catch (e: any) {
      setError(e?.message ?? 'Network error.');
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: '#fff',
    fontSize: '0.875rem',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 4,
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#041E42] text-white">
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
          <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
            <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
            <span style={{ margin: '0 0.4rem' }}>›</span>
            <Link href="/dashboard/coach" style={{ color: 'rgba(255,255,255,0.5)' }}>Coach</Link>
            <span style={{ margin: '0 0.4rem' }}>›</span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>Endorse</span>
          </nav>
          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              letterSpacing: '0.04em',
              marginBottom: '0.75rem',
            }}
          >
            ENDORSEMENT SUBMITTED
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9375rem', marginBottom: '1rem' }}>
            Your endorsement of {playerName} is live.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link
              href="/dashboard/coach/endorsements"
              style={{
                background: '#C8102E',
                color: '#fff',
                padding: '0.75rem 1.5rem',
                borderRadius: 6,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.875rem',
              }}
            >
              See my endorsements
            </Link>
            {playerHref && (
              <Link
                href={playerHref}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6,
                  color: 'rgba(255,255,255,0.7)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                }}
              >
                See player passport
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#041E42] text-white">
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/dashboard/coach" style={{ color: 'rgba(255,255,255,0.5)' }}>Coach</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Endorse {playerName}</span>
        </nav>

        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            letterSpacing: '0.04em',
            marginBottom: '0.25rem',
          }}
        >
          ENDORSE {playerName.toUpperCase()}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          Add a coach-issued endorsement. Visible on the player&apos;s passport.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Endorsement type</label>
            <select
              value={form.endorsement_type}
              onChange={(e) => setForm((f) => ({ ...f, endorsement_type: e.target.value }))}
              style={inputStyle}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Endorsement text</label>
            <textarea
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              rows={5}
              maxLength={1000}
              placeholder={`What do you want to attest about ${playerName}? Be specific: technique, character, coachability, performance under pressure.`}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
            />
            <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              {form.text.length}/1000 chars (min 10)
            </p>
          </div>

          <div>
            <label style={labelStyle}>Visibility</label>
            <select
              value={form.visibility}
              onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value }))}
              style={inputStyle}
            >
              {VISIBILITY.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div style={{ padding: '0.75rem', background: 'rgba(200,16,46,0.18)', color: '#FF6B7A', borderRadius: 6, fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: '#C8102E',
                color: '#fff',
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Submitting…' : 'Submit endorsement'}
            </button>
            <Link
              href="/dashboard/coach"
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                color: 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}