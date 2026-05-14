import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { COUNTRY_CONTENT, getCityDescription } from '@/lib/location-content';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ country: string }> }
) {
  const { country } = await params;
  const decodedCountry = decodeURIComponent(country);

  const content = COUNTRY_CONTENT[decodedCountry];

  // Get all distinct cities in this country from teams, rinks, and programs
  const [{ data: teams }, { data: rinks }, { data: programs }] = await Promise.all([
    supabase
      .from('teams')
      .select('city')
      .eq('country', decodedCountry)
      .eq('is_active', true)
      .not('city', 'is', null),
    supabase
      .from('rinks')
      .select('city')
      .eq('country', decodedCountry)
      .eq('is_active', true)
      .not('city', 'is', null),
    supabase
      .from('youth_programs')
      .select('city')
      .eq('country', decodedCountry)
      .eq('is_active', true)
      .not('city', 'is', null),
  ]);

  // Collect distinct cities
  const citySet = new Set<string>();
  [...(teams || []), ...(rinks || []), ...(programs || [])].forEach(
    (row: { city?: string }) => {
      if (row.city) citySet.add(row.city);
    }
  );

  const cities: {
    city: string;
    name: string;
    description: string;
    team_count: number;
    rink_count: number;
    program_count: number;
  }[] = [];

  for (const city of citySet) {
    const cityContent = content?.cities?.[city];
    const [{ data: teamsInCity }, { data: rinksInCity }, { data: programsInCity }] =
      await Promise.all([
        supabase
          .from('teams')
          .select('id')
          .eq('country', decodedCountry)
          .eq('city', city)
          .eq('is_active', true),
        supabase
          .from('rinks')
          .select('id')
          .eq('country', decodedCountry)
          .eq('city', city)
          .eq('is_active', true),
        supabase
          .from('youth_programs')
          .select('id')
          .eq('country', decodedCountry)
          .eq('city', city)
          .eq('is_active', true),
      ]);

    cities.push({
      city,
      name: cityContent?.name ?? city,
      description:
        cityContent?.description ?? getCityDescription(city, decodedCountry),
      team_count: (teamsInCity || []).length,
      rink_count: (rinksInCity || []).length,
      program_count: (programsInCity || []).length,
    });
  }

  // Sort cities by total activity
  cities.sort(
    (a, b) =>
      b.team_count + b.rink_count + b.program_count -
      (a.team_count + a.rink_count + a.program_count)
  );

  return NextResponse.json({
    data: {
      country: decodedCountry,
      content: content ?? null,
      cities,
    },
  });
}