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

  const record = {
    id: crypto.randomUUID(),
    home_team_id: null,
    away_team_id: null,
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
          .update({ home_score: homeScore, away_score: awayScore, status, game_data, updated_at: new Date().toISOString() })
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
  const date = (dateArg ? dateArg.split('=')[1] : 'today').trim();
  const dateStr = date === 'today' ? today() : date;

  console.log(`\n🏒 NHL Live Game Sync | ${date} | dry=${dryRun}`);
  console.log(`${'─'.repeat(55)}`);

  // Fetch both today's scores and the 7-day schedule
  const [scores, allGames] = await Promise.all([
    fetchScores(dateStr),
    fetchScheduleRange(dateStr, 7),
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