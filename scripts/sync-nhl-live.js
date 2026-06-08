/**
 * NHL Live Game Sync — Fetches current playoff scores from NHL API and upserts to Supabase
 * Run: node scripts/sync-nhl-live.js [--dry-run] [--date=YYYY-MM-DD]
 *
 * Uses crypto.randomUUID() for Supabase IDs, stores NHL game ID in game_data.nhl_game_id
 */
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SB_KEY = '***REMOVED***';
const supabase = createClient(SUPABASE_URL, SB_KEY);

const NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';
const NHL_API = 'https://api-web.nhle.com/v1';

// Hardcoded NHL abbrev → Supabase UUID map (defense against team table lookup failure)
const NHL_ABBREV_TO_UUID = {
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
  PHI: 'cf53124a-dbb5-4663-91eb-13bb2a2830aa', PIT: '4b75202e-b11b-4574-8ae6-7447f962cb55',
  SJS: '16c9d078-ecc9-4e7c-8bf3-e1b6e9a6ae10', SEA: 'bf324536-424b-4a3d-b486-1347aa735aae',
  STL: '7efc04e6-6a75-4b1f-a0da-3966d6e7359c', TBL: '2f4c6364-2139-4e57-97ad-e01dc55418fa',
  TOR: 'bac49d62-fd43-48f5-8811-090ec8f4c76d', UTA: '3b80d876-f931-4740-a47f-0ed15c0e410f',
  VAN: 'dc828fd7-65ae-4c1d-92ea-66975eb38fce', VGK: 'cf05f5b0-6605-465f-86f3-a6f1710afc20',
  WPG: '88d85b2b-7a91-4679-b1d4-e45d73e3838f', WSH: '2df72ff0-5a54-4663-91eb-13bb2a2830aa',
};

