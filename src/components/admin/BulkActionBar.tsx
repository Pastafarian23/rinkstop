'use client';

import { useState, useEffect } from 'react';

export type BulkEntity = 'teams' | 'rinks' | 'leagues' | 'players' | 'brands';
export type BulkAction = 'set_league' | 'set_country' | 'set_state' | 'delete';

interface LeagueOption {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  entity: BulkEntity;
  selected: Set<string>;
  onClear: () => void;
  onComplete: () => void;
}

/**
 * Floating action bar that appears at the bottom of the screen when rows
 * are selected. Provides entity-specific bulk actions via
 * /api/admin/bulk/[entity].
 *
 * Pattern: stay focused. Each action is one button + an inline form for
 * the parameter (e.g. "Set League" reveals a league dropdown). "Delete"
 * is always shown and uses a confirm() prompt.
 */
export default function BulkActionBar({ entity, selected, onClear, onComplete }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline form state for the per-action parameter
  const [leagueId, setLeagueId] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [state, setState] = useState<string>('');

  // League dropdown data (loaded only if entity is teams)
  const [leagues, setLeagues] = useState<LeagueOption[] | null>(null);
  useEffect(() => {
    if (entity !== 'teams' || leagues !== null) return;
    fetch('/api/admin/leagues/list', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.leagues)) setLeagues(d.leagues);
        else setLeagues([]);
      })
      .catch(() => setLeagues([]));
  }, [entity, leagues]);

  if (selected.size === 0) return null;

  const ids = Array.from(selected);

  async function runAction(action: BulkAction, params?: Record<string, any>) {
    if (action === 'delete') {
      if (!confirm(`Delete ${ids.length} ${entity}? This cannot be undone.`)) return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/bulk/${entity}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action, params }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      onComplete();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const btnBase: React.CSSProperties = {
    padding: '0.4rem 0.8rem',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    background: 'rgba(15,23,42,0.8)',
    color: 'white',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={{
        position: 'sticky',
        bottom: '1rem',
        zIndex: 30,
        margin: '1rem 0',
        padding: '0.75rem 1rem',
        background: 'rgba(15,23,42,0.95)',
        border: '1px solid rgba(45,212,191,0.4)',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        backdropFilter: 'blur(8px)',
      }}
    >
      <span
        style={{
          color: '#2DD4BF',
          fontWeight: 600,
          fontSize: '0.875rem',
          paddingRight: '0.5rem',
          borderRight: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {selected.size} {selected.size === 1 ? 'row' : 'rows'} selected
      </span>

      {/* teams: Set League */}
      {entity === 'teams' && (
        <>
          <select
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            disabled={busy}
            style={{
              padding: '0.4rem 0.5rem',
              background: 'rgba(15,23,42,0.8)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              color: 'white',
              fontSize: '0.8rem',
              minWidth: '160px',
            }}
          >
            <option value="">— Pick league —</option>
            {leagues?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !leagueId}
            onClick={() => runAction('set_league', { league_id: leagueId })}
            style={{ ...btnBase, opacity: !leagueId ? 0.5 : 1 }}
          >
            🏆 Set League
          </button>
        </>
      )}

      {/* rinks: Set Country */}
      {entity === 'rinks' && (
        <>
          <input
            type="text"
            placeholder="Country (e.g. USA)"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={busy}
            style={{
              padding: '0.4rem 0.5rem',
              background: 'rgba(15,23,42,0.8)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              color: 'white',
              fontSize: '0.8rem',
              width: '160px',
            }}
          />
          <button
            type="button"
            disabled={busy || !country}
            onClick={() => runAction('set_country', { country })}
            style={{ ...btnBase, opacity: !country ? 0.5 : 1 }}
          >
            🌎 Set Country
          </button>
        </>
      )}

      {/* rinks: Set State */}
      {entity === 'rinks' && (
        <>
          <input
            type="text"
            placeholder="State (e.g. NY)"
            value={state}
            onChange={(e) => setState(e.target.value)}
            disabled={busy}
            style={{
              padding: '0.4rem 0.5rem',
              background: 'rgba(15,23,42,0.8)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              color: 'white',
              fontSize: '0.8rem',
              width: '120px',
            }}
          />
          <button
            type="button"
            disabled={busy || !state}
            onClick={() => runAction('set_state', { state })}
            style={{ ...btnBase, opacity: !state ? 0.5 : 1 }}
          >
            📍 Set State
          </button>
        </>
      )}

      <div style={{ flex: 1 }} />

      {error && (
        <span style={{ color: '#F87171', fontSize: '0.8rem' }}>
          {error}
        </span>
      )}

      <button
        type="button"
        onClick={() => runAction('delete')}
        disabled={busy}
        style={{
          ...btnBase,
          background: 'rgba(248,113,113,0.15)',
          borderColor: 'rgba(248,113,113,0.4)',
          color: '#F87171',
        }}
      >
        🗑️ Delete
      </button>
      <button
        type="button"
        onClick={onClear}
        disabled={busy}
        style={{ ...btnBase, background: 'transparent' }}
      >
        Clear
      </button>
    </div>
  );
}
