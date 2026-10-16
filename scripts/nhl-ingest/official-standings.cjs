#!/usr/bin/env node
/**
 * scripts/nhl-ingest/official-standings.cjs
 *
 * Mirrors official NHL standings from api-web.nhle.com into the
 * `nhl_official_standings` table.
 *
 * Why this script exists (Arnel 2026-10-15 23:14):
 *   - compute-standings.ts computes NHL standings from completed
 *     fixtures. The 2026-27 season has 0 completed fixtures in our
 *     DB, so the UI was showing empty/wrong standings.
 *   - The NHL.com Stats API has the authoritative current standings.
 *   - We mirror them here daily via cron.
 *
 * Source: NHL.com Stats API
 *   GET https://api-web.nhle.com/v1/standings/{YYYY-MM-DD}
 *   Free, no auth, no API key. Returns 32 teams.
 *
 * What it does:
 *   1. Builds an NHL.com abbrev → our `teams.id` lookup from the
 *      `teams` table (active rows in the NHL league).
 *   2. Fetches the standings for the given as-of date (default:
 *      today UTC) and extracts the season string from the
 *      response's `seasonId` (e.g. 20262027 → "2026-27").
 *   3. Verifies the response: 32 teams, distinct abbrevs, per-team
 *      math (GP == W+L+OTL, PTS == 2*W+OTL, bounds).
 *   4. Upserts into `nhl_official_standings` keyed by
 *      (team_id, season). Idempotent — re-runs update in place.
 *   5. Logs any teams that came back from NHL.com but have no
 *      matching row in our `teams` table (e.g. MTL currently has
 *      is_active=false — see report). This is the verification
 *      step that surfaces data drift.
 *
 * OTL handling: The API returns one combined `otLosses` field
 * that includes shootout losses. We store that verbatim. If we
 * ever need a split, add `shootout_losses` column.
 *
 * Usage:
 *   node scripts/nhl-ingest/official-standings.cjs
 *   node scripts/nhl-ingest/official-standings.cjs --as-of=2026-04-17
 *   node scripts/nhl-ingest/official-standings.cjs --dry-run
 *   node scripts/nhl-ingest/official-standings.cjs --league-id=<uuid>
 *
 * Idempotent — safe to run on cron.
 */

