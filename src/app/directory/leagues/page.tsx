import type { Metadata } from 'next';
import LeaguesIndexClient from './LeaguesIndexClient';

interface League {
  id: string;
  name: string;
  country?: string;
  level?: string;
  website_url?: string;
  claimed_by_tier?: string | null;
  claimed_by_user_id?: string | null;
}

export const metadata: Metadata = {
  title: 'Hockey Leagues Directory | RinkStop',
  description:
    'Browse 192 hockey leagues from NHL, AHL, KHL, NCAA, IIHF, and youth leagues worldwide.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/leagues',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Hockey Leagues Directory | RinkStop',
    description:
      'Browse 192 hockey leagues from NHL, AHL, KHL, NCAA, IIHF, and youth leagues worldwide.',
    url: 'https://rinkstop.com/directory/leagues',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Leagues Directory | RinkStop',
    description:
      'Browse 192 hockey leagues from NHL, AHL, KHL, NCAA, IIHF, and youth leagues worldwide.',
  },
};

// Always render fresh — directory data changes too often to cache statically.
export const dynamic = 'force-dynamic';

async function fetchInitialLeagues(): Promise<League[]> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
    const res = await fetch(`${base}/api/leagues?sort=tier`, {
      cache: 'no-store',
    });
    const json = await res.json();
    return Array.isArray(json) ? json : (json?.data || []);
  } catch (err) {
    console.error('Leagues initial fetch failed:', err);
    return [];
  }
}

export default async function LeaguesPage() {
  const initialLeagues = await fetchInitialLeagues();
  return <LeaguesIndexClient initialLeagues={initialLeagues} />;
}
