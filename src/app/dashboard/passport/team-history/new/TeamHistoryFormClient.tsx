'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Season = { id: string; label: string; start_date: string; end_date: string };
type Team = { id: string; name: string; slug: string; league_id: string | null; leagues: { name: string } | { name: string }[] | null };

const LEVELS = [
  { value: '',             label: '—' },
  { value: 'youth',        label: 'Youth' },
  { value: 'house',        label: 'House league' },
  { value: 'travel',       label: 'Travel' },
  { value: 'aaa',          label: 'AAA' },
  { value: 'aa',           label: 'AA' },
  { value: 'a',            label: 'A' },
  { value: 'high_school',  label: 'High school' },
  { value: 'junior',       label: 'Junior' },
  { value: 'college',      label: 'College' },
  { value: 'pro',          label: 'Pro' },
  { value: 'recreational', label: 'Recreational' },
  { value: 'other',        label: 'Other' },
];

const POSITIONS = [
  { value: '',         label: '—' },
  { value: 'forward',  label: 'Forward' },
  { value: 'defense',  label: 'Defense' },
  { value: 'goalie',   label: 'Goalie' },
];

const ROLES = [
  { value: 'player',             label: 'Player' },
  { value: 'captain',            label: 'Captain' },
  { value: 'alternate_captain',  label: 'Alternate captain' },
  { value: 'goalie',             label: 'Goalie (role)' },
  { value: 'other',              label: 'Other' },
];

function leagueName(league: Team['leagues']): string | null {
  if (!league) return null;
  if (Array.isArray(league)) return league[0]?.name ?? null;
  return league.name ?? null;
}

export default function TeamHistoryFormClient({
  playerId,
  playerName,
  seasons,
  teams,
}: {
  playerId: string;
  playerName: string;
  seasons: Season[];
  teams: Team[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    team_id: '',
    team_name_freeform: '',
    season_id: '',
    level: '',
    jersey_number: '',
    position: '',
    role: 'player',
    start_date: '',
    end_date: '',
  });

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.season_id) {
      setError('Please pick a season.');
      return;
    }
    if (!form.team_id && !form.team_name_freeform.trim()) {
      setError('Pick a team from the list or enter a team name.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/passport/team-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: form.team_id || undefined,
          team_name: form.team_id ? undefined : form.team_name_freeform.trim(),
          season_id: form.season_id,
          level: form.level || undefined,
          jersey_number: form.jersey_number || undefined,
          position: form.position || undefined,
          role: form.role || undefined,
          start_date: form.start_date || undefined,
          end_date: form.end_date || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to save.');
        setSubmitting(false);
        return;
      }
      setSaved(true);
      router.push(`/dashboard/passport`);
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
  const fieldRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  };

  return (
    <main className="min-h-screen bg-[#041E42] text-white">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/dashboard/passport" style={{ color: 'rgba(255,255,255,0.5)' }}>Passport</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>New team affiliation</span>
        </nav>

        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            letterSpacing: '0.04em',
            marginBottom: '0.5rem',
          }}
        >
          ADD A TEAM AFFILIATION
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          Add a season of {playerName}&apos;s career. Self-reported until a verified coach on this team confirms it.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Team *</label>
            <select value={form.team_id} onChange={handleChange('team_id')} style={inputStyle}>
              <option value="">— Select a team, or enter a name below —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {leagueName(t.leagues) ? ` · ${leagueName(t.leagues)}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Team name (freeform, only if team not in list)</label>
            <input
              type="text"
              value={form.team_name_freeform}
              onChange={handleChange('team_name_freeform')}
              placeholder="e.g. Chicago Mission 14U AAA"
              disabled={!!form.team_id}
              style={{ ...inputStyle, opacity: form.team_id ? 0.5 : 1 }}
            />
          </div>

          <div style={fieldRowStyle}>
            <div>
              <label style={labelStyle}>Season *</label>
              <select value={form.season_id} onChange={handleChange('season_id')} style={inputStyle} required>
                <option value="">— Pick a season —</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Level</label>
              <select value={form.level} onChange={handleChange('level')} style={inputStyle}>
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={fieldRowStyle}>
            <div>
              <label style={labelStyle}>Jersey number (0-99)</label>
              <input
                type="number"
                value={form.jersey_number}
                onChange={handleChange('jersey_number')}
                min={0}
                max={99}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Position</label>
              <select value={form.position} onChange={handleChange('position')} style={inputStyle}>
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={fieldRowStyle}>
            <div>
              <label style={labelStyle}>Role on team</label>
              <select value={form.role} onChange={handleChange('role')} style={inputStyle}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div></div>
          </div>

          <div style={fieldRowStyle}>
            <div>
              <label style={labelStyle}>Start date</label>
              <input type="date" value={form.start_date} onChange={handleChange('start_date')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>End date (leave blank if current)</label>
              <input type="date" value={form.end_date} onChange={handleChange('end_date')} style={inputStyle} />
            </div>
          </div>

          {error && (
            <div style={{ padding: '0.75rem', background: 'rgba(200,16,46,0.18)', color: '#FF6B7A', borderRadius: 6, fontSize: '0.875rem' }}>
              {error}
            </div>
          )}
          {saved && !error && (
            <div style={{ padding: '0.75rem', background: 'rgba(0,150,80,0.18)', color: '#009650', borderRadius: 6, fontSize: '0.875rem' }}>
              Added to your passport.{' '}
              <Link href="/dashboard/passport" style={{ color: '#009650', textDecoration: 'underline' }}>
                View your full passport →
              </Link>
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
              {submitting ? 'Saving…' : 'Save affiliation'}
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
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
