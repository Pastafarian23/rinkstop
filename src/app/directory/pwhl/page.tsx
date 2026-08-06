import type { Metadata } from 'next';
import PWHLClient from './PWHLClient';

interface Team {
  id: string;
  name: string;
  city?: string;
  country?: string;
  league_id?: string;
  slug?: string;
  logo_url?: string;
}

interface League {
  id: string;
  name: string;
  slug: string;
  country: string;
  level: string;
  website_url: string;
  description?: string;
}

export const metadata: Metadata = {
  title: 'PWHL — Professional Women\'s Hockey League',
  description:
    "Professional Women's Hockey League teams, players, schedules, and standings.",
  alternates: {
    canonical: 'https://rinkstop.com/directory/pwhl',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "PWHL — Professional Women's Hockey League",
    description:
      "Professional Women's Hockey League teams, players, schedules, and standings.",
    url: 'https://rinkstop.com/directory/pwhl',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "PWHL — Professional Women's Hockey League",
    description:
      "Professional Women's Hockey League teams, players, schedules, and standings.",
  },
};

// ISR-cached for 1 hour (2026-07-22 perf pass).
export const revalidate = 3600;
export const dynamicParams = true;

async function fetchInitialData(): Promise<{ league: League | null; teams: Team[] }> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
    const res = await fetch(`${base}/api/pwhl`, { cache: 'no-store' });
    const json = await res.json();
    return {
      league: json?.league ?? null,
      teams: Array.isArray(json?.teams) ? json.teams : [],
    };
  } catch (err) {
    console.error('PWHL initial fetch failed:', err);
    return { league: null, teams: [] };
  }
}

export default async function PWHLPage() {
  const { league, teams } = await fetchInitialData();
  return <PWHLClient league={league} teams={teams} />;
}
