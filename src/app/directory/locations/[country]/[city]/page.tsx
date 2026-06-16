import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { COUNTRY_CONTENT } from '@/lib/location-content';
import CityPageClient from './CityPageClient';

interface Team {
  id: string;
  name: string;
  logo_url?: string;
  league_id?: string;
  slug?: string;
  leagues?: { name: string } | { name: string }[];
}
interface Rink {
  id: string;
  name: string;
  slug?: string;
  city?: string;
  country?: string;
  address?: string;
}
interface YouthProgram {
  id: string;
  name: string;
  program_type?: string;
  age_group?: string;
}
interface LeagueEntry { id: string; name: string }

export const dynamic = 'force-dynamic';

async function fetchCityData(country: string, city: string) {
  const [
    { data: teamsData },
    { data: rinksData },
    { data: programsData },
  ] = await Promise.all([
    supabase
      .from('teams')
      .select('id, name, logo_url, league_id, leagues(name)')
      .eq('country', country)
      .eq('city', city)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('rinks')
      .select('id, name, city, country, address')
      .eq('country', country)
      .eq('city', city)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('youth_programs')
      .select('id, name, program_type, age_group')
      .eq('country', country)
      .eq('city', city)
      .eq('is_active', true)
      .order('name'),
  ]);

  const teams = (teamsData as unknown as Team[]) || [];
  const rinks = (rinksData as unknown as Rink[]) || [];
  const programs = (programsData as unknown as YouthProgram[]) || [];

  // Extract unique leagues
  const leagueMap = new Map<string, string>();
  teams.forEach((t) => {
    const leagueName = Array.isArray(t.leagues) ? t.leagues[0]?.name : t.leagues?.name;
    if (t.league_id && leagueName && !leagueMap.has(t.league_id)) {
      leagueMap.set(t.league_id, leagueName);
    }
  });
  const leagues: LeagueEntry[] = Array.from(leagueMap.entries()).map(([id, name]) => ({ id, name }));

  return { teams, rinks, programs, leagues };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string; city: string }>;
}): Promise<Metadata> {
  const { country, city } = await params;
  const decodedCountry = decodeURIComponent(country);
  const decodedCity = decodeURIComponent(city);
  const countryContent = COUNTRY_CONTENT[decodedCountry];
  const countryName = countryContent?.name ?? decodedCountry;
  const cityDescription = countryContent?.cities?.[decodedCity]?.description;
  const description =
    cityDescription ??
    `Hockey teams, rinks, and youth programs in ${decodedCity}, ${countryName}. Browse local hockey listings.`;
  return {
    title: `Hockey in ${decodedCity}`,
    description,
    alternates: {
      canonical: `https://rinkstop.com/directory/locations/${country}/${city}`,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `Hockey in ${decodedCity}`,
      description,
      url: `https://rinkstop.com/directory/locations/${country}/${city}`,
      siteName: 'RinkStop',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Hockey in ${decodedCity}`,
      description,
    },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ country: string; city: string }>;
}) {
  const { country, city } = await params;
  const countryName = decodeURIComponent(country);
  const cityName = decodeURIComponent(city);
  const { teams, rinks, programs, leagues } = await fetchCityData(countryName, cityName);

  // If the city has no rinks, teams, or programs, return 404 so we don't
  // ship empty/thin pages to Google. Programmatic SEO only works if the
  // pages have real content. Empty city pages are a footgun, not an asset.
  if (teams.length === 0 && rinks.length === 0 && programs.length === 0) {
    notFound();
  }

  return (
    <CityPageClient
      countryName={countryName}
      cityName={cityName}
      initialTeams={teams}
      initialRinks={rinks}
      initialPrograms={programs}
      initialLeagues={leagues}
    />
  );
}
