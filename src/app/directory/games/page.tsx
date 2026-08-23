import type { Metadata } from 'next';
import { Suspense } from 'react';
import GamesIndexClient from './GamesIndexClient';

// PR #146 (2026-08-22) WS24 thin-content sweep: expand the /directory/games
// meta description so the index page clears the AdSense ~150-word
// threshold. Anchor pools: league chips (NHL, AHL, PWHL, KHL/SHL/Liiga/DEL/NL/
// Extraliga/NCAA/CHL/USHL), live/recent/historical time windows, and the
// always-rendered directory-context baseline.
const _gamesMetaLong = `Live scores, schedules, and results from hockey games worldwide — NHL, AHL, PWHL, KHL, SHL (Sweden), Liiga (Finland), DEL (Germany), National League (Switzerland), Czech Extraliga, NCAA hockey, CHL (WHL, OHL, QMJHL), and USHL. Filter by team or league, switch between Current (live and recent) and Historical (archived) matchups, and load more games as you scroll. Every score on this page links to the team profile and league directory so you can follow the teams and leagues you care about. RinkStop is the open hockey directory — every team, league, player, and rink in the world has a public profile page.`.trim();
export const metadata: Metadata = {
  title: 'Hockey Games & Scores — NHL, AHL, PWHL, KHL, NCAA, CHL',
  description: _gamesMetaLong.slice(0, 240),
  alternates: {
    canonical: 'https://rinkstop.com/directory/games',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Hockey Games & Scores — NHL, AHL, PWHL, KHL, NCAA, CHL',
    description: _gamesMetaLong.slice(0, 240),
    url: 'https://rinkstop.com/directory/games',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Games & Scores — NHL, AHL, PWHL, KHL, NCAA, CHL',
    description: _gamesMetaLong.slice(0, 240),
  },
};

// ISR-cached for 1 hour (2026-07-22 perf pass).
export const dynamic = 'force-dynamic';

interface Game {
  id: string;
  date: string;
  status: string;
  scheduled_at: string;
  home_score: number | null;
  away_score: number | null;
  home_team: { id: string; name: string; slug: string | null; logo_url: string | null } | null;
  away_team: { id: string; name: string; slug: string | null; logo_url: string | null } | null;
  league: { id: string; name: string; slug: string } | null;
}

interface ApiResponse {
  data: Game[];
  count: number;
  chip: string;
  time: string;
  hasMore: boolean;
}

type SearchParams = Promise<{
  league?: string;
  team?: string;
  time?: string;
  subleague?: string;
}>;

async function fetchInitialGames(searchParams: Awaited<SearchParams>): Promise<{
  games: Game[];
  hasMore: boolean;
  totalShown: number;
  league: string;
  time: string;
  team: string;
  subleague: string;
}> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
  const league = searchParams.league || 'nhl';
  const team = searchParams.team || '';
  const time = searchParams.time || 'current';
  const subleague = searchParams.subleague || '';
  const limit = 50;
  const offset = 0;
  try {
    const url = `${base}/api/scores?league=${league}&time=${time}${team ? `&team=${team}` : ''}${subleague ? `&subleague=${subleague}` : ''}&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { cache: 'no-store' });
    const json: ApiResponse = await res.json();
    return {
      games: json?.data || [],
      hasMore: !!json?.hasMore,
      totalShown: json?.count || 0,
      league,
      time,
      team,
      subleague,
    };
  } catch (err) {
    console.error('Games initial fetch failed:', err);
    return { games: [], hasMore: false, totalShown: 0, league, time, team, subleague };
  }
}

export default async function GamesPage(props: { searchParams: SearchParams }) {
  const sp = await props.searchParams;
  const initialData = await fetchInitialGames(sp);
  // WS22 games layout (2026-08-23): search + filter lead the page
  // (rendered inside GamesIndexClient). The descriptive intro moves to
  // a collapsible <details> block below the list so the chip bar +
  // dropdowns are the first thing the user sees — matching the teams
  // and leagues pages.
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div className="skeleton" style={{ height: '200px', borderRadius: '8px' }} /></div>}>
      <GamesIndexClient initialData={initialData} />
      <section style={{ maxWidth: '80rem', margin: '1.5rem auto', padding: '0 1rem', color: 'rgba(255,255,255,0.78)', fontSize: '0.9375rem', lineHeight: 1.7 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
          Find live scores and recent results from every hockey league
        </h2>
        <p style={{ margin: 0 }}>
          Live and recent fixtures from the NHL, AHL, PWHL, KHL, SHL (Sweden), Liiga (Finland), DEL (Germany), National League (Switzerland), Czech Extraliga, NCAA hockey, the Canadian Hockey League (WHL, OHL, QMJHL), and the USHL. Use the league chip + team and time dropdowns above to narrow the list, then tap a score to open the team or league profile.
        </p>
        <details style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.75)', fontSize: '0.9375rem', lineHeight: 1.7 }}>
          <summary style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, userSelect: 'none', padding: '0.5rem 0' }}>
            About the RinkStop Games &amp; Scores Directory
          </summary>
          <div style={{ paddingTop: '0.5rem' }}>
            <p style={{ marginBottom: '0.75rem' }}>
              The RinkStop scores index is the open hockey games directory — live and recent fixtures from the NHL, AHL, PWHL, KHL, SHL (Sweden), Liiga (Finland), DEL (Germany), National League (Switzerland), Czech Extraliga, NCAA hockey, the Canadian Hockey League (WHL, OHL, QMJHL), and the USHL. Filter by league chip to scope the list to one competition, narrow by team or sub-league from the dropdowns, and switch the time window between Current (live and recent) and Historical (archived matchups from past seasons).
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              Every score on this page links to the team profile and the league directory, so you can move from a single game into the full team page (roster, schedule, recent results) or the league overview (teams, country context, FAQ). Each team link resolves to the canonical RinkStop team profile page keyed by the team&apos;s own slug; each league name resolves to the league&apos;s directory page.
            </p>
            <p style={{ marginBottom: 0 }}>
              Below the introduction, this page shows the league filter chips, the team and time dropdowns, and the paginated game list with status badges (Live, Final, Scheduled, Postponed, Cancelled). The list loads the first 50 games on the server and shows a Load More button when more are available — refinement by team or sub-league resets the offset. RinkStop maintains this directory as a public, indexable entry so visitors searching for live scores, schedules, and results land on a page with verified league coverage and a path into the wider hockey directory.
            </p>
          </div>
        </details>
      </section>
    </Suspense>
  );
}