require('../load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SB_KEY) {
  console.error('FATAL: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SB_KEY);

const NHL_API = 'https://api-web.nhle.com/v1/standings';

// NHL league_id in our `teams` table. Matches the league row used
// by compute-standings.ts.
const DEFAULT_NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';

// Hard-coded NHL.com abbrev → our `teams` table slug. The script
// loads the active team rows once and joins via this map. We use
// slug (not id) because the id is a generated UUID that drifts
// across environments. Slug is the human-meaningful key and is
// stable.
//
// If a new NHL team is added (relocation, expansion), add the
// slug here AND in the `teams` table. The script will warn at
// runtime if NHL.com returns an abbrev we don't have a slug for.
//
// One row currently has no `teams` row at all: MTL (Montreal
// Canadiens is_active=false in our DB). See the dry-run output.
const NHL_ABBREV_TO_SLUG = {
  ANA: 'anaheim-ducks',
  BOS: 'boston-bruins',
  BUF: 'buffalo-sabres',
  CAR: 'carolina-hurricanes',
  CBJ: 'columbus-blue-jackets',
  CGY: 'calgary-flames',
  CHI: 'chicago-blackhawks',
  COL: 'colorado-avalanche',
  DAL: 'dallas-stars',
  DET: 'detroit-red-wings',
  EDM: 'edmonton-oilers',
  FLA: 'florida-panthers',
  LAK: 'los-angeles-kings',
  MIN: 'minnesota-wild',
  MTL: 'montreal-canadiens',  // ⚠️  row in `teams` has is_active=false
  NJD: 'new-jersey-devils',
  NSH: 'nashville-predators',
  NYI: 'new-york-islanders',
  NYR: 'new-york-rangers',
  OTT: 'ottawa-senators',
  PHI: 'philadelphia-flyers',
  PIT: 'pittsburgh-penguins',
  SEA: 'seattle-kraken',
  SJS: 'san-jose-sharks',
  STL: 'st-louis-blues',
  TBL: 'tampa-bay-lightning',
  TOR: 'toronto-maple-leafs',
  UTA: 'utah-mammoth',
  VAN: 'vancouver-canucks',
  VGK: 'vegas-golden-knights',
  WPG: 'winnipeg-jets',
  WSH: 'washington-capitals',
};

function arg(name, fallback) {
  const a = process.argv.find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : fallback;
}
function flag(name) {
  return process.argv.includes(`--${name}`);
}

function todayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

// seasonId is a number like 20262027 → "2026-27"
function seasonStringFromId(seasonId) {
  const s = String(seasonId);
  if (!/^\d{8}$/.test(s)) {
    throw new Error(`Unexpected seasonId format: ${seasonId}`);
  }
  return `${s.slice(0, 4)}-${s.slice(6, 8)}`;
}

async function fetchStandings(asOfDate) {
  const url = `${NHL_API}/${asOfDate}`;
  const resp = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!resp.ok) {
    throw new Error(`NHL.com API ${resp.status} ${resp.statusText} for ${asOfDate}`);
  }
  return resp.json();
}

// Build {abbrev → teams.id} for active teams in the NHL league.
// Strategy: load ALL teams for the league (active OR not) because
// some current-NHL teams (MTL) have is_active=false in our DB.
// Then map via the hard-coded NHL_ABBREV_TO_SLUG table.
//
// We include inactive teams in the lookup so we can still surface
// the data even when the `teams` row is misconfigured. The script
// logs a WARN for any team whose `is_active` is false but which
// has a standings row — that's the data-fix queue.
async function buildTeamLookup(leagueId) {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, slug, is_active')
    .eq('league_id', leagueId);

  if (error) throw new Error(`teams lookup failed: ${error.message}`);

  // {slug → team} for fast lookups.
  const bySlug = new Map((data || []).map(t => [t.slug, t]));

  // Build the abbrev → team_id map using the hard-coded table.
  const abbrevMap = new Map();
  const missingSlugs = [];
  for (const [ab, slug] of Object.entries(NHL_ABBREV_TO_SLUG)) {
    const t = bySlug.get(slug);
    if (t) {
      abbrevMap.set(ab, t.id);
    } else {
      missingSlugs.push({ abbrev: ab, slug });
    }
  }

  // Also build a name fallback ({lowercase team name → id}) for
  // any future case where NHL.com introduces an abbrev we don't
  // have hard-coded.
  const nameMap = new Map((data || []).map(t => [t.name.toLowerCase(), t]));

  return {
    abbrevMap,
    bySlug,
    nameMap,
    missingSlugs,           // abbrevs we expected but have no team row for
    totalActive: (data || []).filter(t => t.is_active).length,
    totalInactive: (data || []).filter(t => !t.is_active).length,
  };
}

// Per-team accuracy checks. Mirrors the existing standings_nhlcom.cjs
// verifier but adapted to the field names returned by the
// /v1/standings/{date} endpoint.
function verifyResponse({ body, seasonStr, teamLookup }) {
  const teams = body.standings || [];
  const errors = [];

  if (teams.length !== 32) {
    errors.push(`Expected 32 NHL teams, got ${teams.length}`);
  }

  const abbrevs = teams.map(t => t.teamAbbrev?.default);
  const distinct = new Set(abbrevs);
  if (distinct.size !== teams.length) {
    errors.push(`Duplicate team abbreviations in response: ${abbrevs.filter((a, i) => abbrevs.indexOf(a) !== i).join(', ')}`);
  }

  // Season should match what we derived
  const respSeason = seasonStringFromId(teams[0]?.seasonId);
  if (respSeason !== seasonStr) {
    errors.push(`Response season ${respSeason} != derived ${seasonStr}`);
  }

  for (const t of teams) {
    const abbrev = t.teamAbbrev?.default || '?';
    const name = t.teamName?.default || '?';
    const GP = Number(t.gamesPlayed);
    const W = Number(t.wins);
    const L = Number(t.losses);
    const OTL = Number(t.otLosses ?? 0);
    const PTS = Number(t.points);
    const GF = Number(t.goalFor ?? 0);
    const GA = Number(t.goalAgainst ?? 0);

    const required = [GP, W, L, OTL, PTS];
    if (!required.every(Number.isFinite)) {
      errors.push(`${name} (${abbrev}): non-numeric required stat (W/L/OTL/GP/PTS)`);
      continue;
    }
    if (W + L + OTL !== GP) {
      errors.push(`${name} (${abbrev}): GP=${GP} != W(${W}) + L(${L}) + OTL(${OTL})`);
    }
    if (2 * W + OTL !== PTS) {
      errors.push(`${name} (${abbrev}): PTS=${PTS} != 2*W(${W}) + OTL(${OTL})`);
    }
    if (GP < 0 || GP > 82) errors.push(`${name} (${abbrev}): GP=${GP} out of bounds`);
    if (PTS < 0 || PTS > 200) errors.push(`${name} (${abbrev}): PTS=${PTS} out of bounds`);
  }

  // Count how many NHL.com teams mapped to a row in our DB. Anything
  // that didn't map is a data-fix needed in our `teams` table — we
  // log it but don't error.
  const unmapped = [];
  for (const t of teams) {
    const ab = t.teamAbbrev?.default;
    if (!ab) continue;
    if (!teamLookup.abbrevMap.has(ab) && !teamLookup.nameMap.has((t.teamName?.default || '').toLowerCase())) {
      unmapped.push({ abbrev: ab, name: t.teamName?.default });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    unmapped,
    summary: {
      teamCount: teams.length,
      distinctCount: distinct.size,
      ourActiveTeams: teamLookup.totalActive,
      ourInactiveTeams: teamLookup.totalInactive,
      hardCodedAbbrevs: Object.keys(NHL_ABBREV_TO_SLUG).length,
    },
  };
}

function resolveTeamId(t, teamLookup) {
  const ab = t.teamAbbrev?.default;
  if (ab && teamLookup.abbrevMap.has(ab)) {
    const slug = NHL_ABBREV_TO_SLUG[ab];
    const team = teamLookup.bySlug.get(slug);
    return {
      id: teamLookup.abbrevMap.get(ab),
      via: `abbrev:${ab}`,
      slug,
      isActive: team ? team.is_active : null,
    };
  }
  const name = (t.teamName?.default || '').toLowerCase();
  if (name && teamLookup.nameMap.has(name)) {
    const team = teamLookup.nameMap.get(name);
    return {
      id: team.id,
      via: `name:${name}`,
      slug: team.slug,
      isActive: team.is_active,
    };
  }
  return { id: null, via: 'unmapped', slug: null, isActive: null };
}

function mapToRow(t, seasonStr, teamLookup) {
  const { id: teamId, via, slug, isActive } = resolveTeamId(t, teamLookup);
  const abbrev = t.teamAbbrev?.default || '';
  const streakCode = t.streakCode || '';
  const streakCount = t.streakCount ?? 0;
  const streak = streakCode ? `${streakCode}${streakCount}` : null;

  // l10 format: W-L-OTL (e.g. "7-2-1")
  const l10 = t.l10Wins != null && t.l10Losses != null && t.l10OtLosses != null
    ? `${t.l10Wins}-${t.l10Losses}-${t.l10OtLosses}`
    : null;

  return {
    team_id: teamId,
    season: seasonStr,
    gp: Number(t.gamesPlayed),
    wins: Number(t.wins),
    losses: Number(t.losses),
    ot_losses: Number(t.otLosses ?? 0),
    points: Number(t.points),
    goals_for: Number(t.goalFor ?? 0),
    goals_against: Number(t.goalAgainst ?? 0),
    streak,
    l10,
    last_updated: new Date().toISOString(),
    source: 'nhl.com',
    _meta: { abbrev, via, slug, isActive, name: t.teamName?.default }, // stripped before upsert
  };
}

function stripMeta(row) {
  // Remove the underscore-prefixed meta field; PostgREST will reject unknown cols.
  const { _meta, ...rest } = row;
  return rest;
}

async function upsert(rows) {
  // Chunk to avoid payload size limits. 32 teams × ~10 cols is
  // tiny so we do a single batch, but keep the loop for safety.
  const CHUNK = 50;
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map(stripMeta);
    const { error, count } = await supabase
      .from('nhl_official_standings')
      .upsert(chunk, { onConflict: 'team_id,season', count: 'exact' });
    if (error) {
      console.error(`  FAIL upsert: ${error.message}`);
      throw error;
    }
    total += count ?? chunk.length;
  }
  return total;
}

async function main() {
  const dryRun = flag('dry-run');
  const asOfDate = arg('as-of', todayUtcDate());
  const leagueId = arg('league-id', DEFAULT_NHL_LEAGUE_ID);

  console.log(`=== NHL.com Official Standings Ingest ===`);
  console.log(`As of:   ${asOfDate}${dryRun ? ' (DRY RUN)' : ''}`);
  console.log(`League:  ${leagueId}`);

  // 1. Build team lookup
  console.log(`\n[1/4] Building team lookup...`);
  const teamLookup = await buildTeamLookup(leagueId);
  console.log(`  ${teamLookup.totalActive} active NHL teams in our DB`);

  // 2. Fetch
  console.log(`[2/4] Fetching ${NHL_API}/${asOfDate}...`);
  let body;
  try {
    body = await fetchStandings(asOfDate);
  } catch (e) {
    console.error(`  FAIL: ${e.message}`);
    process.exit(1);
  }
  const seasonStr = seasonStringFromId(body.standings?.[0]?.seasonId);
  console.log(`  seasonId: ${body.standings?.[0]?.seasonId} → ${seasonStr}`);

  // 3. Verify
  console.log(`[3/4] Verifying...`);
  const v = verifyResponse({ body, seasonStr, teamLookup });
  if (!v.ok) {
    console.error(`  FAIL verification (${v.errors.length} errors) — aborting writes`);
    for (const err of v.errors.slice(0, 10)) console.error(`    ${err}`);
    if (v.errors.length > 10) console.error(`    ... +${v.errors.length - 10} more`);
    process.exit(1);
  }
  console.log(`  OK: ${v.summary.teamCount} teams (${v.summary.distinctCount} distinct) vs ${v.summary.ourActiveTeams} active in DB`);

  if (v.unmapped.length > 0) {
    console.warn(`  WARN: ${v.unmapped.length} NHL.com team(s) not in our DB at all:`);
    for (const u of v.unmapped) {
      console.warn(`    ${u.abbrev} — ${u.name}`);
    }
    console.warn(`  These rows will be SKIPPED (no team_id FK). Add to 'teams' table and re-run.`);
  }

  // 4. Build rows
  console.log(`[4/4] ${dryRun ? 'Building rows (dry-run, no writes)' : 'Upserting...'} `);
  const rows = (body.standings || []).map(t => mapToRow(t, seasonStr, teamLookup));

  // Surface inactive-team warnings: NHL.com returns these teams, our
  // hard-coded map finds a row, but is_active=false. The ingest still
  // writes the row (data is real), but operators should know.
  const inactiveButWritten = rows.filter(r => r.team_id && r._meta.isActive === false);
  if (inactiveButWritten.length > 0) {
    console.warn(`  WARN: ${inactiveButWritten.length} team(s) have is_active=false in 'teams' but are active in NHL.com:`);
    for (const r of inactiveButWritten) {
      console.warn(`    ${r._meta.abbrev} (${r._meta.slug}) — ${r._meta.name}`);
    }
    console.warn(`  Rows will be WRITTEN (NHL.com data is real). Fix is_active in 'teams' table.`);
  }

  // Drop rows that didn't map. FK to teams.id will reject them
  // otherwise, and we want clean data.
  const mappable = rows.filter(r => r.team_id !== null);
  const skipped = rows.length - mappable.length;

  if (dryRun) {
    console.log(`  would upsert ${mappable.length} rows; ${skipped} skipped (unmapped)`);
    for (const r of mappable.slice(0, 3)) {
      console.log(`    sample: ${r._meta.abbrev} → ${r._meta.via}: ${r.wins}-${r.losses}-${r.ot_losses} pts=${r.points} gp=${r.gp}`);
    }
  } else {
    const written = await upsert(mappable);
    console.log(`  upserted ${written} rows${skipped ? `, ${skipped} skipped (unmapped)` : ''}`);
  }

  console.log(`\n=== DONE ===`);
}

main().catch(err => {
  console.error('FATAL', err);
  process.exit(1);
});
