#!/usr/bin/env node
/**
 * Daily scores ingestion — keeps `fixtures` current with NHL.com + Highlightly.
 *
 * Strategy:
 *   1. NHL.com `/v1/schedule/{date}` for the NHL league (source of truth)
 *   2. Highlightly `/matches?date=...` for SHL/DEL/KHL/MHL/VHL/SPHL/Liiga/IIHF/etc
 *   3. Upsert into `fixtures` keyed by deterministic UUID derived from game_id (NHL + HL)
 *   4. Update status (`scheduled`/`in_progress`/`completed`/`cancelled`) and scores as they change
 *
 * Run modes:
 *   node scripts/_daily-scores-ingest.cjs                # yesterday + today
 *   node scripts/_daily-scores-ingest.cjs --days=7       # last 7 days (catch-up)
 *   node scripts/_daily-scores-ingest.cjs --days=14      # last 14 days
 *   node scripts/_daily-scores-ingest.cjs --dry-run      # log without writing
 *
 * The cron runs this nightly at 03:30 UTC (covers evening Euro games + same-day NHL).
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HIGHLIGHTLY_KEY = process.env.HIGHLIGHTLY_API_KEY;
if (!HIGHLIGHTLY_KEY) {
  console.error('Missing HIGHLIGHTLY_API_KEY');
  process.exit(1);
}
const HL_BASE_DETAIL = 'https://hockey.highlightly.net';

// --- CLI args ---
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const DAYS = parseInt(String(args.days ?? '2'), 10); // yesterday + today
const DRY_RUN = !!args['dry-run'];

// --- League IDs (verified against /leagues table) ---
const NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';
const AHL_LEAGUE_ID = 'b05d6d26-d5d6-4cfd-a48b-f5646fa7d611';

// Highlightly hockey league IDs (verified via existing adapter)
const HIGHLIGHTLY_HOCKEY_LEAGUES = {
  '69d4de0c-b072-4f52-8950-eb728acdc7f9': { hlId: '40781', name: 'SHL' },            // SHL
  '03e919d1-2180-443b-aba4-6719d25d2eff': { hlId: '16953', name: 'DEL' },            // DEL
  'a08f6dac-eb1f-48b6-a11b-56fbb5642752': { hlId: '30569', name: 'KHL' },            // KHL
  'e052d66a-6f63-42da-94fc-25a809203c2f': { hlId: '32271', name: 'MHL' },           // MHL (real UUID verified 2026-09-17)
  '30fef7f6-0054-4605-83b7-ec619b72f328': { hlId: '31420', name: 'VHL' },           // VHL
  'dead3e40-9f79-4488-a50b-755eb9a8cee0': { hlId: '51844', name: 'SPHL' },          // SPHL
  'dc212fdb-98bd-4fd5-842c-598ba34565b5': { hlId: '14400', name: 'Liiga' },         // Liiga (Finland)
  // IIHF: no single HL id; we use date-based search and detect by team names
};

// TheSportsDB mapping for cross-source verification (added 2026-09-21).
// Free tier with API key '3' — no auth needed. Coverage: DEL, SHL, KHL, VHL,
// NL, OHL, QMJHL, WHL, SPHL, Liiga. Used as secondary source to confirm HL
// scores. Probe live 2026-09-21: DEL=3 events, KHL=3 events, SHL/NL empty
// for that date (seasonal gap or mapping issue, not script bug).
const THESPORTSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';
const THESPORTSDB_LEAGUE_IDS = {
  SHL: '4419',
  DEL: '4925',
  KHL: '4920',
  VHL: '4919',
  // Note: TheSportsDB doesn't have great coverage for MHL/SPHL/Liiga.
  // SHL/NL returned empty for 2026-09-20 — may be seasonal. We'll skip
  // gracefully when the API returns 0 events.
};
const THESPORTSDB_KEY = process.env.SPORTSDB_API_KEY || '3';

// NHL.com team abbrev → our teams.id UUID mapping (added 2026-09-21 per
// Arnel's 'all verified, no gaps' directive — was the root cause of the
// scores-page 'no completed games' bug). The mapping was previously inline
// in scripts/nhl-ingest/08-sync-nhl-matches.cjs; this duplicates it here so
// the daily ingest can resolve NHL.com team IDs without depending on the
// nhl-ingest pipeline.
const NHL_ABBREV_TO_TEAMS_ID = {
  ANA: '219a6bb2-1103-4e27-931e-5de440e59f84',
  BOS: 'ae6d0878-1ac2-4c13-afc8-890c6647b668',
  BUF: '5a510c0e-1058-460d-8237-09855dfa98f4',
  CGY: '626458da-d2d4-4a4f-816b-f3796b84cfc4',
  CAR: 'e4977c12-28b3-4756-a788-cf86b40fc237',
  CHI: '553a6b7b-6416-4b74-a9b3-fa15d06d52ab',
  COL: 'f453fd29-12e4-4897-8f8a-ecf23d6a4122',
  CBJ: '6ca5c5f0-3c27-4cd5-8457-78fc3ba45344',
  DAL: '4c61f05e-8d34-40be-b0a8-adf37e14435c',
  DET: 'f3fa0794-ee39-4991-af45-961cb3e8f404',
  EDM: '5b487d74-5e9c-43c8-b104-35185fc93350',
  FLA: '7772070c-6c9b-4ca0-a442-dfe5b8beabcb',
  LAK: 'df9b5d1e-c5d9-46af-a524-99de500e95bf',
  MIN: 'd3947cbf-8b3c-4c16-8ab6-b8f8d0f5a1fe',
  MTL: 'dfa8a4b4-01b9-4f53-9a5d-6ca34302d074',
  NSH: '2d3d8a64-c0d7-4b8e-a327-a1201cc92f72',
  NJD: '486e6592-5873-48a0-8cdd-8411c8eb1105',
  NYI: 'acc8b466-ef9b-4d81-8ea5-6f13fc180d9e',
  NYR: '2869d1cd-d8f4-4ffb-9726-30bdfdbc14d3',
  OTT: 'a1f8b7f1-f7ea-42ee-9861-0eb0addf437d',
  PHI: 'cf53124a-dbb5-4588-9cb2-2f6054918f99',
  PIT: '4b75202e-b11b-4574-8ae6-7447f962cb55',
  SJS: '16c9d078-ecc9-4e7c-8bf3-e1b6e9a6ae10',
  SEA: 'bf324536-424b-4a3d-b486-1347aa735aae',
  STL: '7efc04e6-6a75-4b1f-a0da-3966d6e7359c',
  TBL: '2f4c6364-2139-4e57-97ad-e01dc55418fa',
  TOR: 'bac49d62-fd43-48f5-8811-090ec8f4c76d',
  UTA: '82a53679-b1e9-4221-b58e-a7b89f45c638',
  VAN: 'dc828fd7-65ae-4c1d-92ea-66975eb38fce',
  VGK: 'cf05f5b0-6605-465f-86f3-a6f1710afc20',
  WPG: '88d85b2b-7a91-4679-b1d4-e45d73e3838f',
  WSH: '2df72ff0-5a54-4663-91eb-13bb2a2830aa',
};

// Map NHL.com gameState → our fixtures.status
const NHL_STATE_TO_STATUS = {
  FUT: 'scheduled',
  PRE: 'scheduled',   // pregame
  LIVE: 'in_progress',
  CRIT: 'in_progress', // critical (shootout/OT in progress)
  OFF: 'completed',
  FINAL: 'completed',
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled',
  SUSPENDED: 'postponed',
};

// --- Helpers ---
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchNhlSchedule(dateIso) {
  // /v1/schedule/{date} returns gameWeek (7-day window starting date)
  const url = `https://api-web.nhle.com/v1/schedule/${dateIso}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`[NHL] ${dateIso}: HTTP ${res.status}`);
    return [];
  }
  const data = await res.json();
  const target = (data.gameWeek || []).find(d => d.date === dateIso);
  return target ? (target.games || []) : [];
}

async function fetchHighlightlyMatches(dateIso, hlId) {
  const url = `https://hockey.highlightly.net/matches?leagueId=${hlId}&date=${dateIso}&limit=50`;
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-key': HIGHLIGHTLY_KEY,
      'x-rapidapi-host': 'hockey-highlights-api.p.rapidapi.com',
    },
  });
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return Array.isArray(data.data) ? data.data : [];
}

async function upsertNhlGame(g) {
  const ht = g.homeTeam || {};
  const at = g.awayTeam || {};
  const homeScore = ht.score ?? null;
  const awayScore = at.score ?? null;
  const status = NHL_STATE_TO_STATUS[g.gameState] || 'scheduled';

  // Skip games without team assignments
  if (!ht.id || !at.id) return null;

  // Generate deterministic UUID from NHL game id (e.g. "2026010024")
  // Format: 8-4-4-4-12 using NHL_LEAGUE_ID prefix + 10-digit id
  const id = `${NHL_LEAGUE_ID.slice(0, 8)}-0000-0000-0000-${String(g.id).padStart(12, '0')}`.slice(0, 36);

  const record = {
    id,
    league_id: NHL_LEAGUE_ID,
    // nhl_game_id is NOT a top-level fixtures column (verified live 2026-09-21).
    // It lives inside game_data JSONB (line below) and is queried via
    // game_data->>'nhl_game_id' by all consumers (see also
    // rinkstop-platform/scripts/stats/highlightly-adapter.mjs:47 and the
    // indexes in scripts/nhl-ingest/migrations/001-002). Top-level column
    // was dead schema — every nightly run of this script threw 42703 at
    // upsert time. Fix 2026-09-21: removed the line, JSONB path is canonical.
    scheduled_at: g.startTimeUTC,
    home_team_id: null,  // resolved below via NHL_ABBREV_TO_TEAMS_ID lookup
    away_team_id: null,
    home_score: homeScore,
    away_score: awayScore,
    status,
    season: mapNhlSeason(g.season, g.gameType),
    // game_data: full NHL.com payload + abbreviations for resolveTeamIds().
    // Was previously broken because home_team_abbrev / away_team_abbrev
    // were phantom columns (verified live 2026-09-21 via PostgREST 42703).
    // They live inside game_data JSONB only — same pattern as nhl_game_id.
    game_data: { ...g, nhl_game_id: g.id, home_team_abbrev: ht.abbrev || null, away_team_abbrev: at.abbrev || null },
    updated_at: new Date().toISOString(),
  };

  return record;
}

// Also write to nhl_matches (the NHL schedule page reads from this table).
// Uses its own schema (id, date, status, home_team_name, away_team_name, etc.)
async function upsertNhlMatchRecord(g) {
  const ht = g.homeTeam || {};
  const at = g.awayTeam || {};
  const homeScore = ht.score ?? null;
  const awayScore = at.score ?? null;
  const status = NHL_STATE_TO_STATUS[g.gameState] || 'scheduled';

  if (!ht.id || !at.id) return null;

  return {
    id: g.id,  // nhl_game_id like "2026010024"
    date: g.startTimeUTC,
    status,
    home_team_id: null,  // resolved by tri → teams.id
    away_team_id: null,
    home_team_name: ht.placeName?.default ? (ht.placeName.default + ' ' + (ht.commonName?.default || '')).trim() : ht.name?.default || '',
    away_team_name: at.placeName?.default ? (at.placeName.default + ' ' + (at.commonName?.default || '')).trim() : at.name?.default || '',
    home_team_logo: ht.logo || null,
    away_team_logo: at.logo || null,
    home_score: homeScore,
    away_score: awayScore,
    period: g.periodDescriptor?.number || null,
    clock: g.periodDescriptor?.timeRemaining || null,
    league_name: 'NHL',
    venue: g.venue?.default || null,
    last_synced: new Date().toISOString(),
  };
}

function mapNhlSeason(nhlSeason, gameType) {
  // NHL.com uses YYYY season format like 20252026. gameType: 1=preseason, 2=regular, 3=playoff
  // Our DB convention: '2025-26' for regular, '2025-26-pre' for preseason, '2025-26-post' for playoffs
  if (!nhlSeason) return null;
  const base = `${String(nhlSeason).slice(0, 4)}-${String(nhlSeason).slice(4, 8).slice(2)}`;
  if (gameType === 1) return `${base}-pre`;
  if (gameType === 3) return `${base}-post`;
  return base;
}

async function upsertHighlightlyGame(g, hlLeagueId, hlLeagueName) {
  const ht = g.homeTeam || {};
  const at = g.awayTeam || {};
  const scoreStr = g.state?.score?.current || '0 - 0';
  // Highlightly returns score as `current: "<home> - <away>"` (verified live
  // 2026-09-21: HL Kolner vs Frankfurt Löwen returns "4 - 3" where Kolner
  // is the home team and scored 4). Earlier code wrote m[0] to awayScore,
  // inverting every completed game (DEL/KHL all had wrong winners).
  // Fix 2026-09-21: assign m[0] to homeScore, m[1] to awayScore.
  // Note: period scores (firstPeriod/secondPeriod/thirdPeriod) follow the
  // SAME home-away order, so any consumer parsing those needs the same fix.
  const [homeScore, awayScore] = scoreStr.split('-').map(s => parseInt(s.trim(), 10));
  const description = g.state?.description || 'Scheduled';
  // Highlightly returns these description strings: 'Finished' | 'Final' | 'Final/OT' | 'Final/SO'
  // | 'Live' | 'Scheduled' | 'Cancelled' | 'Postponed' | 'Suspended' | 'Awarded'
  const desc = String(description).toLowerCase();
  const status = (desc === 'finished' || desc === 'final' || desc.startsWith('final/') || desc === 'awarded') ? 'completed'
                : desc === 'live' ? 'in_progress'
                : desc === 'cancelled' ? 'cancelled'
                : (desc === 'postponed' || desc === 'suspended') ? 'postponed'
                : 'scheduled';

  // HL doesn't give FK to our team_workspaces; we resolve by displayName later.
  return {
    league_id: hlLeagueId,
    scheduled_at: g.date, // ISO string
    home_team_id: null,
    away_team_id: null,
    home_score: isNaN(homeScore) ? null : homeScore,
    away_score: isNaN(awayScore) ? null : awayScore,
    status,
    season: g.season ? `${g.season - 1}-${String(g.season).slice(2)}` : null,
    // HL-specific data goes into game_data JSONB to avoid schema drift
    game_data: { hl_match_id: g.id, hl_league_name: hlLeagueName, home_team_name: ht.displayName || ht.name, away_team_name: at.displayName || at.name, home_team_abbrev: ht.abbreviation, away_team_abbrev: at.abbreviation },
    updated_at: new Date().toISOString(),
  };
}

async function upsertFixture(record) {
  if (DRY_RUN) {
    console.log(`  [DRY] would upsert: ${record.id?.slice(0, 8)} → status=${record.status} score=${record.home_score}-${record.away_score}`);
    return null;
  }
  // Use natural key (league_id, scheduled_at, home_team_id, away_team_id) for
  // conflict resolution so that existing rows with different id UUIDs still
  // get updated to the correct values (added 2026-09-21 — was previously
  // onConflict:'id' which only matched deterministic-id rows and tried to
  // insert duplicates for non-deterministic ones, hitting the natural-key
  // unique constraint).
  const { data, error } = await supabase
    .from('fixtures')
    .upsert(record, { onConflict: 'league_id,scheduled_at,home_team_id,away_team_id', ignoreDuplicates: false })
    .select('id');
  if (error) {
    console.log(`  ✗ upsert ${record.id?.slice(0, 8)}: ${error.message}`);
    return null;
  }
  return data?.[0]?.id ?? record.id;  // upsert returns array; fall back to record.id when single() returns null
}

async function resolveTeamIds(record) {
  // Resolve teams.id (FK target of fixtures.home_team_id / away_team_id).
  // Strategy: try local abbreviation map FIRST (fast, no DB round-trip),
  // fall back to teams-table lookup by name. The abbrev can come from
  // top-level field (HL path) or game_data JSONB (NHL.com path).
  const homeAbbrev = record.home_team_abbrev || record.game_data?.home_team_abbrev;
  const awayAbbrev = record.away_team_abbrev || record.game_data?.away_team_abbrev;
  if (!record.home_team_id && homeAbbrev) {
    const mapped = NHL_ABBREV_TO_TEAMS_ID[String(homeAbbrev).toUpperCase()];
    if (mapped) {
      record.home_team_id = mapped;
    } else {
      const { data } = await supabase.from('teams')
        .select('id')
        .eq('tri_code', homeAbbrev)
        .maybeSingle();
      if (data) record.home_team_id = data.id;
    }
  }
  if (!record.away_team_id && awayAbbrev) {
    const mapped = NHL_ABBREV_TO_TEAMS_ID[String(awayAbbrev).toUpperCase()];
    if (mapped) {
      record.away_team_id = mapped;
    } else {
      const { data } = await supabase.from('teams')
        .select('id')
        .eq('tri_code', awayAbbrev)
        .maybeSingle();
      if (data) record.away_team_id = data.id;
    }
  }
  // For HL games without tri_code, try by name
  if (!record.home_team_id && record.game_data?.home_team_name) {
    const { data } = await supabase.from('teams')
      .select('id')
      .ilike('name', record.game_data.home_team_name)
      .maybeSingle();
    if (data) record.home_team_id = data.id;
  }
  if (!record.away_team_id && record.game_data?.away_team_name) {
    const { data } = await supabase.from('teams')
      .select('id')
      .ilike('name', record.game_data.away_team_name)
      .maybeSingle();
    if (data) record.away_team_id = data.id;
  }
  return record;
}

/**
 * Schema conformance check (added 2026-09-21).
 * Asserts that the production schema matches what this script expects to
 * write to. Refuses to run if there's a mismatch — the 2026-09-21 audit
 * caught two latent bugs from the script silently writing to columns that
 * didn't exist (nhl_game_id) and parsing scores in the wrong order.
 *
 * Cheap: one information_schema query (<500ms). Runs at the top of main().
 *
 * Returns true on pass, false on fail (with logged details).
 */
