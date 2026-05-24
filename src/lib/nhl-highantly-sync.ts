// NHL & NCAAH Highlightly Sync Service
// Base URL: https://nhl.highantly.net (per official docs)
// RapidAPI host: nhl-ncaah-api.p.rapidapi.com

import { supabaseAdmin } from './supabase';

const HIGHLIGHTLY_API_KEY = process.env.HIGHLIGHTLY_API_KEY;
const NHL_BASE_URL = 'https://nhl.highantly.net';
const RAPIDAPI_HOST = 'nhl-ncaah-api.p.rapidapi.com';

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  apiCallsUsed: number;
  errors: string[];
}

// Rate limiting
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
  return dailyApiCalls < 7500;
}

function recordApiCall() {
  resetCounterIfNewDay();
  dailyApiCalls++;
}

interface NHLApiResponse {
  data?: any[];
  [key: string]: any;
}

// Fetch from NHL/NCAAH API
async function fetchNHL<T>(endpoint: string, params?: Record<string, string>): Promise<T | null> {
  if (!canMakeApiCall()) {
    console.log('[NHL Sync] Daily limit reached, skipping');
    return null;
  }

  if (!HIGHLIGHTLY_API_KEY) {
    console.log('[NHL Sync] No API key configured');
    return null;
  }

  const url = new URL(`${NHL_BASE_URL}${endpoint}`);
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
      throw new Error(`NHL API error ${response.status}: ${await response.text()}`);
    }

    const json = await response.json();
    return json.data ?? json;
  } catch (error: any) {
    console.error(`[NHL Sync] Fetch failed for ${endpoint}:`, error.message);
    return null;
  }
}

// NCAA Conferences
export const NCAA_CONFERENCES = [
  { name: 'Hockey East', abbr: 'HE' },
  { name: 'Big Ten', abbr: 'BIG10' },
  { name: 'NCHC', abbr: 'NCHC' },
  { name: 'ECAC', abbr: 'ECAC' },
  { name: 'WCHA', abbr: 'WCHA' },
  { name: 'CCHA', abbr: 'CCHA' },
  { name: 'College Hockey America', abbr: 'CHA' },
  { name: 'Metro Atlantic Athletic Conference', abbr: 'MAAC' },
  { name: 'Northeast 10 Conference', abbr: 'NE10' },
  { name: 'West Coast Conference', abbr: 'WCC' },
];

// Sync NCAA teams by conference name
export async function syncNCATeamsByConference(conferenceName: string): Promise<SyncResult> {
  const result: SyncResult = { success: true, synced: 0, failed: 0, apiCallsUsed: 0, errors: [] };

  console.log(`[NHL Sync] Fetching NCAA teams for conference: ${conferenceName}`);

  const teams = await fetchNHL<any[]>(`/teams?leagueName=${encodeURIComponent(conferenceName)}&limit=50`);

  if (!teams) {
    result.success = false;
    result.errors.push(`Failed to fetch teams for ${conferenceName}`);
    return result;
  }

  result.apiCallsUsed++;

  if (!Array.isArray(teams)) {
    result.errors.push(`Unexpected response for ${conferenceName}: ${JSON.stringify(teams).slice(0, 100)}`);
    return result;
  }

  console.log(`[NHL Sync] Found ${teams.length} teams for ${conferenceName}`);

  for (const team of teams) {
    try {
      const teamData = {
        id: String(team.id),
        name: team.name || team.displayName,
        short_name: team.abbreviation || team.shortName,
        logo: team.logo,
        country_code: 'US',
        league_id: 'NCAA',
        league_name: conferenceName,
        last_synced: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from('nhl_teams')
        .upsert(teamData, { onConflict: 'id' });

      if (error) throw error;
      result.synced++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`NCAA Team ${team.id}: ${error.message}`);
    }
  }

  return result;
}

// Sync all NCAA conferences
export async function syncAllNCAA(): Promise<SyncResult> {
  const combined: SyncResult = { success: true, synced: 0, failed: 0, apiCallsUsed: 0, errors: [] };

  for (const conf of NCAA_CONFERENCES) {
    console.log(`[NHL Sync] Syncing NCAA: ${conf.name}`);
    const r = await syncNCATeamsByConference(conf.name);
    combined.synced += r.synced;
    combined.failed += r.failed;
    combined.apiCallsUsed += r.apiCallsUsed;
    combined.errors.push(...r.errors);
    if (!r.success) combined.success = false;
  }

  return combined;
}