// Resolve abbrev → team_id (try DB first, fall back to hardcoded map)
const _teamCache = new Map();
async function resolveTeamId(abbrev) {
  if (!abbrev) return null;
  if (_teamCache.has(abbrev)) return _teamCache.get(abbrev);
  // Try DB lookup
  const { data } = await supabase.from('teams').select('id').eq('abbreviation', abbrev).limit(1);
  if (data && data.length > 0) {
    _teamCache.set(abbrev, data[0].id);
    return data[0].id;
  }
  // Fall back to hardcoded map
  const fallback = NHL_ABBREV_TO_UUID[abbrev] || null;
  if (fallback) _teamCache.set(abbrev, fallback);
  return fallback;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function toDate(str) { return str ? new Date(str).toISOString() : null; }

async function nhlFetch(path) {
  const res = await fetch(`${NHL_API}${path}`);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}

function today() { return new Date().toISOString().slice(0, 10); }

function mapStatus(state) {
  if (state === 'OFF' || state === 'FINAL' || state === 'FINAL OT' || state === 'FINAL SO') return 'completed';
  if (state === 'FUT' || state === 'PRE' || state === 'Scheduled') return 'scheduled';
  if (state === 'POST' || state === 'ING' || state === 'LIVE') return 'in_progress';
  if (state === 'PPD' || state === 'POSTPONED') return 'postponed';
  return 'scheduled';
}

// ─── Fetch from NHL API ────────────────────────────────────────────────────────
async function fetchScores(date) {
  const data = await nhlFetch(`/score/${date}`);
  if (!data) return [];
  return (data.games || []).filter(g => g.gameState === 'OFF' || g.gameState === 'FINAL');
}

async function fetchScheduleRange(startDate, days = 7) {
  const dates = [];
  const d = new Date(startDate);
  for (let i = 0; i < days; i++) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  const all = [];
  for (let i = 0; i < dates.length; i += 3) {
    const chunk = dates.slice(i, i + 3);
    const data = await nhlFetch(`/schedule/${chunk[0]}`);
    if (!data) continue;
    for (const day of (data.gameWeek || [])) {
      for (const g of (day.games || [])) all.push(g);
    }
    if (chunk.length > 1) await sleep(200);
  }
  return all;
}

// ─── Upsert game ──────────────────────────────────────────────────────────────
async function upsertGame(game, dryRun = false) {
  const nhlGameId = String(game.id || '');
  if (!nhlGameId) return { ok: false, reason: 'no game ID' };

  const awayAbbr = game.awayTeam?.abbrev || '';
  const homeAbbr = game.homeTeam?.abbrev || '';
  const awayScore = game.awayTeam?.score ?? null;
  const homeScore = game.homeTeam?.score ?? null;
  const status = mapStatus(game.gameState);
  const scheduled = toDate(game.startTimeUTC || game.gameDate);
  const season = game.season || '2025-26';

  const game_data = {
    nhl_game_id: nhlGameId,
    source: 'nhl_api',
    game_state: game.gameState,
    period_descriptor: game.periodDescriptor || null,
    series_description: game.seriesDescription || null,
    venue: game.venue?.default || null,
    tv_broadcasts: game.tvBroadcasts || [],
    clock: game.clock || null,
    game_outcome: game.gameOutcome || null,
    away_team: game.awayTeam,
    home_team: game.homeTeam,
  };

  // Resolve team IDs (defense: never insert NULL team_ids)
  const homeTeamId = await resolveTeamId(homeAbbr);
  const awayTeamId = await resolveTeamId(awayAbbr);
  if (!homeTeamId || !awayTeamId) {
    return { ok: false, reason: `unknown team abbrev: ${awayAbbr}@${homeAbbr}` };
  }

  const record = {
    id: crypto.randomUUID(),
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    league_id: NHL_LEAGUE_ID,
    venue_id: null,
    scheduled_at: scheduled,
    home_score: homeScore,
    away_score: awayScore,
    status,
    season,
    game_data,
    updated_at: new Date().toISOString(),
  };

  if (dryRun) {
    console.log(`  [DRY] ${nhlGameId} | ${awayAbbr} ${awayScore ?? '-'} @ ${homeAbbr} ${homeScore ?? '-'} | [${status}] ${scheduled?.slice(0, 10)}`);
    return { ok: true };
  }

  // Try insert; if duplicate key error, fetch existing and update
  const { error } = await supabase.from('fixtures').insert(record);
  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('23505')) {
      // Find by nhl_game_id in game_data and update
      const { data: match } = await supabase
        .from('fixtures')
        .select('id, game_data')
        .eq('league_id', NHL_LEAGUE_ID)
        .order('created_at', { ascending: false })
        .limit(10);

      let foundId = null;
      for (const m of (match || [])) {
        const nid = m.game_data?.nhl_game_id;
        if (nid && String(nid) === nhlGameId) { foundId = m.id; break; }
      }

      if (foundId) {
        const { error: updErr } = await supabase
          .from('fixtures')
          .update({
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            home_score: homeScore,
            away_score: awayScore,
            status,
            game_data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', foundId);
        if (updErr) return { ok: false, reason: updErr.message };
        return { ok: true };
      }
      // NHL game ID not found in DB — try deleting duplicate UUID and re-inserting
      return { ok: false, reason: `duplicate without match: ${error.message.slice(0, 80)}` };
    }
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const dateArg = process.argv.find(a => a.startsWith('--date='));
  let date;
  if (dateArg) {
    const param = dateArg.split('=')[1];
    date = param === 'today' ? today() : param;
  } else {
    date = today();
  }

  console.log(`\n🏒 NHL Live Game Sync | ${date} | dry=${dryRun}`);
  console.log(`${'─'.repeat(55)}`);

  // Fetch both today's scores and the 7-day schedule
  const [scores, allGames] = await Promise.all([
    fetchScores(date),
    fetchScheduleRange(date, 7),
  ]);

  const playoff = allGames.filter(g => g.gameType === 3);
  const future = playoff.filter(g => g.gameState === 'FUT');

  console.log(`\n📊 Completed games (${date}): ${scores.length}`);
  for (const g of scores) {
    console.log(`   ✓ ${g.awayTeam?.abbrev} ${g.awayTeam?.score} @ ${g.homeTeam?.abbrev} ${g.homeTeam?.score} | Game ${g.id}`);
  }

  console.log(`\n📅 Upcoming playoff games (7 days): ${future.length}`);
  for (const g of future) {
    console.log(`   → ${g.awayTeam?.abbrev} @ ${g.homeTeam?.abbrev} | Game ${g.id} | ${g.startTimeUTC?.slice(0, 10)}`);
  }

  // Deduplicate
  const seen = new Set();
  const unique = [...scores, ...future].filter(g => {
    const id = String(g.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  console.log(`\n💾 Upserting ${unique.length} game(s)${dryRun ? ' [DRY RUN]' : ''}...`);
  let ok = 0, err = 0;
  for (const g of unique) {
    const nhlId = String(g.id);
    const abbr = `${g.awayTeam?.abbrev || '?'}@${g.homeTeam?.abbrev || '?'}`;
    process.stdout.write(`   ${nhlId} [${g.gameState}] ${abbr}... `);
    const result = await upsertGame(g, dryRun);
    console.log(result.ok ? '✓' : `✗ ${result.reason.slice(0, 60)}`);
    if (result.ok) ok++; else err++;
    await sleep(100);
  }

  const { count } = await supabase.from('fixtures').select('id', { count: 'exact', head: true });
  console.log(`\n${'─'.repeat(55)}`);
  console.log(`   ✅ ${ok} written | ❌ ${err} failed | Total fixtures: ${count}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });