#!/usr/bin/env node
/**
 * Season completeness report (Item 4).
 *
 * For a target set of leagues (NHL/AHL/ECHL/USHL), produces a table per league:
 *   Season | Total Fixtures | Completed | Teams with games | GP range | Expected GP
 *
 * Also computes:
 *   - is_season_complete (bool): true if max(GP) >= expected GP
 *     (skipped for current in-progress seasons where 0 < GP < expected GP is normal)
 *
 * Usage:
 *   node scripts/_season-completeness.cjs                # all 4 leagues
 *   node scripts/_season-completeness.cjs --league=nhl   # one league
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

// Expected regular-season GP per league.
// NHL/AHL/ECHL/USHL only — this script is intentionally narrow.
const EXPECTED_GP = {
  nhl: 82,
  ahl: 72,
  echl: 72,
  ushl: 60,
};

const REQUESTED_LEAGUES = args.league
  ? [args.league.toLowerCase()]
  : Object.keys(EXPECTED_GP);

function gpFromRow(r) {
  return Number(r.games_played ?? 0);
}

async function fetchLeagueIdBySlug(slug) {
  const { data, error } = await supabase
    .from('leagues')
    .select('id, slug, name')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`league lookup failed for ${slug}: ${error.message}`);
  return data;
}

async function searchLeagueByName(needle) {
  // Fallback when the canonical slug is unknown — match against league.name.
  const { data, error } = await supabase
    .from('leagues')
    .select('id, slug, name')
    .ilike('name', `%${needle}%`)
    .limit(10);
  if (error) throw new Error(`league name search failed for ${needle}: ${error.message}`);
  return data ?? [];
}

async function listAllSeasons(leagueId) {
  // Pull distinct seasons via range paginator (PostgREST caps at 1000).
  const set = new Set();
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('fixtures')
      .select('season')
      .eq('league_id', leagueId)
      .not('season', 'is', null)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`seasons fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data) if (r.season) set.add(r.season);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return [...set].sort();
}

async function perSeasonTotals(leagueId, season) {
  // total + completed for the (league, season) pair.
  // Two count queries to keep this simple + reliably cheap.
  const [{ count: total }, { count: completed }] = await Promise.all([
    supabase
      .from('fixtures')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('season', season),
    supabase
      .from('fixtures')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('season', season)
      .eq('status', 'completed'),
  ]);
  return { total: total ?? 0, completed: completed ?? 0 };
}

async function gpByTeamForSeason(leagueId, season) {
  // For a completed season, count distinct completed-game appearances per team.
  // Each fixture is "two team appearances" — count per team to get GP per team.
  // Approach: fetch completed fixtures for the season and aggregate locally.
  // We paginate because a season can have >1000 completed rows (NHL 2024-25 has 1312+).
  const counts = new Map(); // teamId -> games played
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('fixtures')
      .select('home_team_id, away_team_id')
      .eq('league_id', leagueId)
      .eq('season', season)
      .eq('status', 'completed')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`completed-fixture fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data) {
      if (r.home_team_id) counts.set(r.home_team_id, (counts.get(r.home_team_id) ?? 0) + 1);
      if (r.away_team_id) counts.set(r.away_team_id, (counts.get(r.away_team_id) ?? 0) + 1);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  if (counts.size === 0) return null;
  const gps = [...counts.values()];
  return {
    teamsWithGames: counts.size,
    minGp: Math.min(...gps),
    maxGp: Math.max(...gps),
  };
}

function isCompletedSeasonLabel(seasonLabel) {
  // "Current" only if it is plausibly in-progress: starts in the
  // current calendar year OR the next one, and has fewer completed
  // games than expected. Anything older is treated as completed even
  // if the data looks thin.
  //
  // We deliberately do NOT trust just the label year — the NHL row
  // labelled "2027-28" with 11 rows in October 2026 is clearly noise
  // (probably a pre-season test ingest that landed early), so we mark
  // it as completed-by-omission when its completed count is small
  // relative to expected.
  const yrMatch = String(seasonLabel).match(/^(\d{4})/);
  if (!yrMatch) return true;
  const startYr = parseInt(yrMatch[1], 10);
  const now = new Date();
  return startYr < now.getUTCFullYear();
}

function classifySeason(row) {
  // Decide: current (in-progress) vs completed (closed window).
  const labelCompleted = isCompletedSeasonLabel(row.season);
  // If label says "completed" but completed count is tiny AND label year
  // is in the future (e.g. "2027-28" with 0 completed), it's noise — skip the row
  // for "current" purposes. We still emit it, just don't call it current.
  return {
    ...row,
    currentSeason: !labelCompleted && row.completed > 0 && row.completed < row.expected * 3,
  };
}

async function processLeague(slug) {
  const expected = EXPECTED_GP[slug];
  if (!expected) {
    console.log(`# ${slug.toUpperCase()}: no expected GP configured, skipping`);
    return;
  }

  let league;
  let resolvedBy;
  if (args.league || ['nhl', 'ahl', 'echl', 'ushl'].includes(slug)) {
    league = await fetchLeagueIdBySlug(slug);
    if (league) resolvedBy = `slug=${slug}`;
    if (!league) {
      // Loose fallback by name (handles ECHL/USHL where slug may differ).
      const needle = slug === 'nhl' ? 'National Hockey' :
                     slug === 'ahl' ? 'American Hockey' :
                     slug === 'echl' ? 'ECHL' :
                     slug === 'ushl' ? 'United States Hockey' : slug;
      const candidates = await searchLeagueByName(needle);
      if (candidates.length === 1) {
        league = candidates[0];
        resolvedBy = `name~${needle} (1 match)`;
      } else if (candidates.length > 1) {
        // For ECHL specifically: prefer exact slug 'echl'; else first alphabetically.
        const exact = candidates.find(c => c.slug === slug);
        league = exact ?? candidates[0];
        resolvedBy = `name~${needle} (${candidates.length} matches — picked ${league.slug})`;
      }
    }
  } else {
    league = await fetchLeagueIdBySlug(slug);
  }

  if (!league) {
    console.log(`# ${slug.toUpperCase()}: ❌ could not resolve league (no slug or name match)`);
    return;
  }
  console.log(`\n# ${league.name} (id=${league.id}, resolved ${resolvedBy ?? 'exact'})`);
  console.log(`# Expected regular-season GP: ${expected}`);
  console.log(`# Columns: Season | Total | Completed | Teams w/ games | GP range | Expected | Complete?`);

  const seasons = await listAllSeasons(league.id);
  if (seasons.length === 0) {
    console.log('# (no seasons present in fixtures for this league)');
    return;
  }

  // For each season, get totals + GP range. Show only seasons that have any data.
  const rows = [];
  for (const season of seasons) {
    const { total, completed } = await perSeasonTotals(league.id, season);
    if (total === 0) continue;
    const gpStats = await gpByTeamForSeason(league.id, season);
    const completed_ = isCompletedSeasonLabel(season);
    const teamsWithGames = gpStats?.teamsWithGames ?? 0;
    const minGp = gpStats?.minGp ?? 0;
    const maxGp = gpStats?.maxGp ?? 0;
    const isComplete = completed_ && maxGp >= expected && completed > 0;
    rows.push(classifySeason({
      season,
      total,
      completed,
      teamsWithGames,
      minGp,
      maxGp,
      expected,
      isComplete,
    }));
  }
  for (const r of rows) {
    const flag = r.isComplete ? '✅' : (r.currentSeason ? '⏳ (current)' : '❌ INCOMPLETE');
    const gpRange = r.teamsWithGames === 0
      ? '—'
      : (r.minGp === r.maxGp ? `${r.maxGp}` : `${r.minGp}-${r.maxGp}`);
    console.log(
      `  ${r.season.padEnd(10)} | ${String(r.total).padStart(5)} | ${String(r.completed).padStart(5)} | ${String(r.teamsWithGames).padStart(4)} | ${gpRange.padEnd(8)} | ${String(r.expected).padStart(3)} | ${flag}`
    );
  }

  // Most recent completed season specifically (Arnel's NHL example — GP 34-79).
  const mostRecentCompleted = rows.filter(r => r.currentSeason === false).pop();
  if (mostRecentCompleted && mostRecentCompleted.teamsWithGames > 0) {
    console.log(
      `\n  → Most-recent completed season ${mostRecentCompleted.season}: GP range = ${mostRecentCompleted.minGp}-${mostRecentCompleted.maxGp}, teams = ${mostRecentCompleted.teamsWithGames}, total = ${mostRecentCompleted.total}, completed = ${mostRecentCompleted.completed}`
    );
  } else if (mostRecentCompleted) {
    console.log(`\n  → Most-recent completed season ${mostRecentCompleted.season}: NO completed games in DB`);
  }

  // Current season breakdown (if any).
  const current = rows.filter(r => r.currentSeason).pop();
  if (current) {
    console.log(`  → Current (in-progress) season ${current.season}: total = ${current.total}, completed = ${current.completed}`);
  }
}

(async () => {
  try {
    for (const slug of REQUESTED_LEAGUES) {
      await processLeague(slug);
    }
  } catch (err) {
    console.error('FATAL:', err.message ?? err);
    process.exit(1);
  }
})();