// Sync NHL teams
export async function syncNHLTeams(): Promise<SyncResult> {
  const result: SyncResult = { success: true, synced: 0, failed: 0, apiCallsUsed: 0, errors: [] };

  console.log('[NHL Sync] Fetching NHL teams');

  const teams = await fetchNHL<any[]>(`/teams?leagueName=NHL&limit=50`);

  if (!teams) {
    result.success = false;
    result.errors.push('Failed to fetch NHL teams');
    return result;
  }

  result.apiCallsUsed++;

  if (!Array.isArray(teams)) {
    result.errors.push(`Unexpected NHL teams response: ${JSON.stringify(teams).slice(0, 200)}`);
    return result;
  }

  console.log(`[NHL Sync] Found ${teams.length} NHL teams`);

  for (const team of teams) {
    try {
      const teamData = {
        id: String(team.id),
        name: team.name || team.displayName,
        short_name: team.abbreviation || team.shortName,
        logo: team.logo,
        country_code: 'US',
        league_id: 'NHL',
        league_name: 'NHL',
        last_synced: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from('nhl_teams')
        .upsert(teamData, { onConflict: 'id' });

      if (error) throw error;
      result.synced++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`NHL Team ${team.id}: ${error.message}`);
    }
  }

  return result;
}

// Sync NCAA or NHL standings
export async function syncStandingsByLeague(leagueName: string): Promise<SyncResult> {
  const result: SyncResult = { success: true, synced: 0, failed: 0, apiCallsUsed: 0, errors: [] };

  const standings = await fetchNHL<any[]>(`/standings?leagueName=${encodeURIComponent(leagueName)}&limit=50`);

  if (!standings) {
    result.success = false;
    result.errors.push(`Failed to fetch standings for ${leagueName}`);
    return result;
  }

  result.apiCallsUsed++;

  if (!Array.isArray(standings)) {
    result.errors.push(`Unexpected standings response for ${leagueName}`);
    return result;
  }

  console.log(`[NHL Sync] ${standings.length} standings entries for ${leagueName}`);

  for (const entry of standings) {
    try {
      const teamData = entry.team || entry;
      const standingData = {
        id: `${leagueName}-${teamData.id}-${entry.season || 'current'}`,
        league_id: 'NCAA',
        league_name: leagueName,
        season: entry.season || '2024-2025',
        rank: entry.rank || entry.position,
        team_id: String(teamData.id),
        team_name: teamData.name || teamData.displayName,
        team_logo: teamData.logo,
        played: entry.played || entry.games,
        wins: entry.wins,
        losses: entry.losses,
        overtime_losses: entry.overtimeLosses || entry.otLosses || 0,
        points: entry.points || entry.pts,
        goals_for: entry.goalsFor || entry.gf,
        goals_against: entry.goalsAgainst || entry.ga,
        last_synced: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from('nhl_standings')
        .upsert(standingData, { onConflict: 'id' });

      if (error) throw error;
      result.synced++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Standing entry: ${error.message}`);
    }
  }

  return result;
}

// Sync matches for a league
export async function syncMatchesByLeague(leagueName: string, limit: number = 20): Promise<SyncResult> {
  const result: SyncResult = { success: true, synced: 0, failed: 0, apiCallsUsed: 0, errors: [] };

  const matches = await fetchNHL<any[]>(`/matches?leagueName=${encodeURIComponent(leagueName)}&limit=${limit}`);

  if (!matches) {
    result.success = false;
    result.errors.push(`Failed to fetch matches for ${leagueName}`);
    return result;
  }

  result.apiCallsUsed++;

  if (!Array.isArray(matches)) {
    result.errors.push(`Unexpected matches response for ${leagueName}`);
    return result;
  }

  console.log(`[NHL Sync] ${matches.length} matches for ${leagueName}`);

  for (const match of matches) {
    try {
      const matchData = {
        id: String(match.id),
        date: match.date,
        status: match.state?.description || match.report || 'scheduled',
        home_team_id: String(match.homeTeam?.id),
        home_team_name: match.homeTeam?.name || match.homeTeam?.displayName,
        home_team_logo: match.homeTeam?.logo,
        away_team_id: String(match.awayTeam?.id),
        away_team_name: match.awayTeam?.name || match.awayTeam?.displayName,
        away_team_logo: match.awayTeam?.logo,
        home_score: match.state?.score?.current?.split(' - ')[0],
        away_score: match.state?.score?.current?.split(' - ')[1],
        period: match.state?.period,
        clock: match.state?.clock,
        league_name: leagueName,
        venue: match.venue?.name,
        last_synced: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from('nhl_matches')
        .upsert(matchData, { onConflict: 'id' });

      if (error) throw error;
      result.synced++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Match ${match.id}: ${error.message}`);
    }
  }

  return result;
}

