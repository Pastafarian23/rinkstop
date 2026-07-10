'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const POSITIONS = [
  { value: '',         label: '— Not set —' },
  { value: 'forward',  label: 'Forward' },
  { value: 'defense',  label: 'Defense' },
  { value: 'goalie',   label: 'Goalie' },
];

export default function FederationFormClient({
  playerId,
  playerName,
  initialUsaHockey,
  initialHockeyCanada,
  initialPositionCategory,
}: {
  playerId: string;
  playerName: string;
  initialUsaHockey: string;
  initialHockeyCanada: string;
  initialPositionCategory: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    usa_hockey_number: initialUsaHockey,
    hockey_canada_number: initialHockeyCanada,
    primary_position_category: initialPositionCategory,
  });

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    setSubmitting(true);
    try {
      const res = await fetch('/api/passport/federation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to save.');
        setSubmitting(false);
        return;
      }
      setSaved(true);
      // Refresh server data on the passport page after navigation
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

  return (
    <main className="min-h-screen bg-[#041E42] text-white">
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/dashboard/passport" style={{ color: 'rgba(255,255,255,0.5)' }}>Passport</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Federation</span>
        </nav>

        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            letterSpacing: '0.04em',
            marginBottom: '0.5rem',
          }}
        >
          FEDERATION REGISTRATION
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          Add {playerName}&apos;s federation registration numbers. These appear on your public passport.
          Currently self-reported — federation API verification ships in a later phase.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>USA Hockey registration number</label>
            <input
              type="text"
              value={form.usa_hockey_number}
              onChange={handleChange('usa_hockey_number')}
              placeholder="e.g. 123456789"
              style={inputStyle}
            />
            <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              Find this at usahockey.com → MyHockey → Profile
            </p>
          </div>

          <div>
            <label style={labelStyle}>Hockey Canada registration number</label>
            <input
              type="text"
              value={form.hockey_canada_number}
              onChange={handleChange('hockey_canada_number')}
              placeholder="e.g. HC-12345"
              style={inputStyle}
            />
            <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              Find this at hockeycanada.ca → Member Profile
            </p>
          </div>

          <div>
            <label style={labelStyle}>Primary position</label>
            <select value={form.primary_position_category} onChange={handleChange('primary_position_category')} style={inputStyle}>
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              Sets which stats columns appear by default (skater vs goalie).
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
              {submitting ? 'Saving…' : 'Save'}
            </button>
            <Link
              href="/dashboard/passport"
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                color: 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              Back to passport
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}