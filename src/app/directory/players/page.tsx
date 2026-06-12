import type { Metadata } from 'next';
import PlayersIndexClient from './PlayersIndexClient';

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  position?: string;
  jersey_number?: number | string;
  nationality?: string;
  headshot_url?: string;
  shoots?: string;
  height_cm?: number;
  weight_kg?: number;
  birth_date?: string;
  teams?: {
    name: string;
    logo_url?: string;
    league_id?: string;
    leagues?: { name: string; slug: string };
  };
}

interface League { id: string; name: string; }

export const metadata: Metadata = {
  title: 'Hockey Players Directory',
  description:
    'Browse 6,352 hockey player profiles. Career stats, draft info, and team history.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/players',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Hockey Players Directory',
    description:
      'Browse 6,352 hockey player profiles. Career stats, draft info, and team history.',
    url: 'https://rinkstop.com/directory/players',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Players Directory',
    description:
      'Browse 6,352 hockey player profiles. Career stats, draft info, and team history.',
  },
};

// Always render fresh — directory data changes too often to cache statically.
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;

async function fetchInitial(): Promise<{
  players: Player[];
  totalCount: number;
  totalPages: number;
  leagues: League[];
  page: number;
  pageSize: number;
}> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
  const empty = { players: [], totalCount: 0, totalPages: 1, leagues: [], page: 1, pageSize: PAGE_SIZE };
  try {
    const [playersRes, leaguesRes] = await Promise.all([
      fetch(`${base}/api/players?page=1&limit=${PAGE_SIZE}`, { cache: 'no-store' }),
      fetch(`${base}/api/leagues?activeOnly=true`, { cache: 'no-store' }),
    ]);
    const playersJson = await playersRes.json();
    const leaguesJson = await leaguesRes.json();
    return {
      players: playersJson?.data || [],
      totalCount: playersJson?.count || 0,
      totalPages: playersJson?.totalPages || 1,
      leagues: leaguesJson?.data || [],
      page: 1,
      pageSize: PAGE_SIZE,
    };
  } catch (err) {
    console.error('Players initial fetch failed:', err);
    return empty;
  }
}

export default async function PlayersPage() {
  const initialData = await fetchInitial();
  return <PlayersIndexClient initialData={initialData} />;
}
