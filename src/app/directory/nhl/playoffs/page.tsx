import type { Metadata } from 'next';
import NHLPlayoffsClient from './NHLPlayoffsClient';
import { withDefaultOg } from '@/lib/metadata-defaults';

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
  openGraph: withDefaultOg({
    title: '2026 NHL Playoffs Bracket & Live Coverage',
    description:
      'Live coverage of the 2026 NHL Playoffs and Stanley Cup bracket.',
    url: 'https://rinkstop.com/directory/nhl/playoffs',
    siteName: 'RinkStop',
    type: 'website',
  }),
  twitter: {
    card: 'summary_large_image',
    title: '2026 NHL Playoffs Bracket & Live Coverage',
    description:
      'Live coverage of the 2026 NHL Playoffs and Stanley Cup bracket.',
  },
};

export const revalidate = 3600;
export const dynamicParams = true;

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
  return (
    <>
      <section style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px', maxWidth: '1280px', margin: '1.5rem auto 0' }}>
        <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '20px', marginBottom: '12px' }}>About the NHL Playoffs</h2>
        <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.9375rem', lineHeight: 1.7, marginTop: '0.5rem' }}>
          The National Hockey League (NHL) postseason is a single-elimination tournament crowning the league&apos;s annual champion. Founded in 1917, the NHL playoffs bring together the top 16 teams from the regular season to compete for the Stanley Cup. RinkStop provides live coverage of every playoff round — series scores, schedules, and postgame updates — alongside the year-round directory of teams, rinks, and leagues that feed into this tournament.
        </p>
      </section>
      <NHLPlayoffsClient initialRounds={rounds} initialUpdates={updates} />
    </>
  );
}
