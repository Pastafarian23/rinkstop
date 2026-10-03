'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveRosterAction } from '@/app/actions/games';
import type { RosterPlayer, TeamRoster } from '@/types/scoresheet';

interface Props {
  gameId: string;
  homeTeamName: string;
  homeTeamColor: string;
  awayTeamName: string;
  awayTeamColor: string;
  initialHomeRoster: RosterPlayer[];
  initialAwayRoster: RosterPlayer[];
}

const POSITIONS: RosterPlayer['position'][] = ['C', 'LW', 'RW', 'D', 'G'];

function emptyPlayer(): RosterPlayer {
  return { jersey_number: 0, name: '', position: 'C', is_goalie: false };
}

export function RosterForm({
  gameId,
  homeTeamName,
  homeTeamColor,
  awayTeamName,
  awayTeamColor,
  initialHomeRoster,
  initialAwayRoster,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [homeRoster, setHomeRoster] = useState<TeamRoster>(
    initialHomeRoster.length > 0 ? initialHomeRoster : [emptyPlayer()]
  );
  const [awayRoster, setAwayRoster] = useState<TeamRoster>(
    initialAwayRoster.length > 0 ? initialAwayRoster : [emptyPlayer()]
  );

  function updatePlayer(
    side: 'home' | 'away',
    idx: number,
    patch: Partial<RosterPlayer>
  ) {
    const setter = side === 'home' ? setHomeRoster : setAwayRoster;
    setter((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  function addPlayer(side: 'home' | 'away') {
    const setter = side === 'home' ? setHomeRoster : setAwayRoster;
    setter((prev) => [...prev, emptyPlayer()]);
  }

  function removePlayer(side: 'home' | 'away', idx: number) {
    const setter = side === 'home' ? setHomeRoster : setAwayRoster;
    setter((prev) => prev.filter((_, i) => i !== idx));
  }

  function validate(roster: TeamRoster): string | null {
    for (const p of roster) {
      if (!p.name.trim()) return null; // Empty rows are allowed (we'll filter)
      if (!p.jersey_number || p.jersey_number < 0 || p.jersey_number > 99) {
        return 'Jersey numbers must be 0-99.';
      }
    }
    // Duplicate jersey check
    const jerseys = roster.filter((p) => p.name.trim()).map((p) => p.jersey_number);
    const dupes = jerseys.filter((n, i) => jerseys.indexOf(n) !== i);
    if (dupes.length > 0) return `Duplicate jersey numbers: ${dupes.join(', ')}`;
    return null;
  }

  function handleSave(skipRoster: boolean) {
    setError(null);

    const cleanHome = skipRoster ? [] : homeRoster.filter((p) => p.name.trim());
    const cleanAway = skipRoster ? [] : awayRoster.filter((p) => p.name.trim());

    if (!skipRoster) {
      const v1 = validate(cleanHome);
      if (v1) {
        setError(`Home roster: ${v1}`);
        return;
      }
      const v2 = validate(cleanAway);
      if (v2) {
        setError(`Away roster: ${v2}`);
        return;
      }
    }

    startTransition(async () => {
      const result = await saveRosterAction(gameId, cleanHome, cleanAway);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/scoresheet/${gameId}/settings`);
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <RosterSection
        teamName={homeTeamName}
        teamColor={homeTeamColor}
        roster={homeRoster}
        onUpdate={(idx, patch) => updatePlayer('home', idx, patch)}
        onAdd={() => addPlayer('home')}
        onRemove={(idx) => removePlayer('home', idx)}
      />
      <RosterSection
        teamName={awayTeamName}
        teamColor={awayTeamColor}
        roster={awayRoster}
        onUpdate={(idx, patch) => updatePlayer('away', idx, patch)}
        onAdd={() => addPlayer('away')}
        onRemove={(idx) => removePlayer('away', idx)}
      />

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

      <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
        <button
          type="button"
          className="rs-btn-primary"
          onClick={() => handleSave(false)}
          disabled={isPending}
        >
          {isPending ? 'Saving...' : 'Next: Settings →'}
        </button>
        <button
          type="button"
          className="rs-btn-secondary"
          onClick={() => handleSave(true)}
          disabled={isPending}
        >
          Skip rosters (track without players) →
        </button>
      </div>
    </div>
  );
}

function RosterSection({
  teamName,
  teamColor,
  roster,
  onUpdate,
  onAdd,
  onRemove,
}: {
  teamName: string;
  teamColor: string;
  roster: RosterPlayer[];
  onUpdate: (idx: number, patch: Partial<RosterPlayer>) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <section
      style={{
        background: 'rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '1rem',
      }}
    >
      <h2
        style={{
          fontSize: '0.6875rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: teamColor,
          fontWeight: 700,
          margin: '0 0 0.75rem',
        }}
      >
        {teamName} ({roster.length})
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {roster.map((p, idx) => (
          <div
            key={idx}
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 80px 40px',
              gap: '0.5rem',
              alignItems: 'center',
            }}
          >
            <input
              type="number"
              min="0"
              max="99"
              className="rs-input"
              style={{ textAlign: 'center', padding: '0.5rem' }}
              value={p.jersey_number || ''}
              onChange={(e) => onUpdate(idx, { jersey_number: parseInt(e.target.value, 10) || 0 })}
              placeholder="#"
            />
            <input
              type="text"
              className="rs-input"
              style={{ padding: '0.5rem' }}
              value={p.name}
              onChange={(e) => onUpdate(idx, { name: e.target.value })}
              placeholder="Player name"
            />
            <select
              className="rs-input"
              style={{ padding: '0.5rem' }}
              value={p.position}
              onChange={(e) => {
                const pos = e.target.value as RosterPlayer['position'];
                onUpdate(idx, { position: pos, is_goalie: pos === 'G' });
              }}
            >
              {POSITIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onRemove(idx)}
              aria-label="Remove player"
              style={{
                background: 'rgba(200,16,46,0.15)',
                border: '1px solid rgba(200,16,46,0.4)',
                color: '#FCA5A5',
                borderRadius: 6,
                padding: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onAdd}
        style={{
          marginTop: '0.75rem',
          background: 'rgba(255,184,28,0.1)',
          border: '1px dashed rgba(255,184,28,0.4)',
          color: '#FFB81C',
          padding: '0.625rem 1rem',
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.875rem',
          width: '100%',
        }}
      >
        + Add player
      </button>
    </section>
  );
}
