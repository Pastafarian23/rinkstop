// NHL/NCAAH Sync API Route
// POST /api/nhl/sync - triggers sync of NCAA and NHL teams from Highantly
// GET /api/nhl/sync?type=teams|standings|matches - check sync status

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const HIGHLIGHTLY_API_KEY = process.env.HIGHLIGHTLY_API_KEY;

// NHL/NCAA API - uses direct highlightly.net with X-API-Key auth
const NHL_BASE_URL = 'https://nhl.highantly.net';

// Fallback: RapidAPI NHL endpoint
const RAPIDAPI_URL = 'https://nhl-ncaah-api.p.rapidapi.com';
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

interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

let apiCallsToday = 0;

// Try direct highlightly.net first (user subscribed directly to highlightly, not RapidAPI)
async function fetchNHLDirect(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${NHL_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.append(k, String(v));
      }
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      'X-API-Key': HIGHLIGHTLY_API_KEY || '',
      'Content-Type': 'application/json',
    },
  });

  apiCallsToday++;

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Direct error ${response.status}: ${errText}`);
  }

  const json = await response.json();
  return json.data ?? json;
}

// Fallback to RapidAPI
async function fetchNHLRapidAPI(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${RAPIDAPI_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.append(k, String(v));
      }
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      'x-rapidapi-key': HIGHLIGHTLY_API_KEY || '',
      'x-rapidapi-host': RAPIDAPI_HOST,
    },
  });

  apiCallsToday++;

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`RapidAPI error ${response.status}: ${errText}`);
  }

  const json = await response.json();
  return json.data ?? json;
}

async function syncTeamsForLeague(leagueId: string, leagueName: string): Promise<SyncResult> {
  let teams: any;

  // Try direct first, then RapidAPI fallback
  try {
    teams = await fetchNHLDirect('/teams', { leagueName, limit: '50' });
  } catch (directErr) {
    console.log(`[NHL Sync] Direct failed for ${leagueName}, trying RapidAPI: ${directErr}`);
    try {
      teams = await fetchNHLRapidAPI('/teams', { leagueName, limit: '50' });
    } catch (rapidErr) {
      return { synced: 0, failed: 0, errors: [`${leagueName}: Direct (${directErr}), RapidAPI (${rapidErr})`] };
    }
  }

  if (!teams || !Array.isArray(teams)) {
    return { synced: 0, failed: 0, errors: [`No teams for ${leagueName}: ${JSON.stringify(teams)?.slice(0, 100)}`] };
  }

  const results: SyncResult = { synced: 0, failed: 0, errors: [] };

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
    } catch (error: any) {
      results.failed++;
      results.errors.push(`Team ${team.id}: ${error.message}`);
    }
  }

  return results;
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const syncType = searchParams.get('type') || 'teams';
    const leagueFilter = searchParams.get('league');

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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
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
      teams: data?.map((t: any) => ({ id: t.id, name: t.name, league_name: t.league_name })) || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}