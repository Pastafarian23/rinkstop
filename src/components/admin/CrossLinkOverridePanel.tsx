'use client';

import { useState, useEffect, useRef } from 'react';

type Kind = 'team_home' | 'team_away' | 'league' | 'player';

export interface Override {
  team_home_id?: string | null;
  team_away_id?: string | null;
  league_id?: string | null;
  player_id?: string | null;
  // Internal flags for the /admin/blog/needs-review queue
  // (see POST-SLUG-REVIEW-QUEUE-SPEC.md)
  _skipped_review?: boolean;
  _skip_reason?: string;
  _skipped_at?: string;
}

interface PipelineRef {
  id: string;
  name?: string;
  slug?: string;
  first_name?: string;
  last_name?: string;
}

interface Props {
  // Pipeline-selected cross-link values
  team_home?: PipelineRef | null;
  team_away?: PipelineRef | null;
  league?: PipelineRef | null;
  player?: PipelineRef | null;
  // Country is a string slug (no FK)
  country_slug?: string | null;
  // Current override state (controlled)
  overrides: Override;
  onChange: (next: Override) => void;
  onCountryChange: (slug: string | null) => void;
}

// Internal "label cache" so we can show "Picked: Connor McDavid" instead of "Picked: 8478402"
// (We could also just look it up server-side but the picker already has the label at click time.)
type LabelCache = Record<string, string>;

