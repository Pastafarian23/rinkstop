import type { Metadata } from 'next';
import TeamsIndexClient from './TeamsIndexClient';

interface Team {
  id: string;
  name: string;
  city?: string;
  country?: string;
  league_id?: string;
  leagues?: { name: string };
  slug?: string;
  logo_url?: string;
  claimed_by_tier?: string | null;
  claimed_by_user_id?: string | null;
}

export const metadata: Metadata = {
  title: 'Hockey Teams Directory',
  description:
    'Browse 2,116 hockey teams from NHL, AHL, KHL, NCAA, junior, and youth leagues worldwide.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/teams',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Hockey Teams Directory',
    description:
      'Browse 2,116 hockey teams from NHL, AHL, KHL, NCAA, junior, and youth leagues worldwide.',
    url: 'https://rinkstop.com/directory/teams',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hockey Teams Directory',
    description:
      'Browse 2,116 hockey teams from NHL, AHL, KHL, NCAA, junior, and youth leagues worldwide.',
  },
};

// Always render fresh — directory data changes too often to cache statically.
export const dynamic = 'force-dynamic';

async function fetchInitialTeams(): Promise<Team[]> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
    const res = await fetch(`${base}/api/teams?sort=tier&limit=100`, {
      // Don't cache — directory changes often.
      cache: 'no-store',
    });
    const json = await res.json();
    return Array.isArray(json) ? json : (json?.data || []);
  } catch (err) {
    console.error('Teams initial fetch failed:', err);
    return [];
  }
}

export default async function TeamsPage() {
  const initialTeams = await fetchInitialTeams();
  return <TeamsIndexClient initialTeams={initialTeams} />;
}
