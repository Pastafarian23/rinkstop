import type { Metadata } from 'next';
import PWHLPlayoffsClient from './PWHLPlayoffsClient';

interface StoredGame {
  date: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  period: string | null;
  ot?: boolean;
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
  games: StoredGame[];
}

interface StoredRound {
  seriesDesc: string;
  round: number;
  series: StoredSeries[];
}

interface UpdateEntry {
  id?: string;
  text: string;
  type: string;
  content?: string;
  author?: string;
  created_at?: string;
}

export const metadata: Metadata = {
  title: 'PWHL Playoffs',
  description:
    'PWHL playoff bracket, scores, and postseason coverage.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/pwhl/playoffs',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'PWHL Playoffs',
    description:
      'PWHL playoff bracket, scores, and postseason coverage.',
    url: 'https://rinkstop.com/directory/pwhl/playoffs',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PWHL Playoffs',
    description:
      'PWHL playoff bracket, scores, and postseason coverage.',
  },
};

// ISR-cached for 1 hour (2026-07-22 perf pass).
export const revalidate = 3600;
export const dynamicParams = true;

async function fetchRounds(): Promise<StoredRound[]> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
    const res = await fetch(`${base}/api/pwhl/playoffs?ts=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.rounds) ? data.rounds : [];
  } catch (err) {
    console.error('PWHL playoffs initial fetch failed:', err);
    return [];
  }
}

async function fetchUpdates(): Promise<UpdateEntry[]> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
    const res = await fetch(`${base}/api/pwhl/playoffs/updates`, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as UpdateEntry[];
  } catch {
    return [];
  }
}

export default async function PWHLPlayoffsPage() {
  const [initialRounds, initialUpdates] = await Promise.all([fetchRounds(), fetchUpdates()]);
  return (
    <>
      <section style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px', maxWidth: '1280px', margin: '1.5rem auto 0' }}>
        <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '20px', marginBottom: '12px' }}>About the PWHL Playoffs</h2>
        <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.9375rem', lineHeight: 1.7, marginTop: '0.5rem' }}>
          The Professional Women&apos;s Hockey League (PWHL) postseason is a single-elimination tournament crowning the league&apos;s annual champion. Founded in 2023, the PWHL playoffs bring together the top 8 teams from the regular season to compete for the Walter Cup. RinkStop provides live coverage of every playoff round — series scores, schedules, and postgame updates — alongside the year-round directory of teams, rinks, and leagues that feed into this tournament.
        </p>
      </section>
      <PWHLPlayoffsClient initialRounds={initialRounds} initialUpdates={initialUpdates} />
    </>
  );
}
