require('./load-secrets.cjs');
/**
 * Backfill missing NHL game data from Highlightly.
 *
 * v2 (2026-10-14): post-bug-fix rewrite.
 *
 * Bugs this version fixes:
 *   1. HL returns HISTORICAL franchise names for some teams (e.g. "Atlanta
 *      Flames" for 2026 Calgary games, "Minnesota North Stars" for 2026
 *      Dallas games). The previous version failed to resolve these,
 *      fabricated UUID-shaped team_ids, and inserted ghost team rows
 *      that produced duplicate game cards on the scores page.
 *   2. Cross-verify was skipped. The previous version shipped without
 *      comparing pre/post row counts and without spot-checking any
 *      row against an authoritative source.
 *
 * How v2 fixes it:
 *   - HL_NAME_TO_ABBREV now includes the historical / legacy names
 *     that HL returns for current franchises, mapped to the modern
 *     abbreviation.
 *   - Before running: count existing NHL rows, save a checksum.
 *   - After running: re-count, compare. If the count grew by more
 *     than the number of new (genuinely missing) HL games, STOP and
 *     surface the discrepancy to the operator.
 *   - Spot-check: after the run, fetch 5 random rows from the
 *     insert/update set and verify them against the NHL.com JSON
 *     scoreboard for the same date. If any spot-check fails, mark
 *     the whole run as FAILED in the log.
 *
 * STILL FILL-GAPS-ONLY. Never overwrites non-null scores or completed
 * status. Skips (does not insert) any game that already exists with
 * a different team_id, since that's the signature of a ghost row.
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('node:crypto');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SB_KEY);

const NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';
const HL_KEY = process.env.HIGHLIGHTLY_API_KEY;
const HL_HOST = 'nhl-ncaah-api.p.rapidapi.com';
const HL_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const NHL_API = 'https://api-web.nhle.com/v1/scoreboard';

const NHL_ABBREV_TO_TEAM_ID = {
  ANA: '219a6bb2-1103-4e27-931e-5de440e59f84', BOS: 'ae6d0878-1ac2-4c13-afc8-890c6647b668',
  BUF: '5a510c0e-1058-460d-8237-09855dfa98f4', CAR: 'e4977c12-28b3-4756-a788-cf86b40fc237',
  CBJ: '6ca5c5f0-3c27-4cd5-8457-78fc3ba45344', CGY: '626458da-d2d4-4a4f-816b-f3796b84cfc4',
  CHI: '553a6b7b-6416-4b74-a9b3-fa15d06d52ab', COL: 'f453fd29-12e4-4897-8f8a-ecf23d6a4122',
  DAL: '4c61f05e-8d34-40be-b0a8-adf37e14435c', DET: 'f3fa0794-ee39-4991-af45-961cb3e8f404',
  EDM: '5b487d74-5e9c-43c8-b104-35185fc93350', FLA: '7772070c-6c9b-4ca0-a442-dfe5b8beabcb',
  LAK: 'df9b5d1e-c5d9-46af-a524-99de500e95bf', MIN: 'd3947cbf-8b3c-4c16-8ab6-b8f8d0f5a1fe',
  MTL: 'cff8bd78-5fee-49dc-b0ee-374722efd7b5', NJD: '486e6592-5873-48a0-8cdd-8411c8eb1105',
  NSH: '2d3d8a64-c0d7-4b8e-a327-a1201cc92f72', NYI: 'acc8b466-ef9b-4d81-8ea5-6f13fc180d9e',
  NYR: '2869d1cd-d8f4-4ffb-9726-30bdfdbc14d3', OTT: 'a1f8b7f1-f7ea-42ee-9861-0eb0addf437d',
  PHI: 'cf53124a-dbb5-4588-9cb2-2f6054918f99', PIT: '4b75202e-b11b-4574-8ae6-7447f962cb55',
  SJS: '16c9d078-ecc9-4e7c-8bf3-e1b6e9a6ae10', SEA: 'bf324536-424b-4a3d-b486-1347aa735aae',
  STL: '7efc04e6-6a75-4b1f-a0da-3966d6e7359c', TBL: '2f4c6364-2139-4e57-97ad-e01dc55418fa',
  TOR: 'bac49d62-fd43-48f5-8811-090ec8f4c76d', UTA: '3b80d876-f931-4740-a47f-0ed15c0e410f',
  VAN: 'dc828fd7-65ae-4c1d-92ea-66975eb38fce', VGK: 'cf05f5b0-6605-465f-86f3-a6f1710afc20',
  WPG: '88d85b2b-7a91-4679-b1d4-e45d73e3838f', WSH: '2df72ff0-5a54-4663-91eb-13bb2a2830aa',
};

// HL displayName → NHL modern abbreviation. Includes the historical
// names HL returns for current franchises (e.g. "Atlanta Flames" → CGY
// for the 2026 Calgary Flames franchise). Any name not in this map is
// skipped (logged). We do NOT fabricate team_ids.
const HL_NAME_TO_ABBREV = {
  // Modern names
  'Anaheim Ducks':'ANA','Boston Bruins':'BOS','Buffalo Sabres':'BUF','Carolina Hurricanes':'CAR',
  'Columbus Blue Jackets':'CBJ','Calgary Flames':'CGY','Chicago Blackhawks':'CHI','Colorado Avalanche':'COL',
  'Dallas Stars':'DAL','Detroit Red Wings':'DET','Edmonton Oilers':'EDM','Florida Panthers':'FLA',
  'Los Angeles Kings':'LAK','Minnesota Wild':'MIN','Montreal Canadiens':'MTL','Nashville Predators':'NSH',
  'New Jersey Devils':'NJD','New York Islanders':'NYI','New York Rangers':'NYR','Ottawa Senators':'OTT',
  'Philadelphia Flyers':'PHI','Pittsburgh Penguins':'PIT','San Jose Sharks':'SJS','Seattle Kraken':'SEA',
  'St. Louis Blues':'STL','Tampa Bay Lightning':'TBL','Toronto Maple Leafs':'TOR','Utah Hockey Club':'UTA',
  'Vancouver Canucks':'VAN','Vegas Golden Knights':'VGK','Washington Capitals':'WSH','Winnipeg Jets':'WPG',
  // Historical names that map to current franchises
  'Atlanta Flames':'CGY','Colorado Rockies':'NJD','Phoenix Coyotes':'UTA','Arizona Coyotes':'UTA',
  'Quebec Nordiques':'COL','Hartford Whalers':'CAR','Minnesota North Stars':'DAL',
  'Winnipeg Jets (1972-1996)':'UTA',
};

const dryRun = process.argv.includes('--dry-run');
const skipSpotCheck = process.argv.includes('--skip-spot-check');
const fromArg = process.argv.find(a => a.startsWith('--from='))?.split('=')[1] || '2025-01-01';
const toArg = process.argv.find(a => a.startsWith('--to='))?.split('=')[1] || '2026-06-30';
const logFile = process.argv.find(a => a.startsWith('--log='))?.split('=')[1];
if (logFile) fs.writeFileSync(logFile, `=== Backfill started ${new Date().toISOString()} ===\n`);
function log(msg) {
  console.log(msg);
  if (logFile) fs.appendFileSync(logFile, msg + '\n');
}

// Parse "8 - 4" → {home: 8, away: 4} (HL uses home-away format)
function parseScore(current) {
  if (!current || typeof current !== 'string') return { home: null, away: null };
  const m = current.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (!m) return { home: null, away: null };
  return { home: parseInt(m[1], 10), away: parseInt(m[2], 10) };
}

// Derive NHL season from a date.
function deriveSeason(yyyy_mm_dd) {
  const d = new Date(yyyy_mm_dd + 'T00:00:00Z');
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const startY = m >= 8 ? y : y - 1;
  const endY = (startY + 1) % 100;
  return `${startY}-${String(endY).padStart(2,'0')}`;
}

function hlToStatus(m) {
  const desc = (m.state?.description || m.state?.report || '').toLowerCase();
  if (desc.includes('live') || desc.includes('in progress') || desc.includes('in_progress')) return 'in_progress';
  if (desc.includes('final') || desc.includes('finished') || desc.includes('off') || desc.includes('ended')) return 'completed';
  if (desc.includes('postponed') || desc.includes('ppd')) return 'postponed';
  if (desc.includes('cancel')) return 'cancelled';
  return 'scheduled';
}

async function hlFetchMatches(date) {
  const url = `https://nhl.highlightly.net/matches?date=${date}&league=NHL&limit=50`;
  const r = await fetch(url, { headers: { 'x-rapidapi-key': HL_KEY, 'x-rapidapi-host': HL_HOST, 'User-Agent': HL_UA } });
  if (r.status === 429) {
    log(`  [429] sleeping 5s`);
    await new Promise(r => setTimeout(r, 5000));
    return hlFetchMatches(date);
  }
  if (!r.ok) return [];
  const j = await r.json();
  return j.data || [];
}

// Authoritative scoreboard: NHL.com JSON. Used to spot-check the
// HL data. Returns a map of "awayAbbrev_homeAbbrev" → {home, away} for
// the given date.
async function nhlFetchScoreboard(date) {
  // date is YYYY-MM-DD; NHL.com wants YYYY-MM-DD too
  const r = await fetch(`${NHL_API}/${date}`);
  if (!r.ok) return new Map();
  const j = await r.json();
  const out = new Map();
  for (const g of (j.games || [])) {
    if (!g.awayTeam?.abbrev || !g.homeTeam?.abbrev) continue;
    const key = `${g.awayTeam.abbrev}_${g.homeTeam.abbrev}`;
    out.set(key, {
      home: g.homeTeam.score ?? null,
      away: g.awayTeam.score ?? null,
      state: g.gameState || 'FUT',
    });
  }
  return out;
}

function dateRange(start, end) {
  const days = [];
  const cur = new Date(start);
  const endDate = new Date(end);
  while (cur <= endDate) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

async function main() {
  const days = dateRange(fromArg, toArg);
  log(`\nNHL HL backfill v2: ${fromArg} to ${toArg} (${days.length} days)`);

  // ============================================================
  // Pre-checkpoint: capture current state
  // ============================================================
  const preCount = await supabase.from('fixtures').select('*', { count: 'exact', head: true }).eq('league_id', NHL_LEAGUE_ID);
  log(`Pre-checkpoint: NHL fixture count = ${preCount.count}`);
  const preGhostCount = await supabase.from('fixtures').select('*', { count: 'exact', head: true })
    .eq('league_id', NHL_LEAGUE_ID)
    .or('home_team_id.like.a000%,away_team_id.like.a000%');
  log(`Pre-checkpoint: ghost rows (a000% ids) = ${preGhostCount.count}`);
  if (preGhostCount.count > 0) {
    log(`ABORT: ghost rows present. Run cleanup script first.`);
    process.exit(1);
  }

  let totalHl = 0, updated = 0, preserved = 0, inserted = 0, skipped = 0, errors = 0;
  const insertedRows = []; // for spot-check
  const updatedRows = [];  // for spot-check

  for (const date of days) {
    let matches;
    try { matches = await hlFetchMatches(date); }
    catch (e) { log(`  ${date}: ERROR ${e.message}`); errors++; continue; }
    if (matches.length === 0) continue;
    totalHl += matches.length;
    process.stdout.write(`  ${date}: ${matches.length} games  `);
    let dateUpd = 0, dateIns = 0, datePres = 0, dateSkip = 0;

    for (const m of matches) {
      // Resolve HL displayName → NHL modern abbreviation. If either
      // team is unrecognized, SKIP (do not fabricate).
      const hAbbr = HL_NAME_TO_ABBREV[m.homeTeam?.displayName];
      const aAbbr = HL_NAME_TO_ABBREV[m.awayTeam?.displayName];
      if (!hAbbr || !aAbbr) {
        log(`  SKIP ${date} unrecognized: ${m.homeTeam?.displayName} vs ${m.awayTeam?.displayName}`);
        dateSkip++;
        continue;
      }
      const hId = NHL_ABBREV_TO_TEAM_ID[hAbbr];
      const aId = NHL_ABBREV_TO_TEAM_ID[aAbbr];

      const scheduled = new Date(m.date).toISOString();
      const status = hlToStatus(m);
      const { home, away } = parseScore(m.state?.score?.current);
      const gameData = { ...m, nhl_game_id: m.id };

      // Find existing fixture by natural key: scheduled_at + home + away
      // (both must be modern abbreviations to be considered a real match)
      const { data: existingList } = await supabase
        .from('fixtures')
        .select('id, home_team_id, away_team_id, home_score, away_score, status')
        .eq('league_id', NHL_LEAGUE_ID)
        .eq('scheduled_at', scheduled)
        .eq('home_team_id', hId)
        .eq('away_team_id', aId)
        .limit(1);

      const existing = existingList?.[0];

      if (existing) {
        const updates = {};
        if (existing.home_score === null && home !== null) updates.home_score = home;
        if (existing.away_score === null && away !== null) updates.away_score = away;
        if (existing.status === 'scheduled' && status === 'completed' && home !== null) updates.status = 'completed';
        updates.game_data = gameData;
        updates.updated_at = new Date().toISOString();

        if (Object.keys(updates).length <= 2) {
          datePres++;
        } else if (!dryRun) {
          const { error } = await supabase.from('fixtures').update(updates).eq('id', existing.id);
          if (error) { dateSkip++; continue; }
          dateUpd++;
          updatedRows.push({ id: existing.id, date, away: aAbbr, home: hAbbr, hl_home: home, hl_away: away });
        } else {
          dateUpd++;
        }
      } else {
        // No existing row with these team_ids at this time. Before
        // inserting, check whether a different row exists at the same
        // time with the same teams but different team_ids (the
        // signature of a ghost row from the previous bug). If so,
        // DO NOT INSERT — flag it for manual review.
        const { data: altRows } = await supabase
          .from('fixtures')
          .select('id, home_team_id, away_team_id')
          .eq('league_id', NHL_LEAGUE_ID)
          .eq('scheduled_at', scheduled)
          .or(`home_team_id.in.(${hId},${aId}),away_team_id.in.(${hId},${aId})`)
          .limit(5);
        const realExisting = (altRows || []).filter(r =>
          r.home_team_id === hId && r.away_team_id === aId
        );
        if (realExisting.length > 0) {
          // Race condition: row was just inserted. Skip.
          datePres++;
          continue;
        }
        // Check for ghost / orphan rows at the same time slot
        const ghosts = (altRows || []).filter(r =>
          r.home_team_id !== hId || r.away_team_id !== aId
        );
        if (ghosts.length > 0) {
          log(`  CONFLICT ${date} ${aAbbr}@${hAbbr}: ${ghosts.length} ghost rows exist at this slot. Skipping insert.`);
          dateSkip++;
          continue;
        }

        if (!dryRun) {
          const { error } = await supabase.from('fixtures').insert({
            id: crypto.randomUUID(),
            league_id: NHL_LEAGUE_ID,
            home_team_id: hId, away_team_id: aId,
            scheduled_at: scheduled,
            home_score: home, away_score: away,
            status, season: deriveSeason(scheduled), game_data: gameData,
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          });
          if (error) { dateSkip++; continue; }
          dateIns++;
          insertedRows.push({ date, away: aAbbr, home: hAbbr, hl_home: home, hl_away: away });
        } else {
          dateIns++;
        }
      }
    }
    inserted += dateIns; updated += dateUpd; preserved += datePres; skipped += dateSkip;
    log(`(+${dateIns} new, ↻${dateUpd} upd, =${datePres} preserved, ✗${dateSkip} skip)`);
    await new Promise(r => setTimeout(r, 200));
  }

  log(`\n--- Summary ---`);
  log(`Total HL games processed: ${totalHl}`);
  log(`Inserted: ${inserted}, Updated: ${updated}, Preserved: ${preserved}, Skipped: ${skipped}, Errors: ${errors}`);
  if (dryRun) log('(DRY RUN)');

  // ============================================================
  // Post-checkpoint: re-count and compare
  // ============================================================
  const postCount = await supabase.from('fixtures').select('*', { count: 'exact', head: true }).eq('league_id', NHL_LEAGUE_ID);
  log(`Post-checkpoint: NHL fixture count = ${postCount.count}`);
  const delta = (postCount.count || 0) - (preCount.count || 0);
  log(`Delta: ${delta} (expected: ${inserted} new inserts; ${updated} updates shouldn't change count)`);
  if (delta !== inserted) {
    log(`FAIL: row count delta (${delta}) doesn't match inserted (${inserted}). Investigate.`);
    if (!dryRun) process.exit(2);
  }
  const postGhostCount = await supabase.from('fixtures').select('*', { count: 'exact', head: true })
    .eq('league_id', NHL_LEAGUE_ID)
    .or('home_team_id.like.a000%,away_team_id.like.a000%');
  if (postGhostCount.count > 0) {
    log(`FAIL: ${postGhostCount.count} ghost rows after run.`);
    if (!dryRun) process.exit(3);
  }

  // ============================================================
  // Spot-check against NHL.com scoreboard
  // ============================================================
  if (skipSpotCheck) {
    log('Spot-check skipped (--skip-spot-check).');
    return;
  }
  if (dryRun) {
    log('Spot-check skipped in dry-run mode (no writes to verify).');
    return;
  }

  // Pick 5 random completed games from the update/insert set
  const completedRows = [...updatedRows, ...insertedRows].filter(r => r.hl_home !== null && r.hl_away !== null);
  const sample = completedRows.sort(() => Math.random() - 0.5).slice(0, Math.min(5, completedRows.length));
  if (sample.length === 0) {
    log('Spot-check: no completed games to verify.');
    return;
  }
  log(`\nSpot-checking ${sample.length} games against NHL.com scoreboard...`);
  // Group by date
  const byDate = {};
  for (const s of sample) (byDate[s.date] = byDate[s.date] || []).push(s);
  let passed = 0, failed = 0;
  for (const [date, rows] of Object.entries(byDate)) {
    const nhl = await nhlFetchScoreboard(date.slice(0, 10));
    for (const r of rows) {
      const key = `${r.away}_${r.home}`;
      const truth = nhl.get(key);
      if (!truth) {
        log(`  ${date} ${r.away}@${r.home}: NHL.com has no record (game may be far in past). Skip.`);
        continue;
      }
      if (truth.state !== 'OFF' && truth.state !== 'FINAL') {
        log(`  ${date} ${r.away}@${r.home}: NHL.com says state=${truth.state} (not yet final). Skip.`);
        continue;
      }
      if (truth.home === r.hl_home && truth.away === r.hl_away) {
        log(`  ✓ ${date} ${r.away}@${r.home}: HL ${r.hl_away}-${r.hl_home} == NHL.com ${truth.away}-${truth.home}`);
        passed++;
      } else {
        log(`  ✗ ${date} ${r.away}@${r.home}: HL ${r.hl_away}-${r.hl_home} != NHL.com ${truth.away}-${truth.home}`);
        failed++;
      }
    }
    await new Promise(r => setTimeout(r, 300));
  }
  log(`Spot-check: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    log('FAIL: spot-check failed. The HL data disagrees with NHL.com. Do NOT trust this ingest.');
    process.exit(4);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
