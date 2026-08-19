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
  title: '6,352 Hockey Player Profiles — NHL, NCAA, Junior & Pro',
  description:
    'Browse 6,352 hockey player profiles from the NHL, AHL, KHL, NCAA, CHL, IIHF, and pro women’s leagues. Career stats, draft info, team history, and headshots — searchable by name, position, team, or country.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/players',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: '6,352 Hockey Player Profiles — NHL, NCAA, Junior & Pro',
    description:
      'Browse 6,352 hockey player profiles from the NHL, AHL, KHL, NCAA, CHL, IIHF, and pro women’s leagues. Career stats, draft info, team history, and headshots — searchable by name, position, team, or country.',
    url: 'https://rinkstop.com/directory/players',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '6,352 Hockey Player Profiles — NHL, NCAA, Junior & Pro',
    description:
      'Browse 6,352 hockey player profiles from the NHL, AHL, KHL, NCAA, CHL, IIHF, and pro women’s leagues. Career stats, draft info, team history, and headshots — searchable by name, position, team, or country.',
  },
};

// ISR-cached for 1 hour (2026-07-22 perf pass).
export const revalidate = 3600;
export const dynamicParams = true;

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
  const empty: { players: Player[]; totalCount: number; totalPages: number; leagues: League[]; page: number; pageSize: number } = { players: [], totalCount: 0, totalPages: 1, leagues: [], page: 1, pageSize: PAGE_SIZE };
  try {
    const [playersRes, leaguesRes] = await Promise.all([
      fetch(`${base}/api/players?page=1&limit=${PAGE_SIZE}`, { cache: 'no-store' }),
      fetch(`${base}/api/leagues?activeOnly=true`, { cache: 'no-store' }),
    ]);
    const playersJson = await playersRes.json();
    const leaguesJson = await leaguesRes.json();
    const players = (playersJson?.data || []) as Player[];
    const leagues = (leaguesJson?.data || []) as League[];
    return {
      players,
      totalCount: playersJson?.count || 0,
      totalPages: playersJson?.totalPages || 1,
      leagues,
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
  const top = initialData.players.slice(0, 20);
  const ldJson = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'Hockey Players Directory',
        description: 'Hockey player profiles — RinkStop',
        url: 'https://rinkstop.com/directory/players',
        isPartOf: { '@type': 'WebSite', name: 'RinkStop', url: 'https://rinkstop.com' },
      },
      {
        '@type': 'ItemList',
        name: 'Hockey Players',
        numberOfItems: 6352,
        itemListElement: top.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: `${p.first_name} ${p.last_name}`,
          url: `https://rinkstop.com/directory/players/${p.id}`,
        })),
      },
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />
      <PlayersIndexClient initialData={initialData} />
      {/* WS16 PR2 — AdSense in-feed ad below the player list. */}
      <div style={{ maxWidth: '1200px', margin: '1.5rem auto', padding: '0 1rem' }}>
        
      </div>
    </>
  );
}
