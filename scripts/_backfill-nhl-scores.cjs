#!/usr/bin/env node
/**
 * _backfill-nhl-scores.cjs
 *
 * Backfill scores for completed NHL games from NHL.com's schedule endpoint.
 * The daily ingest cron has been timing out for days, leaving 0-0 scores
 * on every game that's finished since the last successful run.
 *
 * 2026-10-05: One-shot backfill. For each date in the window, fetch the
 * NHL.com schedule, find the matching DB row by team_id + scheduled_at,
 * and update home_score/away_score + status='completed'.
 *
 * Usage: node scripts/_backfill-nhl-scores.cjs --days=10
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const NHL_LEAGUE_ID = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const DAYS = parseInt(String(args.days ?? '10'), 10);
const DRY_RUN = !!args['dry-run'];

async function fetchNhlSchedule(dateIso) {
  const url = `https://api-web.nhle.com/v1/schedule/${dateIso}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) return [];
  const data = await res.json();
  const target = (data.gameWeek || []).find(d => d.date === dateIso);
  return target ? (target.games || []) : [];
}

function abbrevFromNhlTeam(team) {
  if (!team) return null;
  const abbrev = team.abbrev;
  if (typeof abbrev === 'string') return abbrev.toUpperCase();
  if (typeof abbrev === 'object' && abbrev?.default) return String(abbrev.default).toUpperCase();
  return null;
}

async function main() {
  console.log('=== NHL scores backfill ===');
  console.log(`Days: ${DAYS} | Dry run: ${DRY_RUN}`);

  // Load all team_workspaces with their abbrev (we use name-based match)
  // since NHL.com uses abbrev but DB has full names. 2026-10-05: paginate
  // — supabase-js default page size is 1000, and NHL teams are at the
  // tail of the alphabet (Vancouver, Washington, etc.).
  const teams = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('teams')
      .select('id, name, slug')
      .range(from, from + 999);
    if (error) {
      console.log('team fetch err:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    teams.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  if (teams.length === 0) {
    console.log('Failed to load teams');
    return;
  }
  // Build a name lookup that strips accents so 'Montréal Canadiens'
  // matches 'Montreal Canadiens' (the DB has the unaccented form).
  const stripAccents = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const teamByName = new Map();
  for (const t of teams) {
    teamByName.set(stripAccents(t.name).toLowerCase(), t.id);
  }
  // 2026-10-05: add aliases for teams that were renamed. The DB has
  // 'Utah Hockey Club' but NHL.com's 2026-27 season uses 'Utah Mammoth'.
  // The 2026-27 schedule ingest used the old name. So when NHL.com
  // says 'Utah Mammoth', we also try to match 'Utah Hockey Club'.
  const TEAM_ALIASES = {
    'utah mammoth': 'utah hockey club',
  };
  console.log(`Loaded ${teams.length} teams`);

  const today = new Date();
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let d = DAYS; d >= 0; d--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - d);
    const dateStr = date.toISOString().slice(0, 10);
    process.stdout.write(`${dateStr}: `);
    const games = await fetchNhlSchedule(dateStr);
    if (games.length === 0) {
      console.log('no games');
      continue;
    }
    let dayUpdated = 0;
    for (const g of games) {
      const ht = g.homeTeam || {};
      const at = g.awayTeam || {};
      const htName = ht.placeName?.default && ht.commonName?.default
        ? `${ht.placeName.default} ${ht.commonName.default}`
        : null;
      const atName = at.placeName?.default && at.commonName?.default
        ? `${at.placeName.default} ${at.commonName.default}`
        : null;
      if (!htName || !atName) continue;
      const homeKey = stripAccents(htName).toLowerCase();
      const awayKey = stripAccents(atName).toLowerCase();
      // 2026-10-05: try the ALIAS key first, not the direct key. The DB
      // has 'Utah Hockey Club' (old name) but NHL.com's 2026-27 season
      // uses 'Utah Mammoth'. If we try direct first we'd find the new
      // team_id but the DB row has the OLD team_id, so the update would
      // find zero rows. Using the alias finds the OLD team_id that
      // matches the existing DB row.
      const homeTeamId = teamByName.get(TEAM_ALIASES[homeKey] || homeKey);
      const awayTeamId = teamByName.get(TEAM_ALIASES[awayKey] || awayKey);
      if (!homeTeamId || !awayTeamId) {
        skipped++;
        continue;
      }
      // Find the fixture
      const startTime = g.startTimeUTC;
      const homeScore = ht.score ?? null;
      const awayScore = at.score ?? null;
      const isFinal = g.gameState === 'OFF' || g.gameState === 'FINAL';
      const status = isFinal ? 'completed' : 'scheduled';
      if (!DRY_RUN) {
        const { error, count } = await supabase
          .from('fixtures')
          .update({ home_score: homeScore, away_score: awayScore, status }, { count: 'exact' })
          .eq('league_id', NHL_LEAGUE_ID)
          .eq('home_team_id', homeTeamId)
          .eq('away_team_id', awayTeamId)
          .eq('scheduled_at', startTime);
        if (error) {
          failed++;
          console.log(`\n  ✗ ${atName} @ ${htName}: ${error.message}`);
        } else if (count && count > 0) {
          updated += count;
          dayUpdated += count;
        }
      } else {
        console.log(`\n  [dry] ${atName} @ ${htName}: ${awayScore}-${homeScore} (${status})`);
      }
    }
    process.stdout.write(`updated=${dayUpdated}\n`);
  }

  console.log(`\nTotal: updated=${updated} skipped=${skipped} failed=${failed}`);
  if (DRY_RUN) console.log('(dry run - no changes made)');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