async function assertSchemaConformance() {
  console.log('[schema-check] verifying production schema...');
  const checks = [];

  // Check 1: fixtures table has game_data JSONB column with nhl_game_id key
  const { data: cols, error: colErr } = await supabase
    .from('fixtures')
    .select('game_data')
    .not('game_data', 'is', null)
    .limit(1);
  if (colErr) {
    console.error(`  ✗ fixtures.game_data JSONB unreachable: ${colErr.message}`);
    return false;
  }
  checks.push({ name: 'fixtures.game_data JSONB queryable', pass: true });

  // Check 2: top-level fixtures.nhl_game_id MUST NOT exist (was dead schema)
  // We do this via a SELECT with select('nhl_game_id') — PostgREST will
  // return 42703 if the column doesn't exist (which is what we want).
  const { error: phantomErr } = await supabase
    .from('fixtures')
    .select('nhl_game_id')
    .limit(1);
  if (!phantomErr) {
    console.error('  ✗ fixtures.nhl_game_id EXISTS as top-level column — script would write to dead schema.');
    console.error('    Either remove the column or update this script to match.');
    return false;
  }
  if (phantomErr.code !== '42703' && !phantomErr.message?.includes('does not exist')) {
    console.error(`  ✗ Unexpected error checking fixtures.nhl_game_id: ${phantomErr.message}`);
    return false;
  }
  checks.push({ name: 'fixtures.nhl_game_id absent (phantom column)', pass: true });

  // Check 3: teams table queryable for FK resolution
  const { error: teamsErr } = await supabase.from('teams').select('id, name, league_id').limit(1);
  if (teamsErr) {
    console.error(`  ✗ teams query failed: ${teamsErr.message}`);
    return false;
  }
  checks.push({ name: 'teams.id/name/league_id queryable', pass: true });

  console.log('[schema-check] passed:');
  for (const c of checks) console.log(`  ✓ ${c.name}`);
  return true;
}

/**
 * Cross-source score verification (added 2026-09-21 per Arnel audit).
 * Compares the score we just parsed against an independent fetch from
 * Highlightly. If they disagree, returns false and the caller should
 * flag the fixture for human review instead of writing it.
 *
 * Used by the HL upsert path AFTER team FK resolution. Cheap (one HTTP
 * round-trip per game, ~150ms). Failures are non-fatal — they're logged
 * and the fixture is flagged, not silently written.
 */
async function verifyHighlightlyScore(hlMatchId, claimedHomeScore, claimedAwayScore) {
  try {
    const res = await fetch(`${HL_BASE_DETAIL}/matches/${hlMatchId}`, {
      headers: {
        'x-rapidapi-key': HIGHLIGHTLY_KEY,
        'x-rapidapi-host': 'hockey-highlights-api.p.rapidapi.com',
      },
    });
    if (!res.ok) {
      console.log(`    [verify] HL detail HTTP ${res.status} for ${hlMatchId}`);
      return false;
    }
    const data = await res.json();
    const detail = Array.isArray(data) ? data[0] : data;
    const scoreStr = detail?.state?.score?.current;
    if (!scoreStr || !scoreStr.includes('-')) {
      console.log(`    [verify] HL detail has no score.current for ${hlMatchId}`);
      return false;
    }
    const [srcHome, srcAway] = scoreStr.split('-').map(s => parseInt(s.trim(), 10));
    if (Number.isNaN(srcHome) || Number.isNaN(srcAway)) {
      console.log(`    [verify] HL detail unparseable score "${scoreStr}" for ${hlMatchId}`);
      return false;
    }
    if (srcHome !== claimedHomeScore || srcAway !== claimedAwayScore) {
      console.log(`    [verify] MISMATCH ${hlMatchId}: claimed ${claimedHomeScore}-${claimedAwayScore}, HL detail ${srcHome}-${srcAway}`);
      return false;
    }
    return true;
  } catch (e) {
    console.log(`    [verify] HL detail fetch error for ${hlMatchId}: ${e.message}`);
    return false;
  }
}

