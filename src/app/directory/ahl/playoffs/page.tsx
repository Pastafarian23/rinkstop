import type { Metadata } from 'next';
import AHLPlayoffsClient from './AHLPlayoffsClient';

interface StoredRound {
  seriesDesc: string;
  round: number;
  series: any[];
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
  title: '2026 AHL Playoffs Bracket & Calder Cup Coverage',
  description:
    'Live coverage of the 2026 AHL Playoffs and Calder Cup bracket. Real-time scores, series updates, and postseason news for every round.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/ahl/playoffs',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: '2026 AHL Playoffs Bracket & Calder Cup Coverage',
    description:
      'Live coverage of the 2026 AHL Playoffs and Calder Cup bracket.',
    url: 'https://rinkstop.com/directory/ahl/playoffs',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '2026 AHL Playoffs Bracket & Calder Cup Coverage',
    description:
      'Live coverage of the 2026 AHL Playoffs and Calder Cup bracket.',
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
      fetch(`${base}/api/ahl/playoffs`, { cache: 'no-store' }),
      fetch(`${base}/api/ahl/playoffs/updates`, { cache: 'no-store' }),
    ]);
    const playoffs = playoffsRes.ok ? await playoffsRes.json() : null;
    const updates = updatesRes.ok ? await updatesRes.json() : [];
    const rounds: StoredRound[] = playoffs?.rounds || [];
    return { rounds, updates: (updates as UpdateEntry[]) || [] };
  } catch (err) {
    console.error('AHL Playoffs initial fetch failed:', err);
    return { rounds: [], updates: [] };
  }
}

export default async function AHLPlayoffsPage() {
  const { rounds, updates } = await fetchInitialRoundsAndUpdates();
  return <AHLPlayoffsClient initialRounds={rounds} initialUpdates={updates} />;
}
