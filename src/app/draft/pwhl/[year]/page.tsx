// src/app/draft/pwhl/[year]/page.tsx
//
// PWHL draft archive (2023 inaugural → 2026). Mirrors the NHL page structure
// so users can switch between leagues via the hub at /draft. Uses the same
// PicksBrowser component so search/filter/sort work identically.
//
// Year routing: /draft/pwhl/2023, /draft/pwhl/2024, /draft/pwhl/2025, /draft/pwhl/2026.
// Other PWHL years (e.g. 2022 was a PWHPA Dream Gap Tour — not a formal PWHL
// draft) return 404.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PWHL_2023_PICKS, PWHL_2023_STATS, PWHL_2023_EVENT } from '../picks-2023';
import { PWHL_2024_PICKS, PWHL_2024_STATS, PWHL_2024_EVENT } from '../picks-2024';
import { PWHL_2025_PICKS, PWHL_2025_STATS, PWHL_2025_EVENT } from '../picks-2025';
import { PWHL_2026_PICKS, PWHL_2026_STATS, PWHL_2026_EVENT } from '../picks-2026';
import type { PWHLPick } from '../picks-2026';
import type { PickStats } from '../../types';
import PicksBrowser from '../../nhl/[year]/PicksBrowser';
import type { Pick as NHLPick } from '../../picks-2025';
import YearDropdown from '../../nhl/[year]/YearDropdown';

const PWHL_BASE = '/draft/pwhl';

const PICKS_BY_YEAR: Record<number, PWHLPick[]> = {
  2023: PWHL_2023_PICKS as unknown as PWHLPick[],
  2024: PWHL_2024_PICKS as unknown as PWHLPick[],
  2025: PWHL_2025_PICKS as unknown as PWHLPick[],
  2026: PWHL_2026_PICKS as unknown as PWHLPick[],
};

const STATS_BY_YEAR: Record<number, PickStats> = {
  2023: PWHL_2023_STATS,
  2024: PWHL_2024_STATS,
  2025: PWHL_2025_STATS,
  2026: PWHL_2026_STATS,
};

const EVENT_BY_YEAR: Record<number, { title: string; subtitle: string; date: string; location: string }> = {
  2023: PWHL_2023_EVENT,
  2024: PWHL_2024_EVENT,
  2025: PWHL_2025_EVENT,
  2026: PWHL_2026_EVENT,
};

const ALL_YEARS = Object.keys(PICKS_BY_YEAR).map(Number).sort((a, b) => b - a);

interface PageProps {
  params: Promise<{ year: string }>;
}

export function generateStaticParams() {
  return ALL_YEARS.map((year) => ({ year: String(year) }));
}

export const dynamic = 'force-static';

export default async function PWHLYearPage({ params }: PageProps) {
  const { year: yearStr } = await params;
  const year = Number(yearStr);
  if (!PICKS_BY_YEAR[year]) {
    notFound();
  }
  const picks = PICKS_BY_YEAR[year];
  const stats = STATS_BY_YEAR[year];
  const event = EVENT_BY_YEAR[year];
  const mostRecent = ALL_YEARS[0];
  // The PicksBrowser expects a single `Pick` type from NHL. We share the
  // structure (pick/round/team/player/position/league/nationality) so we
  // can cast at the boundary.
  const picksForBrowser = picks.map((p) => ({
    pick: p.pick,
    round: p.round,
    team: p.team,
    player: p.player,
    position: p.position ?? '',
    league: p.league ?? '',
    nationality: p.nationality ?? '',
  })) as unknown as NHLPick[];

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '1rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>
          <Link href="/draft" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Drafts</Link>
          <span style={{ margin: '0 0.5rem', opacity: 0.4 }}>›</span>
          <Link href={PWHL_BASE} style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>PWHL</Link>
        </div>
        <h1 style={{
          fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
          fontSize: '2.5rem',
          letterSpacing: '0.02em',
          margin: '0 0 0.5rem 0',
        }}>
          {event.title}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem', margin: '0 0 0.5rem 0' }}>
          {event.subtitle}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>
          {event.date} · {event.location}
        </p>
      </header>

      {/* Year switcher — same dropdown as NHL for visual consistency */}
      <YearDropdown basePath={PWHL_BASE} currentYear={year} liveYears={ALL_YEARS} years={ALL_YEARS} />

      {/* Live archive callout — visible on every year except 2026 */}
      {year !== mostRecent && (
        <div style={{
          marginBottom: '1.25rem',
          padding: '0.65rem 1rem',
          background: 'rgba(255,184,28,0.10)', border: '1px solid rgba(255,184,28,0.35)',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '0.75rem', flexWrap: 'wrap',
        }}>
          <div style={{ color: '#FFB81C', fontWeight: 600, fontSize: '0.9rem' }}>
            ⭐ The most recent PWHL draft: {mostRecent}
          </div>
          <Link
            href={`${PWHL_BASE}/${mostRecent}`}
            style={{
              padding: '0.4rem 0.9rem',
              background: '#FFB81C', color: '#000',
              borderRadius: '6px', textDecoration: 'none', fontWeight: 700,
              fontSize: '0.85rem', whiteSpace: 'nowrap',
            }}
          >
            Go to {mostRecent} →
          </Link>
        </div>
      )}

      {/* Stats grid */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.5rem',
      }}>
        <StatBox label="Total picks" value={stats.totalPicks} />
        <StatBox label="Real picks" value={stats.realPicks} />
        <StatBox label="Forfeits" value={stats.forfeits} />
        <StatBox label="Rounds" value={stats.rounds} />
        <StatBox label="Teams" value={stats.uniqueTeams} />
        <StatBox label="Nationalities" value={stats.nationalities} />
        <StatBox label="Leagues" value={stats.leagues} />
      </section>

      {/* Picks table */}
      <PicksBrowser picks={picksForBrowser} year={year} />
    </main>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      padding: '0.75rem 1rem',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: '"Bebas Neue", "Arial Narrow", sans-serif',
        fontSize: '1.85rem',
        color: '#FFB81C',
        lineHeight: 1,
      }}>{value}</div>
      <div style={{
        color: 'rgba(255,255,255,0.5)',
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginTop: '0.35rem',
      }}>{label}</div>
    </div>
  );
}
