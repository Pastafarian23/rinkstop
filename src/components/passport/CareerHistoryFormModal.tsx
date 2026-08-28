'use client';

/**
 * CareerHistoryFormModal — inline modal for adding a team affiliation.
 *
 * Mounted from HockeyCareerSection when the owner clicks '+ Add career
 * affiliation'. Submits to /api/passport/team-history.
 *
 * Pattern mirrors StatsFormModal: separate component from the dashboard
 * full-page form because they have different UX requirements (this one
 * stays in place on success, the dashboard one navigates).
 */

import { useState } from 'react';
import PassportModal from './PassportModal';

interface Season {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
}

interface Team {
  id: string;
  name: string;
  slug: string;
  league_id: string | null;
  leagues: { name: string } | { name: string }[] | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  playerName: string;
  seasons: Season[];
  teams: Team[];
}

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

const POSITIONS = [
  { value: '', label: '—' },
  { value: 'forward', label: 'Forward' },
  { value: 'defense', label: 'Defense' },
  { value: 'goalie', label: 'Goalie' },
];

const ROLES = [
  { value: 'player', label: 'Player' },
  { value: 'captain', label: 'Captain' },
  { value: 'alternate_captain', label: 'Alternate captain' },
  { value: 'goalie', label: 'Goalie (role)' },
  { value: 'other', label: 'Other' },
];

function leagueName(league: Team['leagues']): string | null {
  if (!league) return null;
  if (Array.isArray(league)) return league[0]?.name ?? null;
  return league.name ?? null;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: 6,
  padding: '0.5rem 0.625rem',
  color: '#fff',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'rgba(255, 255, 255, 0.55)',
  marginBottom: '0.25rem',
};

export default function CareerHistoryFormModal({
  open,
  onClose,
  onSaved,
  playerName,
  seasons,
  teams,
}: Props) {
  const [form, setForm] = useState({
    team_id: '',
    team_name: '',
    season_id: '',
    start_date: '',
    end_date: '',
    level: '',
    position: '',
    role: 'player',
    jersey_number: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.team_id && !form.team_name.trim()) {
      setError('Pick a team from the list or type the team name.');
      return;
    }
    if (!form.season_id) {
      setError('Please pick a season.');
      return;
    }

    setSubmitting(true);
    try {
      // When team_id is set, the server uses it. When only team_name is
      // provided (off-directory team), the server stores the snapshot.
      const body: Record<string, any> = {
        season_id: form.season_id,
        level: form.level || null,
        position: form.position || null,
        role: form.role,
        jersey_number: form.jersey_number ? Number(form.jersey_number) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      if (form.team_id) body.team_id = form.team_id;
      else body.team_name_snapshot = form.team_name.trim();

      const r = await fetch('/api/passport/team-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(json.error ?? `Failed to save (HTTP ${r.status}).`);
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
      setSubmitting(false);
    }
  }

  return (
    <PassportModal open={open} onClose={onClose} title="Add team affiliation" maxWidth={640}>
      <form onSubmit={handleSubmit}>
        <p
          style={{
            color: 'rgba(255, 255, 255, 0.65)',
            fontSize: '0.8125rem',
            margin: '0 0 1rem',
          }}
        >
          Adding a career affiliation for <strong>{playerName}</strong>.
        </p>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>Team (pick from directory or type name)</label>
            <select
              style={inputStyle}
              value={form.team_id}
              onChange={(e) => {
                setForm((f) => ({
                  ...f,
                  team_id: e.target.value,
                  team_name: '',
                }));
              }}
            >
              <option value="">— pick from directory —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {leagueName(t.leagues) ? ` (${leagueName(t.leagues)})` : ''}
                </option>
              ))}
            </select>
            <input
              style={{ ...inputStyle, marginTop: '0.375rem' }}
              type="text"
              placeholder="…or type the team name if not in directory"
              value={form.team_name}
              onChange={(e) => {
                setForm((f) => ({
                  ...f,
                  team_name: e.target.value,
                  team_id: '',
                }));
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Season</label>
              <select
                style={inputStyle}
                value={form.season_id}
                onChange={handleChange('season_id')}
                required
              >
                <option value="">— pick a season —</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Level</label>
              <select style={inputStyle} value={form.level} onChange={handleChange('level')}>
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Position</label>
              <select style={inputStyle} value={form.position} onChange={handleChange('position')}>
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <select style={inputStyle} value={form.role} onChange={handleChange('role')}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Jersey #</label>
              <input
                style={inputStyle}
                type="number"
                min={0}
                max={99}
                value={form.jersey_number}
                onChange={handleChange('jersey_number')}
              />
            </div>
            <div>
              <label style={labelStyle}>Start date</label>
              <input style={inputStyle} type="date" value={form.start_date} onChange={handleChange('start_date')} />
            </div>
            <div>
              <label style={labelStyle}>End date</label>
              <input style={inputStyle} type="date" value={form.end_date} onChange={handleChange('end_date')} />
            </div>
          </div>

          {error && (
            <p
              style={{
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.5rem 0.75rem',
                borderRadius: 6,
                fontSize: '0.8125rem',
                margin: 0,
              }}
            >
              {error}
            </p>
          )}

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'flex-end',
              marginTop: '0.5rem',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 6,
                color: 'rgba(255, 255, 255, 0.85)',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: '#14B8A6',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                padding: '0.5rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Saving…' : 'Save affiliation'}
            </button>
          </div>
        </div>
      </form>
    </PassportModal>
  );
}
