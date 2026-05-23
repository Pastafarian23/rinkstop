// NHL/NCAAH Sync API Route
// POST /api/nhl/sync - triggers sync of NCAA and NHL teams from Highantly
// GET /api/nhl/sync?type=teams - check sync status

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const HIGHLIGHTLY_API_KEY = process.env.HIGHLIGHTLY_API_KEY;

// Exactly as user specified
const HOCKEY_BASE_URL = 'https://hockey.highantly.net';
const NHL_BASE_URL = 'https://nhl.highantly.net';

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

async function fetchFromHighantly(baseUrl: string, endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${baseUrl}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
  });

  console.log(`[NHL Sync] Fetching: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    headers: {
      'X-API-Key': HIGHLIGHTLY_API_KEY || '',
      'Content-Type': 'application/json',
    },
  });

  apiCallsToday++;

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`${response.status}: ${errText}`);
  }

  const json = await response.json();
  return json.data ?? json;
}

async function syncTeamsForLeague(leagueId: string, leagueName: string): Promise<SyncResult> {
  let teams: any;
  let lastError = '';

  // Try hockey.highantly.net first (user specified this as working for other hockey data)
  for (const baseUrl of [HOCKEY_BASE_URL, NHL_BASE_URL]) {
    try {
      console.log(`[NHL Sync] Trying ${baseUrl} for ${leagueName}`);
      teams = await fetchFromHighantly(baseUrl, '/teams', { leagueName, limit: '50' });
      console.log(`[NHL Sync] Success with ${baseUrl}: ${Array.isArray(teams) ? teams.length + ' teams' : teams}`);
      break;
    } catch (error: any) {
      lastError = `${baseUrl}: ${error.message}`;
      console.log(`[NHL Sync] Failed ${baseUrl}: ${error.message}`);
    }
  }

  if (!teams) {
    return { synced: 0, failed: 0, errors: [`${leagueName}: All endpoints failed. Last error: ${lastError}`] };
  }

  if (!Array.isArray(teams)) {
    return { synced: 0, failed: 0, errors: [`${leagueName}: Response was not an array: ${JSON.stringify(teams)?.slice(0, 100)}`] };
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

    return NextResponse.json({ message: 'NHL/NCAA sync completed', ...results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leagueName = searchParams.get('league');

  try {
    let query = supabaseAdmin.from('nhl_teams').select('*', { count: 'exact' });
    if (leagueName) query = query.eq('league_name', leagueName);
    else query = query.eq('league_id', 'NCAA');

    const { data, count, error } = await query.order('name');
    if (error) throw error;

    return NextResponse.json({
      count,
      teams: data?.map((t: any) => ({ id: t.id, name: t.name, league_name: t.league_name })) || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}