import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { COUNTRY_CONTENT } from '@/lib/location-content';

export async function GET(request: NextRequest) {
  const [{ data: teamsData }, { data: rinksData }, { data: programsData }] = await Promise.all([
    supabase.from('teams').select('country').eq('is_active', true).not('country', 'is', null),
    supabase.from('rinks').select('country').eq('is_active', true).not('country', 'is', null),
    supabase.from('youth_programs').select('country').eq('is_active', true).not('country', 'is', null),
  ]);

  const countrySet = new Set<string>();
  for (const row of [...(teamsData || []), ...(rinksData || []), ...(programsData || [])] as { country?: string }[]) {
    if (row.country) countrySet.add(row.country);
  }

  const countries: {
    country: string; name: string; flag: string; description: string;
    team_count: number; rink_count: number; program_count: number;
    leagues: { id: string; name: string }[];
  }[] = [];

  for (const country of countrySet) {
    const content = COUNTRY_CONTENT[country];

    const [
      { data: teams }, { data: rinks }, { data: programs }, { data: teamLeagues },
    ] = await Promise.all([
      supabase.from('teams').select('id').eq('country', country).eq('is_active', true),
      supabase.from('rinks').select('id').eq('country', country).eq('is_active', true),
      supabase.from('youth_programs').select('id').eq('country', country).eq('is_active', true),
      supabase.from('teams').select('league_id, leagues(id, name)').eq('country', country).eq('is_active', true).not('league_id', 'is', null),
    ]);

    const leagueMap = new Map<string, { id: string; name: string }>();
    for (const t of (teamLeagues || []) as { league_id: string; leagues?: { id: string; name: string }[] }[]) {
      if (t.leagues && Array.isArray(t.leagues) && !leagueMap.has(t.league_id)) {
        leagueMap.set(t.league_id, t.leagues[0]);
      }
    }

    countries.push({
      country,
      name: content?.name ?? country,
      flag: content?.flag ?? '🌍',
      description: content?.description ?? `Hockey is played in ${country} through various local leagues, community programs, and regional competitions.`,
      team_count: (teams || []).length,
      rink_count: (rinks || []).length,
      program_count: (programs || []).length,
      leagues: Array.from(leagueMap.values()),
    });
  }

  countries.sort((a, b) =>
    b.team_count + b.rink_count + b.program_count - (a.team_count + a.rink_count + a.program_count)
  );

  const r = NextResponse.json({ data: countries });
  r.headers.set('Cache-Control', 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400');
  return r;
}