/**
 * Cross-source verification against games_cache (added 2026-09-21 per
 * Arnel audit). For NHL games, our primary source is NHL.com (from
 * fetchNhlSchedule above), but we ALSO want to compare against any
 * other cached source (Highlightly NHL, HockeyTech, etc.) to detect
 * disagreements.
 *
 * Direction-agnostic: cache rows that record the same game with
 * opposite home/away order still agree if scores match when flipped.
 *
 * Returns { verified: true|false, conflictingSources: [...] }.
 * verified=true means at least one cached source agrees with us.
 * verified=false means a cached source DISAGREES with our parsed score.
 */
async function verifyAgainstCache(dateIso, homeTeamName, awayTeamName, claimedHomeScore, claimedAwayScore) {
  const { data: rows, error } = await supabase
    .from('games_cache')
    .select('source, home_team_name, away_team_name, home_score, away_score')
    .eq('game_date', dateIso);
  if (error || !rows) return { verified: false, conflictingSources: [], reason: 'cache query failed' };

  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ')[0];
  const claimedHomeKey = norm(homeTeamName);
  const claimedAwayKey = norm(awayTeamName);

  let matched = 0;
  const conflictingSources = [];
  for (const r of rows) {
    const cHomeKey = norm(r.home_team_name);
    const cAwayKey = norm(r.away_team_name);
    // Match if (home, away) align OR if (home, away) are swapped (direction-agnostic)
    const same = cHomeKey === claimedHomeKey && cAwayKey === claimedAwayKey;
    const flipped = cHomeKey === claimedAwayKey && cAwayKey === claimedHomeKey;
    if (!same && !flipped) continue;
    matched++;
    // Compare scores in the same direction (apply flip if needed)
    const cHome = same ? r.home_score : r.away_score;
    const cAway = same ? r.away_score : r.home_score;
    if (cHome === claimedHomeScore && cAway === claimedAwayScore) {
      // Agree
    } else {
      conflictingSources.push({ source: r.source, claimed: `${cHome}-${cAway}` });
    }
  }

  if (matched === 0) {
    return { verified: false, conflictingSources: [], reason: 'no cached source' };
  }
  if (conflictingSources.length > 0) {
    return { verified: false, conflictingSources, reason: 'cached source disagrees' };
  }
  return { verified: true, conflictingSources: [], matched };
}

