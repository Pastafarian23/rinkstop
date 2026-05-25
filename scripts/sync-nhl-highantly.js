/**
 * NHL & NCAAH Data Sync Script
 * Syncs NCAA and NHL teams from Highlightly API to Supabase
 * 
 * Usage: node scripts/sync-nhl-highlightly.js [--dry-run]
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SB_KEY = '***REMOVED***';
const HIGHLIGHTLY_API_KEY = '***REMOVED***';

// NHL API base URL per official docs
const NHL_BASE_URL = 'https://nhl.highlightly.net';
const RAPIDAPI_HOST = 'nhl-ncaah-api.p.rapidapi.com';

const supabase = createClient(SUPABASE_URL, SB_KEY);

// NCAA Conferences to sync
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

// Rate limiting
let apiCallsToday = 0;
const MAX_DAILY_CALLS = 7400;

async function fetchNHL(endpoint, params = {}) {
  if (apiCallsToday >= MAX_DAILY_CALLS) {
    console.log('[NHL Sync] Daily limit reached');
    return null;
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
    console.error(`[NHL Sync] API error ${response.status} for ${endpoint}`);
    return null;
  }

  const json = await response.json();
  return json.data ?? json;
}

async function upsertTeam(team, leagueId, leagueName) {
  const { error } = await supabase
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

  if (error) {
    console.error(`[NHL Sync] Failed to upsert team ${team.id}:`, error.message);
  }
  return !error;
}

async function syncNCATeamsForConference(confName) {
  console.log(`[NHL Sync] Fetching NCAA teams: ${confName}`);
  
  const teams = await fetchNHL('/teams', {
    leagueName: confName,
    limit: 50,
  });

  if (!teams || !Array.isArray(teams)) {
    console.log(`[NHL Sync] No teams returned for ${confName}`);
    return 0;
  }

  console.log(`[NHL Sync] Found ${teams.length} teams for ${confName}`);

  let synced = 0;
  for (const team of teams) {
    const ok = await upsertTeam(team, 'NCAA', confName);
    if (ok) synced++;
  }

  return synced;
}

async function syncNHLTeams() {
  console.log('[NHL Sync] Fetching NHL teams');
  
  const teams = await fetchNHL('/teams', {
    leagueName: 'NHL',
    limit: 50,
  });

  if (!teams || !Array.isArray(teams)) {
    console.log('[NHL Sync] No NHL teams returned');
    return 0;
  }

  console.log(`[NHL Sync] Found ${teams.length} NHL teams`);

  let synced = 0;
  for (const team of teams) {
    const ok = await upsertTeam(team, 'NHL', 'NHL');
    if (ok) synced++;
  }

  return synced;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('[NHL Sync] Starting NHL/NCAA sync from Highlightly');
  console.log(`[NHL Sync] API calls today: ${apiCallsToday}`);

  // Sync all NCAA conferences
  let totalSynced = 0;
  for (const conf of NCAA_CONFERENCES) {
    const count = await syncNCATeamsForConference(conf);
    totalSynced += count;
    console.log(`[NHL Sync] Synced ${count} teams for ${conf}`);
    await new Promise(r => setTimeout(r, 500)); // Rate limit protection
  }

  // Sync NHL teams
  const nhlCount = await syncNHLTeams();
  totalSynced += nhlCount;
  console.log(`[NHL Sync] Synced ${nhlCount} NHL teams`);

  console.log(`[NHL Sync] Complete! Total: ${totalSynced} teams, API calls: ${apiCallsToday}`);

  if (dryRun) {
    console.log('[NHL Sync] DRY RUN - no changes committed');
  }
}

main().catch(console.error);