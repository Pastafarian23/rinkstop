/**
 * Supabase → playoff-games.json Sync
 * Run: node scripts/sync-playoff-json.js [--dry-run]
 *
 * Reads NHL fixtures from Supabase, updates data/playoff-games.json in place.
 * Updates: scores, status, periodDisplay for completed/live games.
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://yszheonqyyskkjoxoexk.supabase.co';
const SB_KEY = '***REMOVED***';
const supabase = createClient(SUPABASE_URL, SB_KEY);

const NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';
const GAMES_FILE = path.join(process.cwd(), 'data', 'playoff-games.json');

// ─── Helpers ───────────────────────────────────────────────────────────────
function mapStatus(state) {
  if (state === 'completed') return 'completed';
  if (state === 'in_progress') return 'inProgress';
  if (state === 'scheduled') return 'scheduled';
  return state;
}

function loadFile() {
  return JSON.parse(fs.readFileSync(GAMES_FILE, 'utf-8'));
}

function utcDate(str) {
  if (!str) return null;
  return new Date(str).toISOString().slice(0, 10);
}

function getGameAbbr(g) {
  const a = (g.awayTeam || {}).abbr || (g.awayTeam || {}).abbrev || '';
  const h = (g.homeTeam || {}).abbr || (g.homeTeam || {}).abbrev || '';
  return `${a}@${h}`;
}

// Find the best matching game in allGames for a given fixture
function findBestMatch(fixture, allGames) {
  const gd = fixture.game_data || {};
  const nhlId = String(gd.nhl_game_id || '');
  const fixDate = utcDate(fixture.scheduled_at);
  const fixAway = (gd.away_team || {}).abbrev || '';
  const fixHome = (gd.home_team || {}).abbrev || '';

  if (!fixAway || !fixHome) return null;

  // Candidates: same team pair (either order)
  const candidates = allGames.filter(g => {
    const ga = (g.awayTeam || {}).abbr || '';
    const gh = (g.homeTeam || {}).abbr || '';
    const samePair = (ga === fixAway && gh === fixHome) || (ga === fixHome && gh === fixAway);
    if (!samePair) return false;

    // Date must be within 2 days
    if (!fixDate) return true;
    const fd = new Date(fixDate);
    const gg = new Date(g.date ? g.date.slice(0, 10) : '');
    if (isNaN(fd) || isNaN(gg)) return false;
    const diffDays = Math.abs((fd - gg) / (86400000));
    return diffDays <= 2;
  });

  if (!candidates.length) return null;

  // Best match: NHL ID match, then exact date match
  candidates.sort((a, b) => {
    const aNhl = (a.id || '').includes(nhlId) ? 1 : 0;
    const bNhl = (b.id || '').includes(nhlId) ? 1 : 0;
    if (aNhl !== bNhl) return bNhl - aNhl;
    const diffA = Math.abs(new Date(fixDate) - new Date(a.date?.slice(0, 10)));
    const diffB = Math.abs(new Date(fixDate) - new Date(b.date?.slice(0, 10)));
    return diffA - diffB;
  });

  return candidates[0];
}

// ─── Main ────────────────────────────────────────────────────────────────
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`\n🔄 Supabase → playoff-games.json Sync${dryRun ? ' [DRY RUN]' : ''}`);
  console.log(`${'─'.repeat(55)}`);

  const fileData = loadFile();
  const allGames = fileData.games || [];

  // Fetch NHL fixtures — last 30 days + future
  const { data: fixtures, error } = await supabase
    .from('fixtures')
    .select('id, status, home_score, away_score, scheduled_at, game_data, updated_at')
    .eq('league_id', NHL_LEAGUE_ID)
    .order('scheduled_at', { ascending: false });

  if (error) {
    console.error('❌ Supabase query error:', error.message);
    return;
  }

  console.log(`📦 NHL fixtures from Supabase: ${fixtures?.length ?? 0}`);
  for (const f of (fixtures || []).slice(0, 5)) {
    const gd = f.game_data || {};
    console.log(`   NHL:${gd.nhl_game_id} | ${getGameAbbr({awayTeam: gd.away_team, homeTeam: gd.home_team})} | ${f.status} | ${utcDate(f.scheduled_at)}`);
  }

  let updated = 0, skipped = 0;

  for (const f of (fixtures || [])) {
    const gd = f.game_data || {};
    const nhlId = String(gd.nhl_game_id || '?');
    const fixDate = utcDate(f.scheduled_at);
    const fixAway = (gd.away_team || {}).abbrev || '?';
    const fixHome = (gd.home_team || {}).abbrev || '?';

    const match = findBestMatch(f, allGames);

    if (!match) {
      if (nhlId !== '?' && nhlId !== 'undefined') {
        console.log(`   − No match: NHL:${nhlId} | ${fixAway}@${fixHome} | ${fixDate}`);
      }
      skipped++;
      continue;
    }

    const oldStatus = match.status;
    const oldH = match.homeTeam.score;
    const oldA = match.awayTeam.score;

    match.status = mapStatus(f.status);

    if (f.status === 'completed' && f.home_score != null && f.away_score != null) {
      match.homeTeam.score = f.home_score;
      match.awayTeam.score = f.away_score;
      match.homeTeam.winner = f.home_score > f.away_score;
      match.awayTeam.winner = f.away_score > f.home_score;
    }

    if (gd.clock) match.periodDisplay = gd.clock;
    if (gd.period_descriptor?.descriptor) match.periodDisplay = gd.period_descriptor.descriptor;

    const scoreStr = f.status === 'completed'
      ? `${match.homeTeam.score}-${match.awayTeam.score}`
      : f.status === 'scheduled' ? 'scheduled' : `${match.homeTeam.score || '?'}-${match.awayTeam.score || '?'}`;

    console.log(`   ${dryRun ? '⚡' : '✓'} ${match.id} ${match.shortName}: ${oldStatus}/${oldH}-${oldA} → ${match.status}/${scoreStr}`);
    updated++;
  }

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`   ✅ ${updated} updated | ⚠️  ${skipped} no match${dryRun ? ' [DRY RUN — no file written]' : ''}`);

  if (!dryRun) {
    fs.writeFileSync(GAMES_FILE, JSON.stringify(fileData, null, 2));
    console.log(`   💾 Saved to ${GAMES_FILE}`);
  }

  const done = allGames.filter(g => g.status === 'completed').length;
  const live = allGames.filter(g => g.status === 'inProgress').length;
  const sched = allGames.filter(g => g.status === 'scheduled').length;
  console.log(`\n📊 File: ${done} completed | ${live} in progress | ${sched} scheduled`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });