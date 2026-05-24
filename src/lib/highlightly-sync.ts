// Highantly Sync Service
// Syncs data from Highantly API to Supabase, with caching and rate limit management

import { supabaseAdmin } from './supabase';

const HIGHLIGHTLY_API_KEY = process.env.HIGHLIGHTLY_API_KEY;
const HIGHLIGHTLY_BASE_URL = 'https://hockey.highlightly.net';
const RAPIDAPI_HOST = 'hockey-highlights-api.p.rapidapi.com';

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  apiCallsUsed: number;
  errors: string[];
}

// Rate limiting - track API calls
let dailyApiCalls = 0;
let lastResetDate = new Date().toDateString();

function resetCounterIfNewDay() {
  if (new Date().toDateString() !== lastResetDate) {
    dailyApiCalls = 0;
    lastResetDate = new Date().toDateString();
  }
}

function canMakeApiCall(): boolean {
  resetCounterIfNewDay();
  return dailyApiCalls < 7400;
}

function recordApiCall() {
  resetCounterIfNewDay();
  dailyApiCalls++;
}

// Highantly API fetch helper
async function fetchHighantly<T>(endpoint: string, params?: Record<string, string>): Promise<T | null> {
  if (!canMakeApiCall()) {
    console.log('[Highantly Sync] Daily limit reached, skipping');
    return null;
  }

  if (!HIGHLIGHTLY_API_KEY) {
    console.log('[Highantly Sync] No API key configured');
    return null;
  }

  const url = new URL(`${HIGHLIGHTLY_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'x-rapidapi-key': HIGHLIGHTLY_API_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
      next: { revalidate: 0 },
    });

    recordApiCall();

    if (!response.ok) {
      throw new Error(`Highantly API error ${response.status}`);
    }

    const json = await response.json();
    return json.data ?? json;
  } catch (error: any) {
    console.error(`[Highantly Sync] Fetch failed for ${endpoint}:`, error.message);
    return null;
  }
}

// Sync leagues for a country
export async function syncLeaguesByCountry(countryCode: string): Promise<SyncResult> {
  const result: SyncResult = { success: true, synced: 0, failed: 0, apiCallsUsed: 0, errors: [] };

  const leagues = await fetchHighantly<any[]>(`/leagues?countryCode=${countryCode}&limit=20`);
  
  if (!leagues) {
    result.success = false;
    result.errors.push(`Failed to fetch leagues for ${countryCode}`);
    return result;
  }

  result.apiCallsUsed++;

  for (const league of leagues) {
    try {
      const { error } = await supabaseAdmin
        .from('highlightly_leagues')
        .upsert({
          id: String(league.id),
          name: league.name,
          country_code: league.country?.code || countryCode,
          country_name: league.country?.name,
          logo: league.logo,
          seasons: league.seasons?.map((s: any) => s.season),
          last_synced: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;
      result.synced++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`League ${league.id}: ${error.message}`);
    }
  }

  return result;
}

// Sync teams for a league
export async function syncTeamsByLeague(leagueId: string): Promise<SyncResult> {
  const result: SyncResult = { success: true, synced: 0, failed: 0, apiCallsUsed: 0, errors: [] };

  const teams = await fetchHighantly<any[]>(`/teams?leagueId=${leagueId}&limit=50`);
  
  if (!teams) {
    result.success = false;
    result.errors.push(`Failed to fetch teams for league ${leagueId}`);
    return result;
  }

  result.apiCallsUsed++;

  for (const team of teams) {
    try {
      await supabaseAdmin
        .from('highlightly_teams')
        .upsert({
          id: String(team.id),
          name: team.name,
          short_name: team.shortName,
          logo: team.logo,
          country_code: team.country?.code || team.countryCode,
          league_id: String(leagueId),
          league_name: team.leagueName || team.league?.name,
          last_synced: new Date().toISOString(),
        }, { onConflict: 'id' });

      result.synced++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Team ${team.id}: ${error.message}`);
    }
  }

  return result;
}

// Sync standings for a league
export async function syncStandingsByLeague(leagueId: string, leagueName: string): Promise<SyncResult> {
  const result: SyncResult = { success: true, synced: 0, failed: 0, apiCallsUsed: 0, errors: [] };

  const standings = await fetchHighantly<any[]>(`/standings?leagueId=${leagueId}&limit=30`);
  
  if (!standings) {
    result.success = false;
    result.errors.push(`Failed to fetch standings for league ${leagueId}`);
    return result;
  }

  result.apiCallsUsed++;

  for (const entry of standings) {
    try {
      const teamData = entry.team || entry;
      const teamId = entry.team?.id || entry.teamId || entry.id;
      const teamName = entry.team?.name || entry.teamName || entry.name;

      await supabaseAdmin
        .from('highlightly_standings')
        .upsert({
          id: `${leagueId}-${teamId}-${entry.season || 'current'}`,
          league_id: String(leagueId),
          league_name: leagueName,
          season: entry.season || '2025',
          rank: entry.rank || entry.position,
          team_id: String(teamId),
          team_name: teamName,
          team_logo: entry.team?.logo,
          played: entry.played || entry.games,
          wins: entry.wins,
          losses: entry.losses,
          overtime_losses: entry.overtimeLosses || entry.otLosses || 0,
          points: entry.points || entry.pts,
          goals_for: entry.goalsFor || entry.gf,
          goals_against: entry.goalsAgainst || entry.ga,
          last_synced: new Date().toISOString(),
        }, { onConflict: 'id' });

      result.synced++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Standing entry: ${error.message}`);
    }
  }

  return result;
}

// Sync matches for a league
export async function syncMatchesByLeague(leagueId: string, limit: number = 10): Promise<SyncResult> {
  const result: SyncResult = { success: true, synced: 0, failed: 0, apiCallsUsed: 0, errors: [] };

  const matches = await fetchHighantly<any[]>(`/matches?leagueId=${leagueId}&limit=${limit}`);
  
  if (!matches) {
    result.success = false;
    result.errors.push(`Failed to fetch matches for league ${leagueId}`);
    return result;
  }

  result.apiCallsUsed++;

  for (const match of matches) {
    try {
      await supabaseAdmin
        .from('highlightly_matches')
        .upsert({
          id: String(match.id),
          date: match.date,
          status: match.state?.description || match.status,
          home_team_id: String(match.homeTeam?.id || match.homeTeamId),
          home_team_name: match.homeTeam?.name || match.homeTeamName,
          home_team_logo: match.homeTeam?.logo,
          away_team_id: String(match.awayTeam?.id || match.awayTeamId),
          away_team_name: match.awayTeam?.name || match.awayTeamName,
          away_team_logo: match.awayTeam?.logo,
          home_score: match.state?.score?.current?.split(' - ')[0],
          away_score: match.state?.score?.current?.split(' - ')[1],
          period: match.state?.clock || match.period,
          league_id: String(match.league?.id || match.leagueId || leagueId),
          league_name: match.league?.name || match.leagueName,
          country_code: match.country?.code || match.countryCode,
          venue: match.venue,
          last_synced: new Date().toISOString(),
        }, { onConflict: 'id' });

      result.synced++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Match ${match.id}: ${error.message}`);
    }
  }

  return result;
}

// Log sync operation
async function logSync(type: string, entityId: string, action: string, details: any, apiCalls: number) {
  try {
    await supabaseAdmin
      .from('highlightly_sync_log')
      .insert({
        entity_type: type,
        entity_id: entityId,
        action,
        details,
        api_calls_used: apiCalls,
      });
  } catch (error) {
    console.error('[Highantly Sync] Failed to log sync:', error);
  }
}

// Master sync function - sync all data for a league
export async function syncLeagueFull(leagueId: string, leagueName: string): Promise<SyncResult> {
  const result: SyncResult = { success: true, synced: 0, failed: 0, apiCallsUsed: 0, errors: [] };

  const teamsResult = await syncTeamsByLeague(leagueId);
  result.apiCallsUsed += teamsResult.apiCallsUsed;
  result.synced += teamsResult.synced;
  result.failed += teamsResult.failed;
  result.errors.push(...teamsResult.errors);

  const standingsResult = await syncStandingsByLeague(leagueId, leagueName);
  result.apiCallsUsed += standingsResult.apiCallsUsed;
  result.synced += standingsResult.synced;
  result.failed += standingsResult.failed;
  result.errors.push(...standingsResult.errors);

  const matchesResult = await syncMatchesByLeague(leagueId, 10);
  result.apiCallsUsed += matchesResult.apiCallsUsed;
  result.synced += matchesResult.synced;
  result.failed += matchesResult.failed;
  result.errors.push(...matchesResult.errors);

  logSync('league', leagueId, 'full_sync', { result }, result.apiCallsUsed);

  return result;
}

// Get cached data from Supabase
export async function getCachedLeagues(countryCode?: string) {
  let query = supabaseAdmin.from('highlightly_leagues').select('*');
  if (countryCode) {
    query = query.eq('country_code', countryCode);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getCachedStandings(leagueId: string) {
  const { data, error } = await supabaseAdmin
    .from('highlightly_standings')
    .select('*')
    .eq('league_id', String(leagueId))
    .order('rank');
  if (error) throw error;
  return data;
}

export async function getCachedMatches(leagueId: string, limit: number = 10) {
  const { data, error } = await supabaseAdmin
    .from('highlightly_matches')
    .select('*')
    .eq('league_id', String(leagueId))
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getCachedTeams(leagueId: string) {
  const { data, error } = await supabaseAdmin
    .from('highlightly_teams')
    .select('*')
    .eq('league_id', String(leagueId))
    .order('name');
  if (error) throw error;
  return data;
}

// Check if cache is stale
export function isCacheStale(lastSynced: string, maxAgeHours: number): boolean {
  const lastSyncDate = new Date(lastSynced);
  const now = new Date();
  const hoursSinceSync = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);
  return hoursSinceSync > maxAgeHours;
}