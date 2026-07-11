'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Season = { id: string; label: string; start_date: string; end_date: string };
type TeamHistory = {
  id: string;
  team_name_snapshot: string;
  season_id: string;
  level: string | null;
  position: string | null;
  jersey_number: number | null;
};
type ExistingStat = {
  season_id: string;
  team_history_id: string | null;
  level: string | null;
  games_played: number;
  goals: number;
  assists: number;
  plus_minus: number;
  penalty_minutes: number;
  save_percentage: number | null;
  gaa: number | null;
};

const LEVELS = [
  { value: '', label: '—' },
  { value: 'youth', label: 'Youth' },
  { value: 'house', label: 'House league' },
  { value: 'travel', label: 'Travel' },
  { value: 'aaa', label: 'AAA' },
  { value: 'aa', label: 'AA' },
  { value: 'a', label: 'A' },
  { value: 'high_school', label: 'High school' },
  { value: 'junior', label: 'Junior' },
  { value: 'college', label: 'College' },
  { value: 'pro', label: 'Pro' },
  { value: 'recreational', label: 'Recreational' },
  { value: 'other', label: 'Other' },
];

export default function StatsFormClient({
  playerId,
  playerName,
  positionCategory,
  seasons,
  teamHistory,
  existingStats,
}: {
  playerId: string;
  playerName: string;
  positionCategory: string | null;
  seasons: Season[];
  teamHistory: TeamHistory[];
  existingStats: ExistingStat[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isGoalieDefault = positionCategory === 'goalie';

  const [form, setForm] = useState({
    season_id: '',
    team_history_id: '',
    level: '',
    // Skater
    games_played: '',
    goals: '',
    assists: '',
    plus_minus: '',
    penalty_minutes: '',
    // Goalie
    goalie_games_played: '',
    wins: '',
    losses: '',
    goals_against: '',
    saves: '',
    save_percentage: '',
    shutouts: '',
    gaa: '',
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

    setSubmitting(true);
    try {
      const res = await fetch('/api/passport/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season_id: form.season_id,
          team_history_id: form.team_history_id || undefined,
          level: form.level || undefined,
          games_played: form.games_played || 0,
          goals: form.goals || 0,
          assists: form.assists || 0,
          plus_minus: form.plus_minus || 0,
          penalty_minutes: form.penalty_minutes || 0,
          goalie_games_played: form.goalie_games_played || undefined,
          wins: form.wins || undefined,
          losses: form.losses || undefined,
          goals_against: form.goals_against || undefined,
          saves: form.saves || undefined,
          save_percentage: form.save_percentage || undefined,
          shutouts: form.shutouts || undefined,
          gaa: form.gaa || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to save.');
        setSubmitting(false);
        return;
      }
      setSaved(true);
      router.push('/dashboard/passport');
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '0.75rem',
  };
  const sectionHeaderStyle: React.CSSProperties = {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '0.9rem',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginTop: '0.5rem',
    marginBottom: '0.25rem',
  };

  // Find existing stats for the selected season+team combination (if any)
  const existing = form.season_id
    ? existingStats.find(
        (s) => s.season_id === form.season_id && (s.team_history_id ?? '') === form.team_history_id
      )
    : null;

  return (
    <main className="min-h-screen bg-[#041E42] text-white">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <nav style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.5)' }}>Dashboard</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <Link href="/dashboard/passport" style={{ color: 'rgba(255,255,255,0.5)' }}>Passport</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>New season stats</span>
        </nav>

        <h1
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            letterSpacing: '0.04em',
            marginBottom: '0.5rem',
          }}
        >
          ADD SEASON STATS
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          Add per-season stats for {playerName}. Self-reported until a verified coach on the team confirms it.
          {!isGoalieDefault && positionCategory == null && (
            <> Set primary_position_category on your profile to switch to goalie fields.</>
          )}
        </p>

        {existingStats.length > 0 && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(255,184,28,0.06)',
              border: '1px solid rgba(255,184,28,0.2)',
              borderRadius: 8,
              marginBottom: '1.25rem',
              fontSize: '0.8125rem',
              color: 'rgba(255,255,255,0.65)',
            }}
          >
            You already have {existingStats.length} stat record{existingStats.length === 1 ? '' : 's'}.
            Adding the same (player, season, team) combination will fail — edit the existing entry instead.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

          <div>
            <label style={labelStyle}>Team (link to an affiliation, optional)</label>
            <select value={form.team_history_id} onChange={handleChange('team_history_id')} style={inputStyle}>
              <option value="">— Generic, not tied to a specific team affiliation —</option>
              {teamHistory
                .filter((th) => !form.season_id || th.season_id === form.season_id)
                .map((th) => (
                  <option key={th.id} value={th.id}>
                    {th.team_name_snapshot}
                    {th.level ? ` · ${th.level}` : ''}
                    {th.jersey_number != null ? ` · #${th.jersey_number}` : ''}
                  </option>
                ))}
            </select>
          </div>

          {existing && (
            <div
              style={{
                padding: '0.75rem 1rem',
                background: 'rgba(0,150,80,0.06)',
                border: '1px solid rgba(0,150,80,0.2)',
                borderRadius: 8,
                fontSize: '0.8125rem',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              <strong style={{ color: '#009650' }}>Stats already exist for this combination.</strong> Editing flows come in a later phase.
            </div>
          )}

          <div style={sectionHeaderStyle}>Skater stats</div>
          <div style={fieldRowStyle}>
            <div>
              <label style={labelStyle}>GP</label>
              <input type="number" min={0} value={form.games_played} onChange={handleChange('games_played')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Goals</label>
              <input type="number" min={0} value={form.goals} onChange={handleChange('goals')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Assists</label>
              <input type="number" min={0} value={form.assists} onChange={handleChange('assists')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>+/-</label>
              <input type="number" value={form.plus_minus} onChange={handleChange('plus_minus')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>PIM</label>
              <input type="number" min={0} value={form.penalty_minutes} onChange={handleChange('penalty_minutes')} style={inputStyle} />
            </div>
          </div>

          <div style={sectionHeaderStyle}>Goalie stats {isGoalieDefault ? '' : '(optional)'}</div>
          <div style={fieldRowStyle}>
            <div>
              <label style={labelStyle}>GP (G)</label>
              <input type="number" min={0} value={form.goalie_games_played} onChange={handleChange('goalie_games_played')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>W</label>
              <input type="number" min={0} value={form.wins} onChange={handleChange('wins')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>L</label>
              <input type="number" min={0} value={form.losses} onChange={handleChange('losses')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>GA</label>
              <input type="number" min={0} value={form.goals_against} onChange={handleChange('goals_against')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Saves</label>
              <input type="number" min={0} value={form.saves} onChange={handleChange('saves')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>SV% (0-1)</label>
              <input type="number" min={0} max={1} step={0.001} value={form.save_percentage} onChange={handleChange('save_percentage')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>SO</label>
              <input type="number" min={0} value={form.shutouts} onChange={handleChange('shutouts')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>GAA</label>
              <input type="number" min={0} step={0.01} value={form.gaa} onChange={handleChange('gaa')} style={inputStyle} />
            </div>
          </div>

          {error && (
            <div style={{ padding: '0.75rem', background: 'rgba(200,16,46,0.18)', color: '#FF6B7A', borderRadius: 6, fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          {saved && !error && (
            <div style={{ padding: '0.75rem', background: 'rgba(0,150,80,0.18)', color: '#009650', borderRadius: 6, fontSize: '0.875rem' }}>
              Added to your passport.{" "}
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
              {submitting ? 'Saving…' : 'Save stats'}
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
