'use client';

// src/app/draft/[year]/PicksBrowser.tsx
//
// Client component for the draft picks archive. Takes a flat Pick[] array
// and provides:
//   - Search (player, team, league — case-insensitive substring)
//   - Filter by round (all or specific round 1-7)
//   - Filter by nationality
//   - Filter by league code (OHL/WHL/QMJHL/NCAA/SHL/Liiga/USHL/etc)
//   - Sort by pick # (default) or by player or by team
//   - Group-by-round for visual scan
//
// Mobile-safe design (Tool 3 lesson):
//   - Vertical-stack rows: pick + name + sub-row of meta
//   - 0.7rem category badges
//   - Flex-wrap on header controls
//   - clamp() on name fontSize

import { useState, useMemo } from 'react';
import type { Pick } from '../picks-2026';

interface Props {
  picks: Pick[];
  year: number;
}

const POS_COLOR: Record<string, string> = {
  C: 'rgba(255,184,28,0.85)',   // gold for C
  LW: 'rgba(255,255,255,0.7)',
  RW: 'rgba(255,255,255,0.7)',
  D: 'rgba(200,16,46,0.85)',    // red for D
  G: 'rgba(255,184,28,0.6)',    // gold tint for goalies
};

function inferLeagueCode(league: string): string {
  if (!league) return '';
  const u = league.toUpperCase();
  for (const code of ['OHL', 'WHL', 'QMJHL', 'NCAA', 'SHL', 'LIIGA', 'USHL', 'DEL', 'NLA', 'AHL', 'ECHL']) {
    if (u.includes(code)) return code;
  }
  return '';
}

function pickHref(p: Pick): string | null {
  if (!p.player || p.player.toUpperCase() === 'FORFEITED') return null;
  // Forfeit has no player. We could also link real-name slugs to /directory/players/[id]
  // but only wired in /directory/players/[id] if highlightly data exists. For draft picks
  // we don't have NHL IDs yet — skip.
  return null;
}

export default function PicksBrowser({ picks, year }: Props) {
  const [query, setQuery] = useState('');
  const [roundFilter, setRoundFilter] = useState<string>('all');
  const [nationalityFilter, setNationalityFilter] = useState<string>('all');
  const [leagueFilter, setLeagueFilter] = useState<string>('all');
  const [sort, setSort] = useState<'pick' | 'player' | 'team'>('pick');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = picks.filter((p) => {
      if (roundFilter !== 'all' && String(p.round) !== roundFilter) return false;
      if (nationalityFilter !== 'all' && p.nationality !== nationalityFilter) return false;
      if (leagueFilter !== 'all' && inferLeagueCode(p.league) !== leagueFilter) return false;
      if (q && !(
        p.player.toLowerCase().includes(q) ||
        p.team.toLowerCase().includes(q) ||
        p.league.toLowerCase().includes(q) ||
        p.nationality.toLowerCase().includes(q)
      )) return false;
      return true;
    });
    if (sort === 'pick') arr = arr.sort((a, b) => a.pick - b.pick);
    if (sort === 'player') arr = arr.sort((a, b) => a.player.localeCompare(b.player));
    if (sort === 'team') arr = arr.sort((a, b) => a.team.localeCompare(b.team));
    return arr;
  }, [picks, query, roundFilter, nationalityFilter, leagueFilter, sort]);

  const grouped = useMemo(() => {
    const g: Record<number, Pick[]> = {};
    for (const p of filtered) {
      g[p.round] = g[p.round] || [];
      g[p.round].push(p);
    }
    return g;
  }, [filtered]);

  const nationalities = useMemo(() => {
    const s = new Set<string>();
    picks.forEach((p) => { if (p.nationality) s.add(p.nationality); });
    return Array.from(s).sort();
  }, [picks]);

  const leagueCodes = useMemo(() => {
    const s = new Set<string>();
    picks.forEach((p) => { const c = inferLeagueCode(p.league); if (c) s.add(c); });
    return Array.from(s).sort();
  }, [picks]);

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    padding: '0.55rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.7rem',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: 600,
  };

  const hasFilters: boolean = !!query || roundFilter !== 'all' || nationalityFilter !== 'all' || leagueFilter !== 'all';

  return (
    <section>
      {/* Filter bar */}
      <div style={{
        display: 'grid', gap: '0.75rem',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        padding: '1rem', marginBottom: '1.5rem',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
      }}>
        <div>
          <label htmlFor="search" style={labelStyle}>Search</label>
          <input
            id="search"
            type="text"
            placeholder="Player, team, league…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
          />
        </div>
        <div>
          <label htmlFor="round" style={labelStyle}>Round</label>
          <select id="round" value={roundFilter} onChange={(e) => setRoundFilter(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
            <option value="all">All rounds</option>
            {[1, 2, 3, 4, 5, 6, 7].map((r) => <option key={r} value={String(r)}>Round {r}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="nat" style={labelStyle}>Nationality</label>
          <select id="nat" value={nationalityFilter} onChange={(e) => setNationalityFilter(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
            <option value="all">All countries</option>
            {nationalities.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="lg" style={labelStyle}>League</label>
          <select id="lg" value={leagueFilter} onChange={(e) => setLeagueFilter(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
            <option value="all">All leagues</option>
            {leagueCodes.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="sort" style={labelStyle}>Sort by</label>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as 'pick' | 'player' | 'team')} style={{ ...inputStyle, width: '100%' }}>
            <option value="pick">Pick #</option>
            <option value="player">Player (A→Z)</option>
            <option value="team">Team (A→Z)</option>
          </select>
        </div>
      </div>

      {/* Result count + reset */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '0.75rem',
        marginBottom: '1rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)',
      }}>
        <div>
          Showing <strong style={{ color: '#FFB81C' }}>{filtered.length}</strong> of <strong>{picks.length}</strong> picks
          {year ? ` from the ${year} NHL Draft` : ''}
          {filterSummary({ roundFilter, nationalityFilter, leagueFilter, query, hasFilters })}
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setQuery(''); setRoundFilter('all'); setNationalityFilter('all'); setLeagueFilter('all'); setSort('pick'); }}
            style={{
              padding: '0.4rem 0.85rem',
              background: 'transparent', color: '#FFB81C',
              border: '1px solid #FFB81C', borderRadius: '4px',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Round-by-round tables — vertical cards on mobile, dense table on desktop */}
      {Object.keys(grouped).length === 0 ? (
        <div style={{
          padding: '2rem', textAlign: 'center',
          color: 'rgba(255,255,255,0.5)',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
        }}>
          No picks match your filters. Try clearing one or more.
        </div>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).map(([round, ps]) => (
          <RoundSection key={round} round={Number(round)} picks={ps} />
        ))
      )}
    </section>
  );
}

function filterSummary(args: { roundFilter: string; nationalityFilter: string; leagueFilter: string; query: string; hasFilters: boolean }) {
  if (!args.hasFilters) return null;
  const parts: string[] = [];
  if (args.roundFilter !== 'all') parts.push(`Round ${args.roundFilter}`);
  if (args.nationalityFilter !== 'all') parts.push(args.nationalityFilter);
  if (args.leagueFilter !== 'all') parts.push(args.leagueFilter);
  if (args.query) parts.push(`"${args.query}"`);
  return <span> — {parts.join(' · ')}</span>;
}

function RoundSection({ round, picks }: { round: number; picks: Pick[] }) {
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <h2 style={{
        fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
        fontSize: '1.5rem',
        letterSpacing: '0.02em',
        color: '#FFB81C',
        margin: '0 0 0.75rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        flexWrap: 'wrap',
      }}>
        <span>Round {round}</span>
        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'inherit', fontWeight: 400 }}>
          {picks.length} {picks.length === 1 ? 'pick' : 'picks'}
        </span>
      </h2>

      {/* Mobile cards (default) */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '0.4rem',
      }}>
        {picks.map((p) => <PickRow key={p.pick} p={p} />)}
      </div>
    </div>
  );
}

