'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createGameAction } from '@/app/actions/games';
import type { Database } from '@/lib/database.types';

type Favorite = Database['public']['Tables']['user_favorite_teams']['Row'];

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

export function NewWatchGameForm({ favorites }: { favorites: Favorite[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [homeName, setHomeName] = useState('');
  const [homeColor, setHomeColor] = useState('#FFB81C');
  const [awayName, setAwayName] = useState('');
  const [awayColor, setAwayColor] = useState('#C8102E');
  const [venueName, setVenueName] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  function applyFavorite(side: 'home' | 'away', teamName: string) {
    if (!teamName) return;
    const f = favorites.find((x) => x.team_name === teamName);
    if (!f) return;
    if (side === 'home') {
      setHomeName(f.team_name);
      if (f.team_color) setHomeColor(f.team_color);
    } else {
      setAwayName(f.team_name);
      if (f.team_color) setAwayColor(f.team_color);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!homeName.trim() || !awayName.trim()) {
      setError('Both team names are required.');
      return;
    }

    startTransition(async () => {
      const result = await createGameAction({
        mode: 'watch',
        home_team_name: homeName.trim(),
        home_team_color: homeColor,
        home_team_source: favorites.some((f) => f.team_name === homeName.trim()) ? 'favorite' : 'manual',
        home_team_rinkstop_id: null,
        away_team_name: awayName.trim(),
        away_team_color: awayColor,
        away_team_source: favorites.some((f) => f.team_name === awayName.trim()) ? 'favorite' : 'manual',
        away_team_rinkstop_id: null,
        venue_name: venueName.trim() || null,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        game_type: 'regular',
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/scoresheet/${result.gameId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TeamInput
        label="Home team"
        favorites={favorites}
        name={homeName}
        setName={setHomeName}
        color={homeColor}
        setColor={setHomeColor}
        onPickFavorite={(id) => applyFavorite('home', id)}
      />
      <TeamInput
        label="Away team"
        favorites={favorites}
        name={awayName}
        setName={setAwayName}
        color={awayColor}
        setColor={setAwayColor}
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
        <label className="rs-label">Game time (optional)</label>
        <input
          type="datetime-local"
          className="rs-input"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
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
        {isPending ? 'Creating...' : 'Start tracking →'}
      </button>
    </form>
  );
}

function TeamInput({
  label,
  favorites,
  name,
  setName,
  color,
  setColor,
  onPickFavorite,
}: {
  label: string;
  favorites: Favorite[];
  name: string;
  setName: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  onPickFavorite: (id: string) => void;
}) {
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
          <select className="rs-input" onChange={(e) => onPickFavorite(e.target.value)}>
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
          onChange={(e) => setName(e.target.value)}
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
