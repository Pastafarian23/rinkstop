'use client';

/**
 * StatsFormModal — inline modal for adding per-season stats.
 *
 * Mounted from HockeyStatsSection when the owner clicks '+ Add season
 * stats'. Submits to /api/passport/stats, which handles all validation
 * (tier gate, player lookup, numeric field checks, duplicate detection).
 *
 * On success: closes the modal, calls onSaved() so the parent can refresh.
 * On error: shows the error message inline, keeps the modal open.
 *
 * Position-aware: skater fields (GP/G/A/+/-/PIM) shown by default,
 * goalie fields (W/L/GA/GAA/SV%/SO) added when `positionCategory` is
 * 'goalie'. Either group can be filled; the form lets you mix if you
 * really want to (catches edge cases like a player who skated AND played
 * some goalie minutes in a season).
 *
 * Why a separate component from the dashboard form:
 *   - The dashboard form (StatsFormClient) is a full page that calls
 *     router.push() on success. This one lives inside the profile page
 *     and uses callbacks so the section re-fetches in place.
 *   - Sharing form fields between two components risks subtle drift.
 *     Better to have one source of truth and refactor later if needed.
 */

import { useState } from 'react';
import PassportModal from './PassportModal';

interface Season {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
}

interface TeamHistory {
  id: string;
  team_name_snapshot: string;
  season_id: string;
  level: string | null;
  position: string | null;
  jersey_number: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  playerName: string;
  positionCategory: string | null;
  seasons: Season[];
  teamHistory: TeamHistory[];
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

export default function StatsFormModal({
  open,
  onClose,
  onSaved,
  playerName,
  positionCategory,
  seasons,
  teamHistory,
}: Props) {
  const [form, setForm] = useState({
    season_id: '',
    team_history_id: '',
    level: '',
    games_played: '',
    goals: '',
    assists: '',
    plus_minus: '',
    penalty_minutes: '',
    goalie_games_played: '',
    wins: '',
    losses: '',
    saves: '',
    save_percentage: '',
    shutouts: '',
    gaa: '',
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

    if (!form.season_id) {
      setError('Please pick a season.');
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch('/api/passport/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season_id: form.season_id,
          team_history_id: form.team_history_id || null,
          level: form.level || null,
          games_played: form.games_played ? Number(form.games_played) : 0,
          goals: form.goals ? Number(form.goals) : 0,
          assists: form.assists ? Number(form.assists) : 0,
          plus_minus: form.plus_minus !== '' ? Number(form.plus_minus) : 0,
          penalty_minutes: form.penalty_minutes ? Number(form.penalty_minutes) : 0,
          goalie_games_played: form.goalie_games_played ? Number(form.goalie_games_played) : null,
          wins: form.wins ? Number(form.wins) : null,
          losses: form.losses ? Number(form.losses) : null,
          saves: form.saves ? Number(form.saves) : null,
          save_percentage: form.save_percentage ? Number(form.save_percentage) : null,
          shutouts: form.shutouts ? Number(form.shutouts) : null,
          gaa: form.gaa ? Number(form.gaa) : null,
        }),
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

  const isGoalie = positionCategory === 'goalie';

  return (
    <PassportModal open={open} onClose={onClose} title="Add season stats" maxWidth={640}>
      <form onSubmit={handleSubmit}>
        <p
          style={{
            color: 'rgba(255, 255, 255, 0.65)',
            fontSize: '0.8125rem',
            margin: '0 0 1rem',
          }}
        >
          Adding stats to <strong>{playerName}</strong>'s hockey passport.
          {isGoalie
            ? ' Goalie stats form below.'
            : ' Skater stats form below (goals, assists, etc).'}
        </p>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
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
              <select
                style={inputStyle}
                value={form.level}
                onChange={handleChange('level')}
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Team affiliation (optional)</label>
            <select
              style={inputStyle}
              value={form.team_history_id}
              onChange={handleChange('team_history_id')}
            >
              <option value="">—</option>
              {teamHistory.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.team_name_snapshot}
                  {t.level ? ` (${t.level})` : ''}
                  {t.jersey_number != null ? ` #${t.jersey_number}` : ''}
                </option>
              ))}
            </select>
          </div>

          {!isGoalie && (
            <>
              <div
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '0.8125rem',
                  letterSpacing: '0.1em',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginTop: '0.5rem',
                }}
              >
                Skater stats
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <label style={labelStyle}>GP</label>
                  <input style={inputStyle} type="number" min={0} value={form.games_played} onChange={handleChange('games_played')} />
                </div>
                <div>
                  <label style={labelStyle}>G</label>
                  <input style={inputStyle} type="number" min={0} value={form.goals} onChange={handleChange('goals')} />
                </div>
                <div>
                  <label style={labelStyle}>A</label>
                  <input style={inputStyle} type="number" min={0} value={form.assists} onChange={handleChange('assists')} />
                </div>
                <div>
                  <label style={labelStyle}>+/−</label>
                  <input style={inputStyle} type="number" value={form.plus_minus} onChange={handleChange('plus_minus')} />
                </div>
                <div>
                  <label style={labelStyle}>PIM</label>
                  <input style={inputStyle} type="number" min={0} value={form.penalty_minutes} onChange={handleChange('penalty_minutes')} />
                </div>
              </div>
            </>
          )}

          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '0.8125rem',
              letterSpacing: '0.1em',
              color: 'rgba(255, 255, 255, 0.5)',
              marginTop: '0.5rem',
            }}
          >
            {isGoalie ? 'Goalie stats' : 'Goalie stats (optional)'}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem',
            }}
          >
            <div>
              <label style={labelStyle}>GP</label>
              <input style={inputStyle} type="number" min={0} value={form.goalie_games_played} onChange={handleChange('goalie_games_played')} />
            </div>
            <div>
              <label style={labelStyle}>W</label>
              <input style={inputStyle} type="number" min={0} value={form.wins} onChange={handleChange('wins')} />
            </div>
            <div>
              <label style={labelStyle}>L</label>
              <input style={inputStyle} type="number" min={0} value={form.losses} onChange={handleChange('losses')} />
            </div>
            <div>
              <label style={labelStyle}>Saves</label>
              <input style={inputStyle} type="number" min={0} value={form.saves} onChange={handleChange('saves')} />
            </div>
            <div>
              <label style={labelStyle}>SV% (0–1)</label>
              <input style={inputStyle} type="number" step="0.001" min={0} max={1} value={form.save_percentage} onChange={handleChange('save_percentage')} />
            </div>
            <div>
              <label style={labelStyle}>SO</label>
              <input style={inputStyle} type="number" min={0} value={form.shutouts} onChange={handleChange('shutouts')} />
            </div>
            <div>
              <label style={labelStyle}>GAA</label>
              <input style={inputStyle} type="number" step="0.01" min={0} max={100} value={form.gaa} onChange={handleChange('gaa')} />
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
              {submitting ? 'Saving…' : 'Save stats'}
            </button>
          </div>
        </div>
      </form>
    </PassportModal>
  );
}
