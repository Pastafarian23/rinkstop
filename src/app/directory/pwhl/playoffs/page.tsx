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
  return <PWHLPlayoffsClient initialRounds={initialRounds} initialUpdates={initialUpdates} />;
}
