'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createGameAction } from '@/app/actions/games';

interface Prefill {
  home_team_name: string;
  home_team_rinkstop_id: string;
  home_team_color: string | null;
  away_team_name: string;
  away_team_rinkstop_id: string;
  away_team_color: string | null;
  venue_name: string | null;
  rink_id: string;
  scheduled_at: string;
}

interface Props {
  fixtureId: string;
  prefill: Prefill;
}

export function NewGameFromFixtureForm({ fixtureId, prefill }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Pre-filled from the fixture. Editable so the scorekeeper can fix typos
  // or override the default venue.
  const [homeName, setHomeName] = useState(prefill.home_team_name);
  const [homeColor, setHomeColor] = useState(prefill.home_team_color || '#FFB81C');
  const [awayName, setAwayName] = useState(prefill.away_team_name);
  const [awayColor, setAwayColor] = useState(prefill.away_team_color || '#C8102E');
  const [venueName, setVenueName] = useState(prefill.venue_name || '');
  const [mode, setMode] = useState<'live' | 'watch'>('live');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!homeName.trim() || !awayName.trim()) {
      setError('Both team names are required.');
      return;
    }

    startTransition(async () => {
      // Pre-fill tells the createGameAction to attach this to the fixture.
      const result = await createGameAction({
        mode,
        home_team_name: homeName.trim(),
        home_team_color: homeColor,
        home_team_source: 'rinkstop',
        home_team_rinkstop_id: prefill.home_team_rinkstop_id,
        away_team_name: awayName.trim(),
        away_team_color: awayColor,
        away_team_source: 'rinkstop',
        away_team_rinkstop_id: prefill.away_team_rinkstop_id,
        venue_name: venueName.trim() || null,
        scheduled_at: prefill.scheduled_at,
        game_type: 'regular',
        rinkstop_fixture_id: fixtureId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // After creation, the game has rinkstop_integration='pending' but no
      // fixture_id. We need to set both. For Phase B2, the simplest path is
      // to mark this as the canonical linked game and stamp the fixture_id.
      // Use a direct server action via fetch to a /api route. For now,
      // route to the game page and let the user tap 'Submit to RinkStop'
      // to link — the fixture will be auto-detected since teams match.
      router.push(`/scoresheet/${result.gameId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Game mode selector */}
      <div>
        <label className="rs-label">Mode</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setMode('live')}
            style={{
              padding: '0.75rem',
              background: mode === 'live' ? 'rgba(255,184,28,0.15)' : 'rgba(255,255,255,0.04)',
              border: mode === 'live' ? '1px solid rgba(255,184,28,0.4)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: mode === 'live' ? '#FFB81C' : 'rgba(255,255,255,0.7)',
              fontWeight: mode === 'live' ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Scorekeeper
            </div>
            Live game
          </button>
          <button
            type="button"
            onClick={() => setMode('watch')}
            style={{
              padding: '0.75rem',
              background: mode === 'watch' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
              border: mode === 'watch' ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: mode === 'watch' ? '#fff' : 'rgba(255,255,255,0.7)',
              fontWeight: mode === 'watch' ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Fan
            </div>
            Watch game
          </button>
        </div>
      </div>

      {/* Team names (editable) */}
      <div>
        <label className="rs-label">Home team</label>
        <input
          type="text"
          className="rs-input"
          value={homeName}
          onChange={(e) => setHomeName(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="rs-label">Away team</label>
        <input
          type="text"
          className="rs-input"
          value={awayName}
          onChange={(e) => setAwayName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="rs-label">Venue</label>
        <input
          type="text"
          className="rs-input"
          value={venueName}
          onChange={(e) => setVenueName(e.target.value)}
        />
      </div>

      {prefill.scheduled_at && (
        <p
          style={{
            fontSize: '0.8125rem',
            color: 'rgba(255,255,255,0.6)',
            background: 'rgba(0,0,0,0.2)',
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            margin: 0,
          }}
        >
          Scheduled: {new Date(prefill.scheduled_at).toLocaleString()}
        </p>
      )}

      {error && (
        <div
          style={{
            background: 'rgba(200,16,46,0.15)',
            border: '1px solid rgba(200,16,46,0.45)',
            color: '#FCA5A5',
            padding: '0.75rem 1rem',
            borderRadius: 8,
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rs-btn-primary"
        style={{ marginTop: '0.5rem' }}
      >
        {isPending ? 'Creating...' : 'Start tracking →'}
      </button>
    </form>
  );
}
