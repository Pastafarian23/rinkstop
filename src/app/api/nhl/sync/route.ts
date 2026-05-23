// NHL/NCAAH Sync API Route
// POST /api/nhl/sync - triggers sync of NCAA and NHL teams from Highantly
// GET /api/nhl/sync?type=teams|standings|matches - check sync status

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const HIGHLIGHTLY_API_KEY = process.env.HIGHLIGHTLY_API_KEY;
const NHL_BASE_URL = 'https://nhl.highantly.net';
const RAPIDAPI_HOST = 'nhl-ncaah-api.p.rapidapi.com';

const NCAA_CONFERENCES = [
  'Hockey East',
  'Big Ten',
  'NCHC',
  'ECAC',
  'WCHA',
  'CCHA',
  'College Hockey America',
  'Metro Atlantic Athletic Conference',
  'Northeast 10 Conference',
  'West Coast Conference',
];

let apiCallsToday = 0;

async function fetchNHL(endpoint, params = {}) {
  if (!HIGHLIGHTLY_API_KEY) {
    throw new Error('HIGHLIGHTLY_API_KEY not configured');
  }

  const url = new URL(`${NHL_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

  const response = await fetch(url.toString(), {
    headers: {
      'x-rapidapi-key': HIGHLIGHTLY_API_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST,
    },
  });

  apiCallsToday++;

  if (!response.ok) {
    throw new Error(`Highantly API error ${response.status}: ${await response.text()}`);
  }

  const json = await response.json();
  return json.data ?? json;
}

async function syncTeamsForLeague(leagueId, leagueName) {
  const teams = await fetchNHL('/teams', { leagueName, limit: 50 });

  if (!teams || !Array.isArray(teams)) {
    return { synced: 0, errors: [`No teams for ${leagueName}`] };
  }

  const results = { synced: 0, failed: 0, errors: [] };

  for (const team of teams) {
    try {
      const { error } = await supabaseAdmin
        .from('nhl_teams')
        .upsert({
          id: String(team.id),
          name: team.name || team.displayName,
          short_name: team.abbreviation || team.shortName,
          logo: team.logo,
          country_code: 'US',
          league_id: leagueId,
          league_name: leagueName,
          last_synced: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;
      results.synced++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Team ${team.id}: ${error.message}`);
    }
  }

  return results;
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const syncType = searchParams.get('type') || 'teams';
    const leagueFilter = searchParams.get('league'); // optional filter

    const results = {
      success: true,
      synced: 0,
      failed: 0,
      apiCallsUsed: 0,
      details: [] as string[],
      errors: [] as string[],
    };

    // Sync NCAA teams
    if (syncType === 'teams' || syncType === 'all') {
      for (const conf of NCAA_CONFERENCES) {
        if (leagueFilter && leagueFilter !== conf) continue;

        const r = await syncTeamsForLeague('NCAA', conf);
        results.synced += r.synced;
        results.failed += r.failed;
        results.details.push(`${conf}: ${r.synced} teams`);
        results.errors.push(...r.errors);
      }
    }

    // Sync NHL teams
    if (syncType === 'teams' || syncType === 'all') {
      if (!leagueFilter || leagueFilter === 'NHL') {
        const r = await syncTeamsForLeague('NHL', 'NHL');
        results.synced += r.synced;
        results.failed += r.failed;
        results.details.push(`NHL: ${r.synced} teams`);
        results.errors.push(...r.errors);
      }
    }

    results.apiCallsUsed = apiCallsToday;

    return NextResponse.json({
      message: 'NHL/NCAA sync completed',
      ...results,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'teams';
  const leagueName = searchParams.get('league');

  try {
    let query = supabaseAdmin.from('nhl_teams').select('*', { count: 'exact' });

    if (leagueName) {
      query = query.eq('league_name', leagueName);
    } else {
      query = query.eq('league_id', type === 'nhl' ? 'NHL' : 'NCAA');
    }

    const { data, count, error } = await query.order('name');

    if (error) throw error;

    return NextResponse.json({
      type,
      league: leagueName || 'all',
      count,
      teams: data?.map(t => ({ id: t.id, name: t.name, league_name: t.league_name })) || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}