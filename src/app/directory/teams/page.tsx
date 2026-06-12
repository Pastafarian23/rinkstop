import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import TeamsIndexClient from './TeamsIndexClient';

interface Team {
  id: string;
  name: string;
  city?: string;
  country?: string;
  league_id?: string;
  slug?: string;
  logo_url?: string;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ country?: string }> }): Promise<Metadata> {
  const { country } = await searchParams;
  const title = country ? `Hockey Teams in ${country}` : 'Hockey Teams Directory';
  const desc = country
    ? `Browse hockey teams in ${country}. Find pro, junior, college, and amateur teams with rosters, logos, and arena info.`
    : `Browse hockey teams from NHL, AHL, KHL, NCAA, junior, and youth leagues worldwide.`;
  return {
    title,
    description: desc,
    alternates: {
      canonical: country ? `https://rinkstop.com/directory/teams?country=${encodeURIComponent(country)}` : 'https://rinkstop.com/directory/teams',
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description: desc,
      url: country ? `https://rinkstop.com/directory/teams?country=${encodeURIComponent(country)}` : 'https://rinkstop.com/directory/teams',
      siteName: 'RinkStop',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
    },
  };
}

// Always render fresh — directory data changes too often to cache statically.
export const dynamic = 'force-dynamic';

async function fetchInitialTeams(country?: string | null): Promise<Team[]> {
  try {
    let q = supabase
      .from('teams')
      .select('id, name, slug, logo_url, city, country, league_id')
      .eq('is_active', true)
      .order('name')
      .limit(500);
    if (country) q = q.eq('country', country);
    const { data, error } = await q;
    if (error) {
      console.error('Teams initial fetch failed:', error);
      return [];
    }
    return (data || []) as Team[];
  } catch (err) {
    console.error('Teams initial fetch failed:', err);
    return [];
  }
}

export default async function TeamsPage({ searchParams }: { searchParams: Promise<{ country?: string }> }) {
  const { country } = await searchParams;
  const initialTeams = await fetchInitialTeams(country);
  return <TeamsIndexClient initialTeams={initialTeams} country={country ?? null} />;
}
