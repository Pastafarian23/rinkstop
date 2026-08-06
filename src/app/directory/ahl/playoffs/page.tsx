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

export const revalidate = 3600;
export const dynamicParams = true;

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
  return (
    <>
      <section style={{ background: 'rgba(13,17,23,0.6)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px', maxWidth: '1280px', margin: '1.5rem auto 0' }}>
        <h2 style={{ fontWeight: 600, color: '#fff', fontSize: '20px', marginBottom: '12px' }}>About the AHL Playoffs</h2>
        <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.9375rem', lineHeight: 1.7, marginTop: '0.5rem' }}>
          The American Hockey League (AHL) postseason is a single-elimination tournament crowning the league&apos;s annual champion. Founded in 1936, the AHL playoffs bring together the top 16 teams from the regular season to compete for the Calder Cup. RinkStop provides live coverage of every playoff round — series scores, schedules, and postgame updates — alongside the year-round directory of teams, rinks, and leagues that feed into this tournament.
        </p>
      </section>
      <AHLPlayoffsClient initialRounds={rounds} initialUpdates={updates} />
    </>
  );
}
