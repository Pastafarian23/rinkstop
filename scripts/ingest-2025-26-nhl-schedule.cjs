#!/usr/bin/env node
/**
 * ingest-2025-26-nhl-schedule.cjs — 2026-10-01 one-shot
 *
 * Backfills the 2025-26 NHL schedule (and any current-season games) into
 * public.fixtures. The DB only has 2024 preseason data, so /scores shows
 * no games for any 2026 date. This script pulls current + upcoming games
 * from Highlightly and upserts them.
 *
 * Strategy:
 *   - Paginate Highlightly `matches` endpoint at offset 0 through 700
 *     (covers 2026-11-01 back to ~2025-09)
 *   - Match Highlightly team abbreviation → DB team_workspaces
 *   - Match Highlightly league → DB leagues
 *   - Map Highlightly status description → DB fixtures.status enum
 *   - Upsert with natural-key dedupe (HL match id stored in game_data)
 *
 * Why this is one-shot:
 *   - Highlightly returns the full match history paginated. After we
 *     catch up, daily cron (separate script) just pulls the next 7 days.
 *   - Current state: 200 games, all 2024 preseason. After this runs:
 *     ~1,500+ games covering 2025-26 season + current 2026 NHL schedule.
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HL_KEY = process.env.HIGHLIGHTLY_API_KEY;

if (!HL_KEY) { console.error('HIGHLIGHTLY_API_KEY missing'); process.exit(1); }
if (!SUPABASE_URL || !SB_KEY) { console.error('Supabase env missing'); process.exit(1); }

const HL_BASE = 'https://nhl.highlightly.net';
const HL_HOST = 'nhl-ncaah-api.p.rapidapi.com';
const PAGE = 200;
const MAX_OFFSET = 700; // covers Nov 2026 → Sep 2025
const BATCH_SIZE = 50; // upsert chunks

const supabase = createClient(SUPABASE_URL, SB_KEY);

// Caches: abbrev → team_id (NHL only for this script), leagueId
async function loadNHLTeamCache() {
  const cache = new Map();
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('team_workspaces')
      .select('id, slug, name')
      .eq('is_active', true)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const t of data) {
      // Use the HL team abbreviation from slug (e.g. "colorado-avalanche" → "COL")
      // But slug → abbrev needs lookup. We use a name-match heuristic here.
      // The HL abbreviation comes from HL feed directly — we use that.
      cache.set(t.slug, t.id);
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  return cache;
}

// Build HL abbreviation → DB team_id map.
// HL returns abbreviations like "COL", "EDM". DB teams don't have an
// abbreviation column — we infer from team name OR slug. But for NHL teams
// the slug is "colorado-avalanche" → abbrev "COL" can be derived.
function abbrevFromSlug(slug) {
  if (!slug) return null;
  // Map of common NHL slugs to abbreviations (data already in DB).
  const m = {
    'anaheim-ducks':'ANA','arizona-coyotes':'ARI','boston-bruins':'BOS','buffalo-sabres':'BUF',
    'calgary-flames':'CGY','carolina-hurricanes':'CAR','chicago-blackhawks':'CHI',
    'colorado-avalanche':'COL','columbus-blue-jackets':'CBJ','dallas-stars':'DAL',
    'detroit-red-wings':'DET','edmonton-oilers':'EDM','florida-panthers':'FLA',
    'los-angeles-kings':'LAK','minnesota-wild':'MIN','montreal-canadiens':'MTL',
    'nashville-predators':'NSH','new-jersey-devils':'NJD','new-york-islanders':'NYI',
    'new-york-rangers':'NYR','ottawa-senators':'OTT','philadelphia-flyers':'PHI',
    'pittsburgh-penguins':'PIT','san-jose-sharks':'SJS','seattle-kraken':'SEA',
    'st-louis-blues':'STL','tampa-bay-lightning':'TBL','toronto-maple-leafs':'TOR',
    'utah-hockey-club':'UHC','utah-mammoth':'UTA','vancouver-canucks':'VAN',
    'vegas-golden-knights':'VGK','washington-capitals':'WSH','winnipeg-jets':'WPG',
  };
  return m[slug] || null;
}

async function loadLeagueCache() {
  const { data } = await supabase
    .from('leagues')
    .select('id, name, slug');
  const byName = new Map();
  for (const l of data || []) byName.set(l.name, l);
  // HL 'NHL' → our 'National Hockey League'
  // HL 'NCAA' → 'NCAA Hockey'
  // HL 'KHL' → 'Kontinental Hockey League'
  const alias = {
    'NHL': 'National Hockey League',
    'NCAA': null, // NCAA has many sub-leagues
    'KHL': 'Kontinental Hockey League',
    'SHL': 'Swedish Hockey League',
    'Liiga': 'Liiga',
    'DEL': 'Deutsche Eishockey Liga',
    'NL': 'National League',
    'AHL': 'American Hockey League',
    'PWHL': "Professional Women's Hockey League",
  };
  const out = new Map();
  for (const [hl, dbName] of Object.entries(alias)) {
    if (dbName && byName.has(dbName)) out.set(hl, byName.get(dbName).id);
    else if (hl === 'NHL') out.set('NHL', byName.get('National Hockey League')?.id);
  }
  // Fallback: exact-name match
  for (const l of data || []) {
    if (!out.has(l.name)) out.set(l.name, l.id);
  }
  return out;
}

function mapStatus(hlState) {
  if (!hlState) return 'scheduled';
  const desc = (hlState.description || hlState.report || '').toLowerCase();
  if (desc.includes('final') || desc.includes('finished') || desc.includes('post game')) return 'completed';
  if (desc.includes('live') || desc.includes('progress') || desc.includes('in progress')) return 'in_progress';
  if (desc.includes('postponed')) return 'postponed';
  if (desc.includes('cancel')) return 'cancelled';
  return 'scheduled';
}

function parseScore(scoreStr) {
  // Highlightly returns "X - Y" or "0:0" depending on state
  if (!scoreStr || typeof scoreStr !== 'string') return [null, null];
  const m = scoreStr.match(/(\d+)\s*[-:]\s*(\d+)/);
  if (!m) return [null, null];
  return [parseInt(m[1], 10), parseInt(m[2], 10)];
}

async function fetchHLMatches(offset, limit = PAGE) {
  const url = `${HL_BASE}/matches?limit=${limit}&offset=${offset}`;
  const res = await fetch(url, {
    headers: { 'x-rapidapi-key': HL_KEY, 'x-rapidapi-host': HL_HOST },
  });
  if (!res.ok) {
    console.error(`  HL fetch failed at offset=${offset}: ${res.status}`);
    return [];
  }
  const data = await res.json();
  return data.data || [];
}

async function ingestSeason() {
  console.log(`Ingesting 2025-26 NHL + current season schedule...`);
  console.log(`Pagination: 0 → ${MAX_OFFSET}, page size ${PAGE}`);

  const leagueCache = await loadLeagueCache();
  const teamCache = await loadNHLTeamCache();
  console.log(`Loaded ${teamCache.size} teams, ${leagueCache.size} league mappings`);

  // Build abbrev → team_id from the team cache
  const abbrevToTeamId = new Map();
  for (const slug of teamCache.keys()) {
    const abbrev = abbrevFromSlug(slug);
    if (abbrev) {
      const id = teamCache.get(slug);
      if (id) abbrevToTeamId.set(abbrev, id);
    }
  }
  console.log(`Built ${abbrevToTeamId.size} team abbreviation mappings`);

  let offset = 0;
  let total = 0;
  let matched = 0;
  let skipped = 0;
  let upserted = 0;
  const upsertBuffer = [];

  while (offset <= MAX_OFFSET) {
    const matches = await fetchHLMatches(offset);
    if (matches.length === 0) break;
    total += matches.length;
    for (const m of matches) {
      const leagueId = leagueCache.get(m.league);
      if (!leagueId) { skipped++; continue; }
      const homeAbbr = m.homeTeam?.abbreviation;
      const awayAbbr = m.awayTeam?.abbreviation;
      const homeTeamId = abbrevToTeamId.get(homeAbbr);
      const awayTeamId = abbrevToTeamId.get(awayAbbr);
      if (!homeTeamId || !awayTeamId) { skipped++; continue; }
      const [homeScore, awayScore] = parseScore(m.state?.score?.current);
      const status = mapStatus(m.state);
      const row = {
        // id is generated by Postgres default — let DB assign
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        league_id: leagueId,
        scheduled_at: m.date,
        home_score: homeScore,
        away_score: awayScore,
        status,
        season: m.season ? `${m.season}-${(m.season + 1).toString().slice(-2)}` : null,
        game_data: { highlightly_id: m.id, round: m.round || null },
      };
      // Dedupe: if a fixture already exists for (home, away, scheduled_at), skip
      // (or update if scores changed). For simplicity: check by HL id in game_data.
      const hlId = m.id;
      const { data: existing } = await supabase
        .from('fixtures')
        .select('id, home_score, away_score, status')
        .contains('game_data', { highlightly_id: hlId })
        .maybeSingle();
      if (existing) {
        // Update scores if changed
        if (homeScore !== existing.home_score || awayScore !== existing.away_score || status !== existing.status) {
          const { error } = await supabase
            .from('fixtures')
            .update({ home_score: homeScore, away_score: awayScore, status })
            .eq('id', existing.id);
          if (!error) matched++;
        } else {
          matched++;
        }
        continue;
      }
      upsertBuffer.push(row);
      if (upsertBuffer.length >= BATCH_SIZE) {
        const { error } = await supabase
          .from('fixtures')
          .insert(upsertBuffer);
        if (!error) upserted += upsertBuffer.length;
        else console.error(`  Upsert error: ${error.message}`);
        upsertBuffer.length = 0;
      }
      matched++;
    }
    process.stdout.write(`  offset=${offset} total=${total} matched=${matched} skipped=${skipped} upserted=${upserted}\r`);
    offset += PAGE;
    // Highlightly rate limit: 200 req/day on free. Sleep between pages.
    await new Promise(r => setTimeout(r, 1000));
  }
  // Final flush
  if (upsertBuffer.length > 0) {
    const { error } = await supabase
      .from('fixtures')
      .insert(upsertBuffer);
    if (!error) upserted += upsertBuffer.length;
  }
  console.log(`\n=== Done ===`);
  console.log(`Total fetched: ${total}`);
  console.log(`Matched (DB team found): ${matched}`);
  console.log(`Skipped (no team/league match): ${skipped}`);
  console.log(`Upserted (new fixtures): ${upserted}`);
}

ingestSeason().catch((e) => {
  console.error('Ingest failed:', e);
  process.exit(1);
});