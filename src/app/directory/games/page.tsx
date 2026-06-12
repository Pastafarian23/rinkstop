import type { Metadata } from 'next';
import { Suspense } from 'react';
import GamesIndexClient from './GamesIndexClient';

export const metadata: Metadata = {
  title: 'Hockey Games & Scores',
  description:
    'Live scores, schedules, and results from hockey games worldwide.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/games',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Hockey Games & Scores',
    description:
      'Live scores, schedules, and results from hockey games worldwide.',
    url: 'https://rinkstop.com/directory/games',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Games & Scores',
    description:
      'Live scores, schedules, and results from hockey games worldwide.',
  },
};

// Always render fresh — scores change minute-to-minute.
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
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><div className="skeleton" style={{ height: '200px', borderRadius: '8px' }} /></div>}>
      <GamesIndexClient initialData={initialData} />
    </Suspense>
  );
}