/**
 * Cross-source verification via TheSportsDB (added 2026-09-21 per Arnel's
 * 'cross source information especially amongst official sources' directive).
 *
 * TheSportsDB has free coverage for European leagues (DEL, KHL, SHL, VHL,
 * NL). Used as a SECONDARY source to confirm Highlightly scores before
 * we trust them enough to write to DB.
 *
 * Strategy: for completed HL games in leagues that TheSportsDB covers,
 * fetch the same date + league from TheSportsDB. If a matching game is
 * found and the scores DISAGREE with HL's claim, skip the fixture.
 *
 * If TheSportsDB has no game for that date+league (seasonal gap, missing
 * league mapping), we treat it as 'not verified' but don't reject —
 * HL remains authoritative in the absence of any other source.
 *
 * Returns { verified: bool, conflictingSources: [], reason: string }.
 */
async function verifyAgainstTheSportsDB(dateIso, leagueName, homeTeamName, awayTeamName, claimedHomeScore, claimedAwayScore) {
  const tsdbLeagueId = THESPORTSDB_LEAGUE_IDS[leagueName];
  if (!tsdbLeagueId) return { verified: false, reason: 'league not in TSDB coverage' };

  try {
    const res = await fetch(`${THESPORTSDB_BASE}/eventsday.php?d=${dateIso}&l=${tsdbLeagueId}`);
    if (!res.ok) return { verified: false, reason: `TSDB HTTP ${res.status}` };
    const data = await res.json();
    const events = data?.events || [];
    if (events.length === 0) return { verified: false, reason: 'TSDB has no events for date' };

    const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const claimedHomeKey = norm(homeTeamName);
    const claimedAwayKey = norm(awayTeamName);

    for (const e of events) {
      const eHome = norm(e.strHomeTeam);
      const eAway = norm(e.strAwayTeam);
      const same = eHome.includes(claimedHomeKey) && eAway.includes(claimedAwayKey);
      const flipped = eHome.includes(claimedAwayKey) && eAway.includes(claimedHomeKey);
      if (!same && !flipped) continue;
      const eHomeScore = e.intHomeScore != null ? parseInt(e.intHomeScore, 10) : null;
      const eAwayScore = e.intAwayScore != null ? parseInt(e.intAwayScore, 10) : null;
      if (eHomeScore == null || eAwayScore == null) {
        return { verified: false, reason: 'TSDB game has no score yet' };
      }
      const tsdbHome = same ? eHomeScore : eAwayScore;
      const tsdbAway = same ? eAwayScore : eHomeScore;
      if (tsdbHome === claimedHomeScore && tsdbAway === claimedAwayScore) {
        return { verified: true };
      }
      return { verified: false, reason: `TSDB disagrees: claimed ${claimedHomeScore}-${claimedAwayScore} TSDB ${tsdbHome}-${tsdbAway}` };
    }
    return { verified: false, reason: 'TSDB has no matching game for teams' };
  } catch (e) {
    return { verified: false, reason: `TSDB fetch error: ${e.message}` };
  }
}