function PickRow({ p }: { p: Pick }) {
  const isForfeit = p.player.toUpperCase() === 'FORFEITED';
  const leagueCode = inferLeagueCode(p.league);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '0.35rem',
      padding: '0.625rem 0.75rem',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '6px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.625rem',
        flexWrap: 'wrap',
      }}>
        <span style={{
          fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
          fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)',
          color: '#FFB81C',
          lineHeight: 1,
          minWidth: '2.5rem',
          letterSpacing: '0.02em',
        }}>
          #{p.pick}
        </span>
        {isForfeit ? (
          <span style={{
            fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
            fontSize: '1.05rem',
            color: '#C8102E',
            letterSpacing: '0.02em',
          }}>
            {p.team} — pick forfeited
          </span>
        ) : (
          <span style={{
            fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
            fontSize: 'clamp(1rem, 2.2vw, 1.2rem)',
            color: '#fff',
            letterSpacing: '0.02em',
            lineHeight: 1.1,
          }}>
            {p.player}
          </span>
        )}
        {p.position && !isForfeit && (
          <span style={{
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            background: 'rgba(255,255,255,0.04)',
            color: POS_COLOR[p.position] || 'rgba(255,255,255,0.7)',
            fontSize: '0.7rem', fontWeight: 700,
          }}>
            {p.position}
          </span>
        )}
      </div>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '0.35rem 0.75rem',
        fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)',
        alignItems: 'center',
      }}>
        <span>{p.team}</span>
        {!isForfeit && p.league && (
          <>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>
              {p.league}
              {leagueCode && (
                <span style={{
                  marginLeft: '0.4rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '3px',
                  background: 'rgba(200,16,46,0.15)',
                  color: '#FFB81C',
                  fontSize: '0.65rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  {leagueCode}
                </span>
              )}
            </span>
          </>
        )}
        {!isForfeit && p.nationality && (
          <>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{p.nationality}</span>
          </>
        )}
      </div>
    </div>
  );
}