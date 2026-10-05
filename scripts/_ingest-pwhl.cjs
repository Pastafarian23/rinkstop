#!/usr/bin/env node
/**
 * _ingest-pwhl.cjs
 *
 * Pulls PWHL schedule + scores from HockeyTech (client_code=pwhl) and
 * upserts into fixtures. Resolves HT team IDs to RinkStop teams.id by
 * matching on team name.
 *
 * 2026-10-05: PWHL 2026-27 season is the new 8-team league (Boston,
 * Minnesota, Montreal, New York, Ottawa, Toronto, + 4 expansion
 * Detroit/Hamilton/Las Vegas/San Jose/Seattle/Vancouver). The previous
 * 6-team PWHL ingested only the 1st season (2024-25). Full 2026-27
 * backfill.
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PWHL_LEAGUE_ID = '376704ae-d854-462b-a25a-4eb829e20109';  // pwhl-women-usa — the league_id that teams in DB reference
const HT_KEY = '446521baf8c38984';
const HT_CLIENT = 'pwhl';

async function fetchPwhlSchedule() {
  const url = `https://lscluster.hockeytech.com/feed/?feed=modulekit&view=schedule&key=${HT_KEY}&client_code=${HT_CLIENT}&fmt=json&lang=en`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`PWHL HockeyTech HTTP ${res.status}`);
  const j = await res.json();
  return j.SiteKit?.Schedule || [];
}

function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[àáâãäåæ]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõöø]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/ýÿ/g, 'y')
    .replace(/[ñ]/g, 'n')
    .replace(/\bpwhl\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

// Map: normalized HT full-name → normalized DB team name
// The teamMap is keyed by normalizeName(team.name), not slug.
// New PWHL teams have name='PWHL Las Vegas' etc → normalize → 'pwhllasvegas'
const HT_TEAM_TO_RS = {
  'bostonfleet': 'bostonfleet',
  'torontosceptres': 'torontosceptres',
  'montrealvictoire': 'montrealvictoire',
  'ottawacharge': 'ottawacharge',
  'minnesotafrost': 'minnesotafrost',
  'newyorksirens': 'newyorksirens',
  'pwhllasvegas': 'pwhllasvegas',
  'pwhldetroit': 'pwhldetroit',
  'pwhlhamilton': 'pwhlhamilton',
  'pwhlsanjose': 'pwhlsanjose',
  'seattletorrent': 'seattletorrent',
  'vancouvergoldeneyes': 'vancouvergoldeneyes',
};

async function buildTeamMap() {
  // Load from `teams` (the table that fixtures.home_team_id FK references).
  // team_workspaces.id may differ for the same team.
  const map = new Map();
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data: teams, error } = await supabase
      .from('teams')
      .select('id, name, slug')
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('[pwhl] team fetch err:', error.message);
      break;
    }
    if (!teams || teams.length === 0) break;
    for (const t of teams) {
      map.set(normalizeName(t.name), t.id);
    }
    if (teams.length < PAGE) break;
    from += PAGE;
  }
  return map;
}

async function main() {
  console.log('[pwhl] fetching schedule from HockeyTech...');
  const sched = await fetchPwhlSchedule();
  console.log(`[pwhl] got ${sched.length} games`);

  const teamMap = await buildTeamMap();
  console.log(`[pwhl] team map size: ${teamMap.size}`);
  // Debug: specific keys we care about
  for (const k of ['bostonfleet', 'torontosceptres', 'montrealvictoire', 'ottawacharge', 'minnesotafrost', 'newyorkpwhl']) {
    console.log(`  KEY ${k} = ${teamMap.get(k)?.slice(0,8) || 'NULL'}`);
  }
  // Debug: print PWHL/related team keys
  for (const k of [...teamMap.keys()].filter(k => k.includes('ottawa') || k.includes('boston') || k.includes('minnesota'))) {
    console.log(`  map[${k}] = ${teamMap.get(k)?.slice(0,8)}..`);
  }

  let inserted = 0, updated = 0, failed = 0;
  const now = new Date().toISOString();

  for (const g of sched) {
    const homeName = g.home_team_name;
    const awayName = g.visiting_team_name;
    const homeKey = normalizeName(homeName);
    const awayKey = normalizeName(awayName);
    // First try direct match, then look up alias
    const homeAlias = HT_TEAM_TO_RS[homeKey];
    const awayAlias = HT_TEAM_TO_RS[awayKey];
    const homeResolved = homeAlias === undefined ? homeKey : homeAlias;
    const awayResolved = awayAlias === undefined ? awayKey : awayAlias;
    const homeId = homeResolved ? teamMap.get(homeResolved) : null;
    const awayId = awayResolved ? teamMap.get(awayResolved) : null;

    if (!homeId || !awayId) {
      failed++;
      console.log(`[pwhl] no team match: "${homeName}" (key=${homeKey} alias=${homeAlias} resolved=${homeResolved} → ${homeId?.slice(0,8) || 'NULL'}) vs "${awayName}" (key=${awayKey} alias=${awayAlias} resolved=${awayResolved} → ${awayId?.slice(0,8) || 'NULL'})`);
      continue;
    }

    const isFinal = g.final === '1' || g.status === '4';
    const status = isFinal ? 'completed' : 'scheduled';
    const homeScore = parseInt(g.home_goal_count || '0', 10) || 0;
    const awayScore = parseInt(g.visiting_goal_count || '0', 10) || 0;

    const record = {
      league_id: PWHL_LEAGUE_ID,
      scheduled_at: g.date_time_played,
      home_team_id: homeId,
      away_team_id: awayId,
      home_score: isFinal ? homeScore : null,
      away_score: isFinal ? awayScore : null,
      status,
      season: g.season_id === '10' ? '2026-27' : `season-${g.season_id}`,
      game_data: { ht_game_id: g.game_id, ht_season: g.season_id, ht_game_type: g.game_type, pwhl_raw: g },
      updated_at: now,
    };

    const { error } = await supabase
      .from('fixtures')
      .insert(record);

    if (error) {
      if (error.code === '23505') {
        // unique violation = already exists, that's fine
        updated++;
      } else {
        failed++;
        console.log(`[pwhl] insert err: ${error.message}`);
      }
    } else {
      inserted++;
    }
  }

  console.log(`[pwhl] done: inserted/updated=${inserted} failed=${failed}`);
}

main().catch((e) => {
  console.error('[pwhl] fatal:', e);
  process.exit(1);
});
