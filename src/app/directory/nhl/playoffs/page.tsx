import type { Metadata } from 'next';
import NHLPlayoffsClient from './NHLPlayoffsClient';

interface UpdateEntry {
  id?: string;
  time: string;
  text: string;
  type: string;
  content?: string;
  game_id?: string;
  game_label?: string;
  author?: string;
  created_at?: string;
}

interface StoredSeries {
  desc: string;
  homeWins: number;
  awayWins: number;
  homeTeam: string;
  awayTeam: string;
  homeAbbr: string;
  awayAbbr: string;
  nextGame: any;
  games: any[];
}

interface StoredRound {
  seriesDesc: string;
  round: number;
  series: StoredSeries[];
}

export const metadata: Metadata = {
  title: '2026 NHL Playoffs Bracket & Live Coverage',
  description:
    'Live coverage of the 2026 NHL Playoffs and Stanley Cup bracket. Real-time scores, series updates, and postseason news for every round.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/nhl/playoffs',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: '2026 NHL Playoffs Bracket & Live Coverage',
    description:
      'Live coverage of the 2026 NHL Playoffs and Stanley Cup bracket.',
    url: 'https://rinkstop.com/directory/nhl/playoffs',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '2026 NHL Playoffs Bracket & Live Coverage',
    description:
      'Live coverage of the 2026 NHL Playoffs and Stanley Cup bracket.',
  },
};

export const dynamic = 'force-dynamic';

async function fetchInitialRoundsAndUpdates(): Promise<{
  rounds: StoredRound[];
  updates: UpdateEntry[];
}> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
  try {
    const [playoffsRes, updatesRes] = await Promise.all([
      fetch(`${base}/api/nhl/playoffs`, { cache: 'no-store' }),
      fetch(`${base}/api/nhl/playoffs/updates`, { cache: 'no-store' }),
    ]);
    const playoffs = playoffsRes.ok ? await playoffsRes.json() : null;
    const updates = updatesRes.ok ? await updatesRes.json() : [];
    let rounds: StoredRound[] = [];
    if (playoffs?.games && playoffs.games.length > 0) {
      rounds = playoffs.rounds || [];
    } else if (playoffs?.rounds && playoffs.rounds.length > 0) {
      rounds = playoffs.rounds;
    }
    return { rounds, updates: (updates as UpdateEntry[]) || [] };
  } catch (err) {
    console.error('NHL Playoffs initial fetch failed:', err);
    return { rounds: [], updates: [] };
  }
}

export default async function PlayoffsPage() {
  const { rounds, updates } = await fetchInitialRoundsAndUpdates();
  return <NHLPlayoffsClient initialRounds={rounds} initialUpdates={updates} />;
}