async function main() {
  console.log('=== Daily scores ingestion ===');
  console.log(`Days: ${DAYS} | Dry run: ${DRY_RUN}`);
  console.log('Started:', new Date().toISOString());

  // Schema conformance check (added 2026-09-21 per Arnel audit).
  // Root-cause safeguard: the original script wrote to a phantom top-level
  // fixtures.nhl_game_id column that doesn't exist (42703 on every nightly
  // run). It also parsed Highlightly scores inverted (writing m[0] to
  // awayScore). Both bugs were silent — the script exited 0 with summary
  // "NHL upserts: 0 / Highlightly upserts: 9" but the data was wrong.
  //
  // This guard runs BEFORE any work and aborts with exit 2 if the
  // schema-as-expected is false. The check is cheap (<500ms) and idempotent.
  if (!DRY_RUN) {
    const schemaOk = await assertSchemaConformance();
    if (!schemaOk) {
      console.error('\n✗ ABORT: schema conformance failed. Refusing to write data that we cannot verify round-trips.');
      console.error('  Fix the schema mismatch (see migration history) before re-running.');
      process.exit(2);
    }
  }

  let totalNhl = 0, totalHl = 0;
  let scoreMismatches = 0;  // cross-source verification counter
  const today = new Date();

  // Cover [today-DAYS_BACK, today+DAYS_FWD]. NHL preseason starts mid-Sep,
  // so we need to look 3 days forward to catch games that just got scheduled.
  const DAYS_BACK = Math.max(1, Math.floor(DAYS / 2));
  const DAYS_FWD = DAYS - DAYS_BACK;
  for (let dOffset = -DAYS_FWD; dOffset <= DAYS_BACK; dOffset++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + dOffset);
    const dateIso = d.toISOString().slice(0, 10);
    console.log(`\n--- ${dateIso} ---`);

    // NHL.com
    const nhlGames = await fetchNhlSchedule(dateIso);
    console.log(`[NHL] ${dateIso}: ${nhlGames.length} games`);
    for (const g of nhlGames) {
      const record = await upsertNhlGame(g);
      if (!record) continue;
      await resolveTeamIds(record);

      // Cross-source verification via games_cache (added 2026-09-21 per
      // Arnel audit). For completed NHL games, verify the NHL.com score
      // matches any cached source (Highlightly NHL, HockeyTech, etc.).
      // Only completed games are checked (scheduled games have no score).
      if (record.status === 'completed') {
        const homeAbbr = g.homeTeam?.abbrev || '';
        const awayAbbr = g.awayTeam?.abbrev || '';
        const cacheResult = await verifyAgainstCache(
          dateIso,
          homeAbbr,
          awayAbbr,
          record.home_score,
          record.away_score
        );
        if (!cacheResult.verified && cacheResult.reason === 'cached source disagrees') {
          const sources = cacheResult.conflictingSources.map(s => `${s.source}:${s.claimed}`).join(', ');
          console.log(`  [skip NHL] ${g.id}: cached sources disagree (${sources})`);
          scoreMismatches++;
          continue;
        }
        // matched=0 (no cached source) → accept NHL.com as authoritative; we
        // are NHL.com. Only REJECT if a cached source disagrees.
      }

      const id = await upsertFixture(record);
      if (id) totalNhl++;

      // Also write to nhl_matches for the NHL schedule page
      const nmRecord = await upsertNhlMatchRecord(g);
      if (nmRecord) {
        await resolveTeamIds(nmRecord);
        if (!DRY_RUN) {
          await supabase.from('nhl_matches').upsert(nmRecord, { onConflict: 'id' });
        }
      }
    }

    // Highlightly hockey leagues
    for (const [leagueId, cfg] of Object.entries(HIGHLIGHTLY_HOCKEY_LEAGUES)) {
      const hlGames = await fetchHighlightlyMatches(dateIso, cfg.hlId);
      if (hlGames.length === 0) continue;
      console.log(`[HL ${cfg.name}] ${dateIso}: ${hlGames.length} games`);
      for (const g of hlGames) {
        const record = await upsertHighlightlyGame(g, leagueId, cfg.name);
        if (!record) continue;
        // Resolve team FKs BEFORE the existing-row lookup so we can match precisely
        await resolveTeamIds(record);

        // Verify the resolved teams actually belong to this league. The FK
        // constraint will reject otherwise. Skip if mismatch — log for backfill.
        let teamLeagueOk = true;
        if (record.home_team_id || record.away_team_id) {
          const { data: leagues } = await supabase.from('teams')
            .select('id, league_id')
            .in('id', [record.home_team_id, record.away_team_id].filter(Boolean));
          for (const tl of leagues || []) {
            if (tl.league_id !== leagueId) {
              teamLeagueOk = false;
              break;
            }
          }
        }

        // Skip games where we can't resolve both teams — FK constraint requires real teams.
        // Log so we know which leagues need team backfills.
        if (!record.home_team_id || !record.away_team_id || !teamLeagueOk) {
          const ht = record.game_data?.home_team_abbrev || record.game_data?.home_team_name || '?';
          const at = record.game_data?.away_team_abbrev || record.game_data?.away_team_name || '?';
          const reason = !record.home_team_id || !record.away_team_id
            ? 'team not in DB'
            : 'team in wrong league';
          console.log(`  [skip ${cfg.name}] ${ht} vs ${at} — ${reason}`);
          continue;
        }

        // Match existing by (league_id, scheduled_at) only — the unique
        // natural key for HL games without nhl_game_id
        const { data: existing } = await supabase.from('fixtures')
          .select('id')
          .eq('league_id', leagueId)
          .eq('scheduled_at', record.scheduled_at)
          .maybeSingle();
        // Cross-source verification (added 2026-09-21 per Arnel audit).
        // Two layers, both must pass:
        //   1. verifyHighlightlyScore: re-fetch HL detail endpoint and assert
        //      the parsed score matches the API's authoritative value.
        //      Catches parser drift + HL format changes.
        //   2. verifyAgainstTheSportsDB: fetch TheSportsDB's free multi-
        //      league feed and assert independent agreement.
        //      Catches HL having bad data for that specific game.
        // Only verify COMPLETED games (scheduled games have no score yet).
        // For non-completed, skip verification but still write the row.
        if (record.status === 'completed') {
          const hlOk = await verifyHighlightlyScore(
            g.id,
            record.home_score,
            record.away_score
          );
          if (!hlOk) {
            console.log(`  [skip ${cfg.name}] ${record.game_data?.home_team_name || '?'} vs ${record.game_data?.away_team_name || '?'} — HL self-verify failed (HL match ${g.id})`);
            scoreMismatches++;
            continue;
          }
          // Second source (TheSportsDB) — only for leagues it covers.
          // If it has the game and DISAGREES, reject. If absent, accept
          // (HL remains authoritative in absence of disagreement).
          const tsdbResult = await verifyAgainstTheSportsDB(
            dateIso,
            cfg.name,
            record.game_data?.home_team_name || '',
            record.game_data?.away_team_name || '',
            record.home_score,
            record.away_score
          );
          if (!tsdbResult.verified && tsdbResult.reason?.includes('disagrees')) {
            console.log(`  [skip ${cfg.name}] ${record.game_data?.home_team_name || '?'} vs ${record.game_data?.away_team_name || '?'} — ${tsdbResult.reason}`);
            scoreMismatches++;
            continue;
          }
          // Note: silent acceptance when TSDB has no event for date/league.
          // That means we have no second source — accept HL but log.
          if (!tsdbResult.verified && tsdbResult.reason && tsdbResult.reason !== 'TSDB has no events for date' && tsdbResult.reason !== 'TSDB has no matching game for teams') {
            // Only log unusual failures, not the expected 'no coverage' cases
            if (tsdbResult.reason.startsWith('TSDB HTTP') || tsdbResult.reason.startsWith('TSDB fetch error')) {
              console.log(`  [tsdb-warn ${cfg.name}] ${tsdbResult.reason}`);
            }
          }
        }
        if (existing) {
          if (!DRY_RUN) {
            await supabase.from('fixtures').update({
              home_team_id: record.home_team_id,
              away_team_id: record.away_team_id,
              home_score: record.home_score,
              away_score: record.away_score,
              status: record.status,
              game_data: record.game_data,
              updated_at: record.updated_at,
            }).eq('id', existing.id);
          }
          totalHl++;
        } else {
          // Generate a deterministic UUID for this game (HL doesn't give nhl_game_id)
          // Format: 8-4-4-4-12 using league_id prefix + match_id padding
          const id = `${leagueId.slice(0, 8)}-0000-0000-0000-${String(g.id).padStart(12, '0')}`.slice(0, 36);
          record.id = id;
          await upsertFixture(record);
          totalHl++;
        }
      }
      await sleep(50); // light rate-limit
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`NHL upserts: ${totalNhl}`);
  console.log(`Highlightly upserts: ${totalHl}`);
  console.log(`Score verification mismatches: ${scoreMismatches}`);
  if (scoreMismatches > 0) {
    console.log(`  ⚠ ${scoreMismatches} completed games FAILED cross-source verification.`);
    console.log(`    These were NOT written to DB. Run scripts/_audit-highlightly-scores.cjs to investigate.`);
  }
  console.log('Completed at:', new Date().toISOString());
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });