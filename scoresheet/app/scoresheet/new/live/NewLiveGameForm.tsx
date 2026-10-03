'use client';

/**
 * Step 1 form: game info for the live wizard.
 * Creates the game row on submit, then redirects to step 2 (roster).
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createGameAction } from '@/app/actions/games';
import type { Database } from '@/lib/database.types';

type Favorite = Database['public']['Tables']['user_favorite_teams']['Row'];

interface Props {
  favorites: Favorite[];
  userId: string;
}

const TEAM_COLORS = [
  { label: 'Gold', value: '#FFB81C' },
  { label: 'Red', value: '#C8102E' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Green', value: '#22C55E' },
  { label: 'Purple', value: '#A855F7' },
  { label: 'Orange', value: '#F97316' },
  { label: 'White', value: '#F8FAFC' },
  { label: 'Black', value: '#0F172A' },
];

export function NewLiveGameForm({ favorites, userId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [homeName, setHomeName] = useState('');
  const [homeColor, setHomeColor] = useState('#FFB81C');
  const [homeSource, setHomeSource] = useState<'manual' | 'favorite' | 'rinkstop'>('manual');
  const [homeFavoriteId, setHomeFavoriteId] = useState<string>('');

  const [awayName, setAwayName] = useState('');
  const [awayColor, setAwayColor] = useState('#C8102E');
  const [awaySource, setAwaySource] = useState<'manual' | 'favorite' | 'rinkstop'>('manual');
  const [awayFavoriteId, setAwayFavoriteId] = useState<string>('');

  const [venueName, setVenueName] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [gameType, setGameType] = useState<'regular' | 'playoff' | 'exhibition' | 'tournament' | 'friendly'>('regular');

  function applyFavorite(side: 'home' | 'away', favoriteId: string) {
    if (!favoriteId) return;
    const f = favorites.find((x) => x.team_name === favoriteId);
    if (!f) return;
    if (side === 'home') {
      setHomeName(f.team_name);
      if (f.team_color) setHomeColor(f.team_color);
      setHomeFavoriteId(f.team_name);
      setHomeSource('favorite');
    } else {
      setAwayName(f.team_name);
      if (f.team_color) setAwayColor(f.team_color);
      setAwayFavoriteId(f.team_name);
      setAwaySource('favorite');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!homeName.trim() || !awayName.trim()) {
      setError('Both team names are required.');
      return;
    }
    if (homeName.trim().toLowerCase() === awayName.trim().toLowerCase()) {
      setError('Home and away team names must be different.');
      return;
    }

    startTransition(async () => {
      const result = await createGameAction({
        mode: 'live',
        home_team_name: homeName.trim(),
        home_team_color: homeColor,
        home_team_source: homeSource,
        home_team_rinkstop_id: null,
        away_team_name: awayName.trim(),
        away_team_color: awayColor,
        away_team_source: awaySource,
        away_team_rinkstop_id: null,
        venue_name: venueName.trim() || null,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        game_type: gameType,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Redirect to step 2 (roster)
      router.push(`/scoresheet/${result.gameId}/roster`);
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TeamBlock
        side="home"
        label="Home team"
        favorites={favorites}
        name={homeName}
        setName={setHomeName}
        color={homeColor}
        setColor={setHomeColor}
        source={homeSource}
        setSource={setHomeSource}
        favoriteId={homeFavoriteId}
        onPickFavorite={(id) => applyFavorite('home', id)}
      />
      <TeamBlock
        side="away"
        label="Away team"
        favorites={favorites}
        name={awayName}
        setName={setAwayName}
        color={awayColor}
        setColor={setAwayColor}
        source={awaySource}
        setSource={setAwaySource}
        favoriteId={awayFavoriteId}
        onPickFavorite={(id) => applyFavorite('away', id)}
      />

      <div>
        <label className="rs-label">Venue (optional)</label>
        <input
          type="text"
          className="rs-input"
          value={venueName}
          onChange={(e) => setVenueName(e.target.value)}
          placeholder="e.g. Madison Square Garden"
        />
      </div>

      <div>
        <label className="rs-label">Scheduled date (optional)</label>
        <input
          type="datetime-local"
          className="rs-input"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
      </div>

      <div>
        <label className="rs-label">Game type</label>
        <select
          className="rs-input"
          value={gameType}
          onChange={(e) => setGameType(e.target.value as typeof gameType)}
        >
          <option value="regular">Regular season</option>
          <option value="playoff">Playoff</option>
          <option value="exhibition">Exhibition</option>
          <option value="tournament">Tournament</option>
          <option value="friendly">Friendly / scrimmage</option>
        </select>
      </div>

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
        className="rs-btn-primary"
        disabled={isPending}
        style={{ marginTop: '0.5rem' }}
      >
        {isPending ? 'Creating...' : 'Next: Add rosters →'}
      </button>
    </form>
  );
}

interface TeamBlockProps {
  side: 'home' | 'away';
  label: string;
  favorites: Favorite[];
  name: string;
  setName: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  source: 'manual' | 'favorite' | 'rinkstop';
  setSource: (v: 'manual' | 'favorite' | 'rinkstop') => void;
  favoriteId: string;
  onPickFavorite: (id: string) => void;
}

function TeamBlock({
  side,
  label,
  favorites,
  name,
  setName,
  color,
  setColor,
  source,
  setSource,
  favoriteId,
  onPickFavorite,
}: TeamBlockProps) {
  return (
    <fieldset
      style={{
        background: 'rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '1rem',
        margin: 0,
      }}
    >
      <legend
        style={{
          fontSize: '0.6875rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: color,
          fontWeight: 700,
          padding: '0 0.5rem',
        }}
      >
        {label}
      </legend>

      {favorites.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <label className="rs-label">Pick from favorites</label>
          <select
            className="rs-input"
            value={favoriteId}
            onChange={(e) => onPickFavorite(e.target.value)}
          >
            <option value="">— Choose a favorite —</option>
            {favorites.map((f) => (
              <option key={f.team_name} value={f.team_name}>
                {f.team_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ marginBottom: '0.75rem' }}>
        <label className="rs-label">Team name</label>
        <input
          type="text"
          className="rs-input"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSource('manual');
          }}
          placeholder={side === 'home' ? 'Home team name' : 'Away team name'}
          required
        />
      </div>

      <div>
        <label className="rs-label">Color</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {TEAM_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              aria-label={c.label}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: c.value,
                border: color === c.value ? '2px solid #fff' : '2px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      </div>
    </fieldset>
  );
}
