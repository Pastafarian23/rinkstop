import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { COUNTRY_CONTENT } from '@/lib/location-content';

export async function GET(request: NextRequest) {
  const [{ data: teamsData }, { data: rinksData }, { data: programsData }] = await Promise.all([
    // team_workspaces.country_code is ISO 3166-1 alpha-2. We JOIN country_currency
    // for the full country name that COUNTRY_CONTENT is keyed on.
    supabase.from('team_workspaces').select('country_code, country_currency(country_name)').eq('is_active', true).not('country_code', 'is', null),
    supabase.from('rinks').select('country').eq('is_active', true).not('country', 'is', null),
    supabase.from('youth_programs').select('country').eq('is_active', true).not('country', 'is', null),
  ]);

  const countrySet = new Set<string>();
  for (const row of (teamsData || []) as { country_code: string; country_currency: { country_name: string }[] }[]) {
    if (row.country_code && row.country_currency?.[0]?.country_name) {
      countrySet.add(row.country_code);  // key by ISO code, look up name later
    }
  }
  for (const row of (rinksData || []) as { country?: string }[]) {
    // rinks.country is still full name; skip — covered by team_workspaces now
  }
  for (const row of (programsData || []) as { country?: string }[]) {
    // programs.country is still full name; skip — covered by team_workspaces now
  }

  const countries: {
    country: string;             // legacy: full country name (kept for API compat)
    country_code: string;       // new: ISO 3166-1 alpha-2
    country_name: string;       // new: full name (matches country_currency.country_name)
    name: string;               // legacy: display name from COUNTRY_CONTENT
    flag: string; description: string;
    team_count: number; rink_count: number; program_count: number;
    leagues: { id: string; name: string }[];
  }[] = [];

  // Build a code→name lookup once
  const codeToName = new Map<string, string>();
  for (const row of (teamsData || []) as { country_code: string; country_currency: { country_name: string }[] }[]) {
    if (row.country_code && row.country_currency?.[0]?.country_name) {
      codeToName.set(row.country_code, row.country_currency[0].country_name);
    }
  }

  for (const code of countrySet) {
    const name = codeToName.get(code) || code;
    const content = COUNTRY_CONTENT[name];

    const [
      { data: teams }, { data: rinks }, { data: programs }, { data: teamLeagues },
    ] = await Promise.all([
      supabase.from('team_workspaces').select('id').eq('country_code', code).eq('is_active', true),
      supabase.from('rinks').select('id').eq('country', name).eq('is_active', true),
      supabase.from('youth_programs').select('id').eq('country', name).eq('is_active', true),
      supabase.from('team_workspaces').select('league_id, leagues(id, name)').eq('country_code', code).eq('is_active', true).not('league_id', 'is', null),
    ]);

    const leagueMap = new Map<string, { id: string; name: string }>();
    for (const t of (teamLeagues || []) as { league_id: string; leagues?: { id: string; name: string }[] }[]) {
      if (t.leagues && Array.isArray(t.leagues) && !leagueMap.has(t.league_id)) {
        leagueMap.set(t.league_id, t.leagues[0]);
      }
    }

    countries.push({
      country: name,        // legacy: full country name (kept for API compat)
      country_code: code,   // new: ISO 3166-1 alpha-2
      country_name: name,   // new: full name (matches country_currency.country_name)
      name: content?.name ?? name,
      flag: content?.flag ?? '🌍',
      description: content?.description ?? `Hockey is played in ${name} through various local leagues, community programs, and regional competitions.`,
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
