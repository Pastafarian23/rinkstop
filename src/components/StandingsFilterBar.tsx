'use client';

/**
 * StandingsFilterBar — top-of-page filter for /standings.
 *
 * 2026-10-01 (Arnel feedback): filter bar moved from bottom to top,
 * matching NHL.com / ESPN layout. Three filters:
 *
 *   - League     (dropdown): pick a specific league (NHL, AHL, KHL, ...)
 *   - Season     (dropdown): pick a season (2026 = current, historical)
 *   - Level      (segmented): Pro / Junior / College / International /
 *                            Minor Pro / Amateur / All
 *
 * Filter state lives in URL search params (?league=NHL&season=2026&level=pro)
 * so the URL is bookmarkable and SSR can render the right data on first
 * hit (no client-side data fetches needed).
 *
 * Behavior: any change updates the URL via router.replace() and the page
 * re-renders with the filtered data. We use replace() (not push()) so
 * the back button doesn't fill up with filter changes.
 */
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface LeagueFacet {
  slug?: string;
  name: string;
  count?: number;
}

interface Props {
  leagues: string[];
  seasons: string[];
  /** Default to "all" (no value) when null */
  defaultLeague?: string | null;
  defaultSeason?: string | null;
  defaultLevel?: string | null;
}

const LEVEL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '',          label: 'All Levels' },
  { value: 'pro',       label: 'Professional' },
  { value: 'junior',    label: 'Junior' },
  { value: 'college',   label: 'College' },
  { value: 'international', label: 'International' },
  { value: 'minor',     label: 'Minor Pro' },
  { value: 'amateur',   label: 'Amateur' },
];

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 6,
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  colorScheme: 'dark',
  cursor: 'pointer',
  minWidth: 160,
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.5)',
  marginRight: '0.5rem',
};

const groupStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '0.4rem',
};

export default function StandingsFilterBar({
  leagues,
  seasons,
  defaultLeague,
  defaultSeason,
  defaultLevel,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === '' || value == null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const currentLeague = searchParams.get('league') ?? defaultLeague ?? '';
  const currentSeason = searchParams.get('season') ?? defaultSeason ?? '';
  const currentLevel = searchParams.get('level') ?? defaultLevel ?? '';

  const hasFilter = currentLeague || currentSeason || currentLevel;

  return (
    <div
      data-standings-filter
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        gap: '0.875rem 1.5rem',
        padding: '1rem 1.25rem',
        background: 'rgba(0,0,0,0.18)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        marginBottom: '1.25rem',
      }}
    >
      <div style={groupStyle}>
        <label htmlFor="league-select" style={labelStyle}>League</label>
        <select
          id="league-select"
          value={currentLeague}
          onChange={(e) => update('league', e.target.value)}
          style={selectStyle}
        >
          <option value="">All Leagues</option>
          {leagues.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div style={groupStyle}>
        <label htmlFor="season-select" style={labelStyle}>Season</label>
        <select
          id="season-select"
          value={currentSeason}
          onChange={(e) => update('season', e.target.value)}
          style={selectStyle}
        >
          <option value="">All Seasons</option>
          {seasons.map(s => (
            <option key={s} value={s}>
              {seasonLabel(s)}
            </option>
          ))}
        </select>
      </div>

      <div style={groupStyle}>
        <label htmlFor="level-select" style={labelStyle}>Level</label>
        <select
          id="level-select"
          value={currentLevel}
          onChange={(e) => update('level', e.target.value)}
          style={selectStyle}
        >
          {LEVEL_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {hasFilter && (
        <a
          href={pathname}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.5rem 0.875rem',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          Clear filters
        </a>
      )}
    </div>
  );
}

function seasonLabel(s: string): string {
  // 4-digit year: '2025' -> '2025-26'
  const yr = parseInt(s, 10);
  if (isNaN(yr)) return s;
  return `${yr}-${String((yr + 1) % 100).padStart(2, '0')}`;
}