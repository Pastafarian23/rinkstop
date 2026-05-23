// NHL/NCAAH Sync API Route
// Uses highlightly.net API (correct spelling: highlightly with 'y')
// Docs: https://highlightly.net/nhl-api/documentation/

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const HIGHLIGHTLY_API_KEY = process.env.HIGHLIGHTLY_API_KEY;

// Correct highlightly.net base URLs (NOT highantly.net)
const NHL_BASE_URL = 'https://nhl.highlightly.net';
const HOCKEY_BASE_URL = 'https://hockey.highlightly.net';

interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

let apiCallsToday = 0;

async function fetchHighlightly<T>(baseUrl: string, endpoint: string): Promise<T> {
  const url = `${baseUrl}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': HIGHLIGHTLY_API_KEY || '',
      'Content-Type': 'application/json',
    },
  });

  apiCallsToday++;

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`${response.status}: ${errText}`);
  }

  const json = await response.json();
  // May return { data: [...], ... } or just [...]
  if (json.data) return json.data as T;
  if (Array.isArray(json)) return json as T;
  throw new Error(`Unexpected response: ${JSON.stringify(json).slice(0, 100)}`);
}

async function syncNHLTeams(): Promise<SyncResult> {
  try {
    const teams = await fetchHighlightly<any[]>(NHL_BASE_URL, '/teams');
    
    // Filter to NHL teams only (league === "NHL")
    const nhlTeams = teams.filter((t: any) => t.league === 'NHL');
    
    console.log(`[NHL Sync] Found ${nhlTeams.length} NHL teams`);

    const results: SyncResult = { synced: 0, failed: 0, errors: [] };

    for (const team of nhlTeams) {
      try {
        const { error } = await supabaseAdmin
          .from('nhl_teams')
          .upsert({
            id: String(team.id),
            name: team.displayName || team.name,
            short_name: team.abbreviation,
            logo: team.logo,
            country_code: 'US',
            league_id: 'NHL',
            league_name: 'NHL',
            last_synced: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (error) throw error;
        results.synced++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`NHL Team ${team.id}: ${error.message}`);
      }
    }

    return results;
  } catch (error: any) {
    return { synced: 0, failed: 0, errors: [`NHL sync failed: ${error.message}`] };
  }
}

async function syncNCATeams(): Promise<SyncResult> {
  try {
    const teams = await fetchHighlightly<any[]>(NHL_BASE_URL, '/teams');
    
    // Filter to NCAA teams (league === "NCAA")
    const ncaaTeams = teams.filter((t: any) => t.league === 'NCAA');
    
    console.log(`[NHL Sync] Found ${ncaaTeams.length} NCAA teams`);

    const results: SyncResult = { synced: 0, failed: 0, errors: [] };

    for (const team of ncaaTeams) {
      try {
        const { error } = await supabaseAdmin
          .from('nhl_teams')
          .upsert({
            id: String(team.id),
            name: team.displayName || team.name,
            short_name: team.abbreviation,
            logo: team.logo,
            country_code: 'US',
            league_id: 'NCAA',
            league_name: 'NCAA',
            last_synced: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (error) throw error;
        results.synced++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`NCAA Team ${team.id}: ${error.message}`);
      }
    }

    return results;
  } catch (error: any) {
    return { synced: 0, failed: 0, errors: [`NCAA sync failed: ${error.message}`] };
  }
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
      // Sync NHL teams
      if (!leagueFilter || leagueFilter === 'NHL') {
        const r = await syncNHLTeams();
        results.synced += r.synced;
        results.failed += r.failed;
        results.details.push(`NHL: ${r.synced} teams`);
        results.errors.push(...r.errors);
      }

      // Sync NCAA teams
      if (!leagueFilter || leagueFilter === 'NCAA') {
        const r = await syncNCATeams();
        results.synced += r.synced;
        results.failed += r.failed;
        results.details.push(`NCAA: ${r.synced} teams`);
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