// Full NCAA sync - teams + standings + recent matches
export async function syncNCAAFull(): Promise<SyncResult> {
  const combined: SyncResult = { success: true, synced: 0, failed: 0, apiCallsUsed: 0, errors: [] };

  // 1. Sync all NCAA conference teams
  const teamsResult = await syncAllNCAA();
  combined.synced += teamsResult.synced;
  combined.failed += teamsResult.failed;
  combined.apiCallsUsed += teamsResult.apiCallsUsed;
  combined.errors.push(...teamsResult.errors);

  // 2. Sync standings for each conference
  for (const conf of NCAA_CONFERENCES) {
    const r = await syncStandingsByConference(conf.name);
    combined.synced += r.synced;
    combined.failed += r.failed;
    combined.apiCallsUsed += r.apiCallsUsed;
    combined.errors.push(...r.errors);
  }

  return combined;
}

// Sync standings for a specific conference
export async function syncStandingsByConference(conferenceName: string): Promise<SyncResult> {
  const result: SyncResult = { success: true, synced: 0, failed: 0, apiCallsUsed: 0, errors: [] };

  const standings = await fetchNHL<any[]>(`/standings?leagueName=${encodeURIComponent(conferenceName)}&limit=50`);

  if (!standings) {
    result.success = false;
    result.errors.push(`Failed to fetch standings for ${conferenceName}`);
    return result;
  }

  result.apiCallsUsed++;

  if (!Array.isArray(standings)) {
    return result;
  }

  for (const entry of standings) {
    try {
      const teamData = entry.team || entry;
      const standingData = {
        id: `${conferenceName}-${teamData.id}-${entry.season || '2024-25'}`,
        league_name: conferenceName,
        season: entry.season || '2024-25',
        rank: entry.rank || entry.position,
        team_id: String(teamData.id),
        team_name: teamData.name || teamData.displayName,
        team_logo: teamData.logo,
        played: entry.played || entry.games,
        wins: entry.wins,
        losses: entry.losses,
        overtime_losses: entry.overtimeLosses || 0,
        points: entry.points || entry.pts,
        goals_for: entry.goalsFor,
        goals_against: entry.goalsAgainst,
        last_synced: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from('nhl_standings')
        .upsert(standingData, { onConflict: 'id' });

      if (error) throw error;
      result.synced++;
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Standing ${conferenceName}: ${error.message}`);
    }
  }

  return result;
}

// Sync NCAA matches for all conferences
export async function syncAllNCAMatches(): Promise<SyncResult> {
  const combined: SyncResult = { success: true, synced: 0, failed: 0, apiCallsUsed: 0, errors: [] };

  for (const conf of NCAA_CONFERENCES) {
    const r = await syncMatchesByLeague(conf.name, 20);
    combined.synced += r.synced;
    combined.failed += r.failed;
    combined.apiCallsUsed += r.apiCallsUsed;
    combined.errors.push(...r.errors);
  }

  return combined;
}

// Log sync
async function logSync(type: string, entityId: string, action: string, details: any, apiCalls: number) {
  try {
    await supabaseAdmin
      .from('nhl_sync_log')
      .insert({
        entity_type: type,
        entity_id: entityId,
        action,
        details,
        api_calls_used: apiCalls,
      });
  } catch (error) {
    console.error('[NHL Sync] Failed to log sync:', error);
  }
}

// Get cached NCAA teams
export async function getCachedNCATeams(conferenceName?: string) {
  let query = supabaseAdmin.from('nhl_teams').select('*').eq('league_id', 'NCAA');
  if (conferenceName) {
    query = query.eq('league_name', conferenceName);
  }
  const { data, error } = await query.order('name');
  if (error) throw error;
  return data;
}

// Get cached NHL teams
export async function getCachedNHLTeams() {
  const { data, error } = await supabaseAdmin
    .from('nhl_teams')
    .select('*')
    .eq('league_id', 'NHL')
    .order('name');
  if (error) throw error;
  return data;
}

// Get cached standings
export async function getCachedStandings(leagueName: string) {
  const { data, error } = await supabaseAdmin
    .from('nhl_standings')
    .select('*')
    .eq('league_name', leagueName)
    .order('rank');
  if (error) throw error;
  return data;
}

// Check if cache is stale
export function isCacheStale(lastSynced: string, maxAgeHours: number): boolean {
  const lastSyncDate = new Date(lastSynced);
  const hoursSinceSync = (new Date().getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);
  return hoursSinceSync > maxAgeHours;
}