function PickerWithLabel({
  kind,
  label,
  pipelineRef,
  overrideId,
  overrideLabels,
  onPick,
  onClear,
  searchEndpoint,
  renderResult,
  getResultLabel,
}: {
  kind: Kind;
  label: string;
  pipelineRef?: PipelineRef | null;
  overrideId?: string | null | undefined;
  overrideLabels: LabelCache;
  onPick: (id: string, displayLabel: string) => void;
  onClear: () => void;
  searchEndpoint: string;
  renderResult: (row: any) => React.ReactNode;
  getResultLabel: (row: any) => string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `${searchEndpoint}?q=${encodeURIComponent(query)}&limit=10`;
        const r = await fetch(url);
        if (!r.ok) { setResults([]); return; }
        const d = await r.json();
        const key = Object.keys(d).find((k) => Array.isArray(d[k]));
        setResults(key ? d[key] : []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, open, searchEndpoint]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const isOverride = overrideId !== undefined && overrideId !== null;
  const pipelineLabel = pipelineRef
    ? ('name' in pipelineRef && pipelineRef.name
        ? pipelineRef.name
        : `${pipelineRef.first_name || ''} ${pipelineRef.last_name || ''}`.trim())
    : '(none)';
  const displayLabel = isOverride
    ? (overrideLabels[`${kind}_id`] || `ID #${overrideId}`)
    : pipelineLabel;

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
        {label}
        {!isOverride && pipelineRef && (
          <span style={{ marginLeft: 6, color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>· pipeline</span>
        )}
        {isOverride && (
          <span style={{ marginLeft: 6, color: '#14B8A6', fontSize: '0.65rem' }}>· override</span>
        )}
      </label>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0.4rem 0.6rem',
          background: isOverride ? 'rgba(20,184,166,0.08)' : 'rgba(0,0,0,0.2)',
          border: `1px solid ${isOverride ? 'rgba(20,184,166,0.3)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 4,
          fontSize: '0.85rem',
          minHeight: 32,
        }}
      >
        <span style={{ flex: 1, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        {isOverride && (
          <button
            type="button"
            onClick={onClear}
            title="Clear override (use pipeline value)"
            style={{ background: 'transparent', border: 0, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.85rem', padding: 0, lineHeight: 1 }}
          >
            ✕
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{ background: 'transparent', border: 0, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.85rem', padding: 0, lineHeight: 1 }}
        >
          {isOverride ? '↻' : '✎'}
        </button>
      </div>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#0F172A',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            zIndex: 50,
            maxHeight: 300,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}…`}
            autoFocus
            style={{
              margin: 6,
              padding: '0.4rem 0.6rem',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              color: 'white',
              fontSize: '0.85rem',
            }}
          />
          <div style={{ overflowY: 'auto', maxHeight: 240 }}>
            {loading && (
              <div style={{ padding: 8, color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Searching…</div>
            )}
            {!loading && results.length === 0 && (
              <div style={{ padding: 8, color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>No matches</div>
            )}
            {!loading && results.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => {
                  onPick(String(row.id), getResultLabel(row));
                  setOpen(false);
                  setQuery('');
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.4rem 0.75rem',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 0,
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {renderResult(row)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const COMMON_COUNTRIES = [
  'USA', 'CAN', 'SWE', 'FIN', 'RUS', 'CZE', 'SVK', 'GER', 'SUI', 'NOR', 'DEN',
  'LAT', 'BLR', 'KAZ', 'FRA', 'GBR', 'JPN', 'CHN', 'PHI', 'AUS',
];

export default function CrossLinkOverridePanel({
  team_home, team_away, league, player, country_slug,
  overrides, onChange, onCountryChange,
}: Props) {
  // Cache the human label for each picked override so the chip shows
  // a real name instead of "ID #123" after the user picks.
  const [labels, setLabels] = useState<LabelCache>({});

  const setOverride = (kind: Kind, id: string | null, displayLabel?: string) => {
    const key = `${kind}_id` as keyof Override;
    if (id === null) {
      const next = { ...overrides };
      delete next[key];
      onChange(next);
      // Also clear the label cache entry
      setLabels((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    } else {
      onChange({ ...overrides, [key]: id });
      if (displayLabel) {
        setLabels((prev) => ({ ...prev, [key]: displayLabel }));
      }
    }
  };

  return (
    <div className="admin-card p-4" style={{ marginTop: '1rem' }}>
      <h3 style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 0.75rem' }}>
        🔗 Cross-links
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 400, marginLeft: 8 }}>
          override any that the pipeline got wrong
        </span>
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <PickerWithLabel
          kind="team_home"
          label="Home team"
          pipelineRef={team_home}
          overrideId={overrides.team_home_id}
          overrideLabels={labels}
          onPick={(id, dl) => setOverride('team_home', id, dl)}
          onClear={() => setOverride('team_home', null)}
          searchEndpoint="/api/admin/search/teams"
          renderResult={(r) => r.name}
          getResultLabel={(r) => r.name}
        />
        <PickerWithLabel
          kind="team_away"
          label="Away team"
          pipelineRef={team_away}
          overrideId={overrides.team_away_id}
          overrideLabels={labels}
          onPick={(id, dl) => setOverride('team_away', id, dl)}
          onClear={() => setOverride('team_away', null)}
          searchEndpoint="/api/admin/search/teams"
          renderResult={(r) => r.name}
          getResultLabel={(r) => r.name}
        />
        <PickerWithLabel
          kind="league"
          label="League"
          pipelineRef={league}
          overrideId={overrides.league_id}
          overrideLabels={labels}
          onPick={(id, dl) => setOverride('league', id, dl)}
          onClear={() => setOverride('league', null)}
          searchEndpoint="/api/admin/search/leagues"
          renderResult={(r) => `${r.name}${r.country ? ` · ${r.country}` : ''}`}
          getResultLabel={(r) => r.name}
        />
        <PickerWithLabel
          kind="player"
          label="Player"
          pipelineRef={player}
          overrideId={overrides.player_id}
          overrideLabels={labels}
          onPick={(id, dl) => setOverride('player', id, dl)}
          onClear={() => setOverride('player', null)}
          searchEndpoint="/api/admin/search/players"
          renderResult={(r) => `${r.first_name || ''} ${r.last_name || ''}`.trim() + (r.position ? ` · ${r.position}` : '')}
          getResultLabel={(r) => `${r.first_name || ''} ${r.last_name || ''}`.trim()}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
          Country
        </label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            value={country_slug || ''}
            onChange={(e) => onCountryChange(e.target.value || null)}
            style={{
              flex: 1,
              padding: '0.4rem 0.6rem',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              color: 'white',
              fontSize: '0.85rem',
            }}
          >
            <option value="">(none)</option>
            {COMMON_COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {country_slug && (
            <button
              type="button"
              onClick={() => onCountryChange(null)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)',
                padding: '0.4rem 0.6rem',
                borderRadius: 4,
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
