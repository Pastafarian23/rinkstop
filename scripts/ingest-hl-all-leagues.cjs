#!/usr/bin/env node
/**
 * ingest-hl-all-leagues.cjs — 2026-09-30 one-shot + scheduled daily
 *
 * Comprehensive fixture ingest from Highlightly (nhl.highlightly.net).
 * Covers BOTH NHL and NCAA (the two leagues Highlightly supports), for
 * BOTH historical (back to 2022) and current/future schedule.
 *
 * Why we need this:
 *   - Before this script, only the 100 most-recent NHL games were in DB
 *   - 0 NCAA games
 *   - No 2026 season games
 *   - /directory/games was effectively broken for anyone looking for current
 *     season content
 *
 * Strategy:
 *   - Paginate Highlightly /matches endpoint by offset (100 per page)
 *   - At 1 req/sec, walking offset 0 → 25,000 = ~250 req = ~1.25 hours
 *   - Skip NHL duplicates by HL id (game_data->>highlightly_id)
 *   - Build abbrev → DB team_id map dynamically (covers NHL + NCAA)
 *   - Mark each insert with the proper league_id (NHL or NCAA)
 *
 * Idempotent: every duplicate skipped by HL id lookup. Re-runnable.
 *
 * Scope at writing:
 *   - 25,000 HL matches = ~Nov 2026 back to Apr 2022 = full NHL+NCAA
 *     schedule covering 4+ seasons
 *
 * Run: node scripts/ingest-hl-all-leagues.cjs [--max-offset=N] [--rate=N]
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
const PAGE = 100;

const maxOffsetArg = process.argv.find(a => a.startsWith('--max-offset='));
const MAX_OFFSET = maxOffsetArg ? parseInt(maxOffsetArg.split('=')[1], 10) : 25000;
const rateArg = process.argv.find(a => a.startsWith('--rate='));
const RATE_MS = rateArg ? parseInt(rateArg.split('=')[1], 10) : 1100; // 1.1s = ~55 req/min

const supabase = createClient(SUPABASE_URL, SB_KEY);

// Load all teams — paginate to bypass 1000-row default cap
async function loadTeams() {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('team_workspaces')
      .select('id, slug, name, home_country')
      .eq('is_active', true)
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

// Load leagues by slug
async function loadLeagues() {
  const { data } = await supabase
    .from('leagues')
    .select('id, name, slug');
  const byName = new Map();
  const bySlug = new Map();
  for (const l of data || []) {
    byName.set(l.name, l.id);
    bySlug.set(l.slug, l.id);
  }
  return { byName, bySlug };
}

// NHL abbrev → slug map
const NHL_ABBREV = {
  'ANA':'anaheim-ducks','ARI':'arizona-coyotes','BOS':'boston-bruins','BUF':'buffalo-sabres',
  'CGY':'calgary-flames','CAR':'carolina-hurricanes','CHI':'chicago-blackhawks',
  'COL':'colorado-avalanche','CBJ':'columbus-blue-jackets','DAL':'dallas-stars',
  'DET':'detroit-red-wings','EDM':'edmonton-oilers','FLA':'florida-panthers',
  'LAK':'los-angeles-kings','LA':'los-angeles-kings','MIN':'minnesota-wild',
  'MTL':'montreal-canadiens','NSH':'nashville-predators','NJD':'new-jersey-devils',
  'NYI':'new-york-islanders','NYR':'new-york-rangers','OTT':'ottawa-senators',
  'PHI':'philadelphia-flyers','PIT':'pittsburgh-penguins','SJS':'san-jose-sharks',
  'SJ':'san-jose-sharks','SEA':'seattle-kraken','STL':'st-louis-blues',
  'TBL':'tampa-bay-lightning','TB':'tampa-bay-lightning','TOR':'toronto-maple-leafs',
  'UTA':'utah-mammoth','UHC':'utah-hockey-club','VAN':'vancouver-canucks',
  'VGK':'vegas-golden-knights','WSH':'washington-capitals','WPG':'winnipeg-jets',
};

// Normalize a team name for fuzzy matching (NCAA + edge cases)
function normalizeTeamName(s) {
  if (!s) return '';
  let x = String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  // Strip common NCAA mascots
  const mascots = ['tigers','eagles','wildcats','huskies','spartans','bearcats','badgers',
                   'hawks','panthers','cardinals','minutemen','crusaders','wolverines','nittany lions',
                   'pioneers','terriers','miners','mean green','razorbacks','fighting irish',
                   'thundering herd','rebels','wolf pack','wolfpack','red wolves','redwolves',
                   'lumberjacks','highlanders','mountaineers','bobcats','broncos','bulls','gators',
                   'gamecocks','seminoles','hurricanes','cavaliers','demon deacons','yellow jackets',
                   'tar heels','blue demons','musketeers','friars','red storm','ramblers','hoyas',
                   'orange','tigers','jaguars','owls','falcons','rams','bison','cougars','rebels',
                   'mavericks','49ers','aggies','longhorns','sooners','cornhuskers','wildcats',
                   'jayhawks','cyclones','horned frogs','knights','beavers','bruins','trojans',
                   'buffaloes','utes','cougars','utes'];
  for (const m of mascots) {
    x = x.replace(new RegExp('\\b' + m + '\\b', 'g'), '');
  }
  x = x.replace(/\bstate university\b/g, 'state');
  x = x.replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return x;
}

async function fetchHLMatches(offset) {
  const res = await fetch(`${HL_BASE}/matches?limit=${PAGE}&offset=${offset}`, {
    headers: { 'x-rapidapi-key': HL_KEY, 'x-rapidapi-host': HL_HOST },
  });
  if (!res.ok) {
    throw new Error(`HL ${res.status} at offset=${offset}`);
  }
  const data = await res.json();
  return data.data || [];
}

function mapStatus(state) {
  if (!state) return 'scheduled';
  const desc = (state.description || state.report || '').toLowerCase();
  if (desc.includes('final') || desc.includes('finished') || desc.includes('post game')) return 'completed';
  if (desc.includes('live') || desc.includes('in progress')) return 'in_progress';
  if (desc.includes('postponed')) return 'postponed';
  if (desc.includes('cancel')) return 'cancelled';
  return 'scheduled';
}

function parseScore(scoreStr) {
  if (!scoreStr || typeof scoreStr !== 'string') return [null, null];
  const m = scoreStr.match(/(\d+)\s*[-:]\s*(\d+)/);
  if (!m) return [null, null];
  return [parseInt(m[1], 10), parseInt(m[2], 10)];
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log(`Ingesting Highlighter matches from offset 0 → ${MAX_OFFSET} at ${(1000/RATE_MS).toFixed(1)} req/sec`);
  console.log('Building team + league caches...');

  const teams = await loadTeams();
  const slugToId = new Map(teams.map(t => [t.slug, t.id]));
  const nameNormToId = new Map();
  for (const t of teams) {
    nameNormToId.set(normalizeTeamName(t.name), t.id);
  }
  const { byName: leaguesByName, bySlug: leaguesBySlug } = await loadLeagues();

  // Build NHL abbrev → team_id
  const abbrevToTeamId = new Map();
  for (const [abbr, slug] of Object.entries(NHL_ABBREV)) {
    const id = slugToId.get(slug);
    if (id) abbrevToTeamId.set(abbr, id);
  }
  console.log(`Built ${abbrevToTeamId.size} NHL abbrev mappings + ${nameNormToId.size} fuzzy name mappings`);

  // Get league IDs we'll need
  const nhlId = leaguesByName.get('National Hockey League') || leaguesBySlug.get('nhl');
  // NCAA — multiple in HL. Use the first NCAA league we find.
  let ncaaId = null;
  for (const [name, id] of leaguesByName.entries()) {
    if (name === 'NCAA Hockey' || name === "NCAA Men's Hockey") { ncaaId = id; break; }
  }
  if (!ncaaId) ncaaId = leaguesBySlug.get('ncaa-hockey');
  if (!ncaaId) {
    // Fallback: find any league with "NCAA" in name
    for (const [name, id] of leaguesByName.entries()) {
      if (/NCAA/i.test(name)) { ncaaId = id; break; }
    }
  }
  console.log(`NHL: ${nhlId}, NCAA: ${ncaaId}`);

  // Pre-load existing HL ids (paginated) so we can skip duplicates fast
  let existingRows = [];
  let eFrom = 0;
  while (true) {
    const { data: epage } = await supabase
      .from('fixtures')
      .select('game_data')
      .not('game_data', 'is', null)
      .range(eFrom, eFrom + 999);
    if (!epage || epage.length === 0) break;
    existingRows = existingRows.concat(epage);
    if (epage.length < 1000) break;
    eFrom += 1000;
  }
  const existingHlIds = new Set(
    existingRows.map(r => r.game_data?.highlightly_id).filter(Boolean)
  );
  console.log(`Existing fixtures: ${existingRows.length}, with HL id: ${existingHlIds.size}`);

  // Pagination loop
  let offset = 0;
  let fetched = 0, matched = 0, skipped = 0, upserted = 0;
  const buf = [];
  const BATCH = 50;

  // Resume support: skip already-ingested HL ids in current run if any
  // (none — fresh run)

  while (offset <= MAX_OFFSET) {
    let matches;
    try {
      matches = await fetchHLMatches(offset);
    } catch (e) {
      console.error(`HL error at offset=${offset}: ${e.message}`);
      // Don't crash; skip and continue
      await sleep(RATE_MS * 5);
      continue;
    }
    if (matches.length === 0) break;
    fetched += matches.length;

    for (const m of matches) {
      const hlLeague = m.league;
      const leagueId = hlLeague === 'NHL' ? nhlId : hlLeague === 'NCAA' ? ncaaId : null;
      if (!leagueId) { skipped++; continue; }

      const homeAbbr = m.homeTeam?.abbreviation;
      const awayAbbr = m.awayTeam?.abbreviation;
      let homeId = abbrevToTeamId.get(homeAbbr);
      let awayId = abbrevToTeamId.get(awayAbbr);
      if (!homeId) homeId = nameNormToId.get(normalizeTeamName(m.homeTeam?.displayName || m.homeTeam?.name));
      if (!awayId) awayId = nameNormToId.get(normalizeTeamName(m.awayTeam?.displayName || m.awayTeam?.name));
      if (!homeId || !awayId) { skipped++; continue; }

      if (existingHlIds.has(m.id)) { matched++; continue; }

      const [hScore, aScore] = parseScore(m.state?.score?.current);
      buf.push({
        home_team_id: homeId,
        away_team_id: awayId,
        league_id: leagueId,
        scheduled_at: m.date,
        home_score: hScore,
        away_score: aScore,
        status: mapStatus(m.state),
        season: m.season ? `${m.season}-${(m.season + 1).toString().slice(-2)}` : null,
        game_data: { highlightly_id: m.id, round: m.round || null, league: hlLeague },
      });
      matched++;
      if (buf.length >= BATCH) {
        const { error } = await supabase.from('fixtures').insert(buf);
        if (!error) upserted += buf.length;
        else console.error(`\nUpsert error: ${error.message}`);
        buf.length = 0;
      }
    }
    process.stdout.write(`  offset=${offset.toString().padStart(5)} fetched=${fetched.toString().padStart(5)} matched=${matched.toString().padStart(4)} skipped=${skipped.toString().padStart(4)} upserted=${upserted.toString().padStart(4)}\r`);
    offset += PAGE;
    await sleep(RATE_MS);
  }
  // Final flush
  if (buf.length > 0) {
    const { error } = await supabase.from('fixtures').insert(buf);
    if (!error) upserted += buf.length;
  }
  console.log(`\n=== Done ===`);
  console.log(`Total fetched:    ${fetched}`);
  console.log(`Matched (NHL/NCAA): ${matched}`);
  console.log(`Skipped (no team):  ${skipped}`);
  console.log(`Upserted (new):     ${upserted}`);
}

main().catch(e => { console.error('Failed:', e); process.exit(1); });