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
  return (
    <>
      {/* SEO editorial section — added 2026-06-15.
          Renders server-side so Google sees the content in the initial
          HTML. The client component below handles the live search/filter
          UI; the editorial block sits above it and never re-renders. */}
      {country ? (
        <section style={{ marginBottom: '2rem', color: 'rgba(255,255,255,0.75)', fontSize: '0.9375rem', lineHeight: 1.7, maxWidth: '80rem', margin: '0 auto 2rem', padding: '2rem 1rem 0' }}>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
            Hockey teams in {country}
          </h2>
          <p style={{ marginBottom: '0.75rem' }}>
            {country} has a mix of professional, junior, college, and amateur hockey teams across
            multiple leagues and divisions. This page lists every active hockey team in {country}
            from our directory. Use the search box below to filter by team name, city, or league.
          </p>
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: '#fff', marginTop: '0.875rem', marginBottom: '0.4rem' }}>
            How to find a hockey team in {country}
          </h3>
          <p>
            Most teams have a roster page with arena info, division, and the league they play in.
            If you are a player looking for a team, the verified rosters show which teams are
            actively recruiting. If you are a parent looking for youth hockey in {country},
            start with the teams in your city and check the league page for age-group rules.
          </p>
        </section>
      ) : (
        <section style={{ marginBottom: '2rem', color: 'rgba(255,255,255,0.75)', fontSize: '0.9375rem', lineHeight: 1.7, maxWidth: '80rem', margin: '0 auto 2rem', padding: '2rem 1rem 0' }}>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
            Find any hockey team in the world
          </h2>
          <p style={{ marginBottom: '0.75rem' }}>
            RinkStop tracks more than {initialTeams.length.toLocaleString()} active hockey teams
            across professional, junior, college, amateur, and youth leagues on six continents.
            Use the search and league filters below to find a specific team, or browse the full
            directory by league, country, or city.
          </p>
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: '#fff', marginTop: '0.875rem', marginBottom: '0.4rem' }}>
            Professional hockey leagues in the directory
          </h3>
          <p style={{ marginBottom: '0.75rem' }}>
            The directory covers the NHL and its 32 franchises, the AHL (American Hockey League),
            the ECHL, the KHL (Kontinental Hockey League in Russia and Belarus), the SHL (Swedish
            Hockey League), the Liiga (Finland), the DEL (Germany), the NLA (Switzerland), and
            the Czech Extraliga. We also track the CHL (Canadian Hockey League) including the OHL,
            WHL, and QMJHL, plus NCAA Division I and Division III men&apos;s and women&apos;s programs
            in the United States and Canada.
          </p>
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: '#fff', marginTop: '0.875rem', marginBottom: '0.4rem' }}>
            Junior, youth, and amateur hockey
          </h3>
          <p style={{ marginBottom: '0.75rem' }}>
            Beyond the pro ranks, the directory includes USA Hockey and Hockey Canada registered
            youth programs, high school teams, college club programs, beer leagues, and women&apos;s
            leagues at every level. If a team plays organized hockey on a regular schedule, it
            belongs here.
          </p>
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: '#fff', marginTop: '0.875rem', marginBottom: '0.4rem' }}>
            How to use the directory
          </h3>
          <p>
            Click any team to see its full roster, arena, schedule, and league context. Verified
            rosters are marked with a check badge. Teams can be filtered by league tier using the
            pill bar at the top of the list.
          </p>
        </section>
      )}
      <TeamsIndexClient initialTeams={initialTeams} country={country ?? null} />
    </>
  );
}
