'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Team = { id: string; name: string; slug: string; league_id: string | null; leagues: { name: string } | { name: string }[] | null };

function leagueName(league: Team['leagues']): string | null {
  if (!league) return null;
  if (Array.isArray(league)) return league[0]?.name ?? null;
  return league.name ?? null;
}

// WS8 PR4: license_number / license_issuing_authority / license_expires_at
// were removed from coach_profiles. Federation registration goes through
// /dashboard/coach/credentials (which writes to federation_registrations).
// The form below handles only the personal-coach profile fields that remain:
// years_coaching, current_team_id, bio.
export default function CoachProfileFormClient({
  coachName,
  initial,
  verificationStatus,
  teams,
}: {
  coachName: string;
  initial: {
    years_coaching: string;
    current_team_id: string;
    bio: string;
  };
  verificationStatus: string;
  teams: Team[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState(initial);

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    setSubmitting(true);
    try {
      const res = await fetch('/api/coaches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          years_coaching: form.years_coaching === '' ? null : Number(form.years_coaching),
          current_team_id: form.current_team_id || null,
          bio: form.bio || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to save.');
        setSubmitting(false);
        return;
      }
      setSaved(true);
      router.refresh();
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

  const isVerified = verificationStatus === 'platform_verified' || verificationStatus === 'federation_verified';

  return (
    <main className="min-h-screen bg-[#041E42] text-white">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/dashboard/coach" style={{ color: 'rgba(255,255,255,0.5)' }}>Coach</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Profile</span>
        </nav>

        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            letterSpacing: '0.04em',
            marginBottom: '0.5rem',
          }}
        >
          COACH PROFILE
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          Add your coaching credentials to verify player records. Self-reported for v1 — platform verification
          comes in a later phase.
        </p>

        <div
          style={{
            padding: '0.75rem 1rem',
            background: isVerified ? 'rgba(0,150,80,0.06)' : 'rgba(255,184,28,0.06)',
            border: `1px solid ${isVerified ? 'rgba(0,150,80,0.2)' : 'rgba(255,184,28,0.2)'}`,
            borderRadius: 8,
            marginBottom: '1.25rem',
            fontSize: '0.8125rem',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          Verification status:{' '}
          <strong style={{ color: isVerified ? '#009650' : '#FFB81C' }}>
            {verificationStatus === 'self_reported' ? 'Self-reported (not yet verified)' : verificationStatus.replace(/_/g, ' ')}
          </strong>
        </div>

        {/* WS8 PR4: redirect federation/license registration here. */}
        <div
          data-testid="federation-credential-cta"
          style={{
            padding: '1rem 1.25rem',
            background: 'rgba(20,184,166,0.06)',
            border: '1px solid rgba(20,184,166,0.3)',
            borderRadius: 10,
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 220, fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
            <div style={{ color: '#14B8A6', fontWeight: 700, marginBottom: 4 }}>
              Manage your federation registration
            </div>
            USA Hockey, Hockey Canada, IIHF, and other federation/license numbers are managed in the Credentials page. The admin team can verify them after submission.
          </div>
          <Link
            href="/dashboard/coach/credentials"
            data-testid="coach-credentials-link"
            style={{
              padding: '0.6rem 1.1rem',
              background: '#14B8A6',
              color: '#0a0a0a',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
            }}
          >
            Open credentials →
          </Link>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Years coaching</label>
            <input
              type="number"
              min={0}
              max={80}
              value={form.years_coaching}
              onChange={handleChange('years_coaching')}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Current team</label>
            <select value={form.current_team_id} onChange={handleChange('current_team_id')} style={inputStyle}>
              <option value="">— None —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {leagueName(t.leagues) ? ` · ${leagueName(t.leagues)}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Bio</label>
            <textarea
              value={form.bio}
              onChange={handleChange('bio')}
              rows={4}
              maxLength={1000}
              placeholder="Coaching philosophy, achievements, certifications..."
              style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
            />
            <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              {form.bio.length}/1000 chars
            </p>
          </div>

          {error && (
            <div style={{ padding: '0.75rem', background: 'rgba(200,16,46,0.18)', color: '#FF6B7A', borderRadius: 6, fontSize: '0.875rem' }}>
              {error}
            </div>
          )}
          {saved && !error && (
            <div style={{ padding: '0.75rem', background: 'rgba(0,150,80,0.18)', color: '#009650', borderRadius: 6, fontSize: '0.875rem' }}>
              Saved.
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
              {submitting ? 'Saving…' : 'Save coach profile'}
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
              Back to coach hub
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
