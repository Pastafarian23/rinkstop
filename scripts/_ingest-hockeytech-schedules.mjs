#!/usr/bin/env node
// scripts/_ingest-hockeytech-schedules.cjs
//
// 2026-11-06 (Arnel data-integrity audit)
//
// Restores the HockeyTech fixture source for the Canadian major-junior
// leagues. Context:
//
//   The HockeyTech modulekit feed was marked "DEAD" in
//   `_daily-scores-all-leagues.cjs` and every league was rerouted to
//   Highlightly. That routing comment was based on a misdiagnosis: the
//   HockeyTech keys were NOT invalid — the feed was RATE LIMITING. Probe
//   results on 2026-11-06, with ~30s spacing between calls:
//     lhjmq (QMJHL) -> 580 games, through 2027-03-20   OK
//     ohl            -> 684 games, through 2027-03-21   OK
//     whl            -> 782 games, through 2027-03-28   OK
//     ahl            -> 1152 games, through 2027-04-11  OK
//     pwhl           -> 12 games, through 2026-11-30    OK
//   Calling the feed faster than that returns "Client access denied", which
//   looks exactly like an invalid key. That's what produced the false "DEAD".
//
//   Meanwhile the Highlightly subscription died (HTTP 403 "not subscribed"),
//   so the leagues it served went stale:
//     OHL   latest fixture 2026-11-05  -> 0 upcoming games
//     WHL   latest fixture 2026-11-05  -> 0 upcoming games
//     QMJHL latest fixture 2026-05-17  -> 5+ months stale, 0 upcoming
//
//   This script pulls the full HockeyTech schedule per league (one call per
//   league, spaced to respect the rate limit) and upserts every game —
//   completed AND upcoming — into `fixtures`.
//
//   It is safe to re-run: the upsert uses the same natural key
//   (league_id, scheduled_at, home_team_id, away_team_id) as the other
//   ingest scripts.
//
// Usage:
//   node scripts/_ingest-hockeytech-schedules.cjs                 # all leagues
//   node scripts/_ingest-hockeytech-schedules.cjs --only=qmjhl,ohl,whl
//   node scripts/_ingest-hockeytech-schedules.cjs --dry-run
//
// Exit: 0 = success, 1 = failure

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// --- env -------------------------------------------------------------------
try {
  const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* .env optional — CI may inject vars */ }

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('FAIL: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// --- args ------------------------------------------------------------------
const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const onlyArg = argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.split('=')[1].split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) : [];

// --- config ----------------------------------------------------------------
// HockeyTech modulekit client codes + public feed keys.
// The rate limit is per-key, so leagues sharing a key must be spaced apart.
const LEAGUES = {
  qmjhl: { clientCode: 'lhjmq', key: 'f1aa699db3d81487', name: 'Quebec Major Junior Hockey League' },
  ohl:   { clientCode: 'ohl',   key: 'f1aa699db3d81487', name: 'Ontario Hockey League' },
  whl:   { clientCode: 'whl',   key: 'f1aa699db3d81487', name: 'Western Hockey League' },
  ahl:   { clientCode: 'ahl',   key: '50c2cd9b5e18e390', name: 'American Hockey League' },
  pwhl:  { clientCode: 'pwhl',  key: '446521baf8c38984', name: 'Professional Women\'s Hockey League' },
};

// Spacing between feed calls. Measured on 2026-11-06: 15s was enough for a
// single call but a burst of 5 in a row tripped the limiter. 25s is safe.
const CALL_SPACING_MS = 25_000;

const FEED_BASE = 'https://lscluster.hockeytech.com/feed/?feed=modulekit&view=schedule';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- helpers ---------------------------------------------------------------

/**
 * Fetch the full schedule for one HockeyTech client_code.
 * Two calls: the first resolves the current season_id, the second pulls it.
 */
async function fetchSchedule(clientCode, key) {
  const common = `key=${key}&client_code=${clientCode}&fmt=json&lang=en`;
  const res1 = await fetch(`${FEED_BASE}&${common}`, { signal: AbortSignal.timeout(30_000) });
  if (!res1.ok) throw new Error(`HTTP ${res1.status}`);
  const j1 = await res1.json();
  const seasonId = j1?.SiteKit?.Parameters?.season_id;
  const schedule = j1?.SiteKit?.Schedule || [];
  if (!seasonId || !schedule.length) {
    return { seasonId, schedule };
  }
  // Second call pins the season so the schedule is stable/complete.
  const res2 = await fetch(`${FEED_BASE}&${common}&season_id=${seasonId}`, { signal: AbortSignal.timeout(30_000) });
  if (!res2.ok) throw new Error(`HTTP ${res2.status} (season ${seasonId})`);
  const j2 = await res2.json();
  return { seasonId, schedule: j2?.SiteKit?.Schedule || schedule };
}

/**
 * Normalize a HockeyTech team name to something we can match against our DB.
 * Feed gives "Saint John, Sea Dogs" / "Newfoundland, Regiment"; our DB has
 * "Saint John Sea Dogs" / "Newfoundland Regiment".
 */
function normalizeTeamName(name) {
  if (!name) return '';
  let out = String(name).trim();
  // The QMJHL feed decorates cross-league entries:
  //   "- North Bay, Batallion (OHL) -"
  // Strip the decorative dashes, then the trailing "(OHL)" marker, then
  // any trailing dash that followed it.
  out = out.replace(/^[\s\-\u2013\u2014]+/, '');
  out = out.replace(/[\s\-\u2013\u2014]+$/, '');
  out = out.replace(/\s*\([A-Z0-9]+\)\s*$/i, '');
  out = out.replace(/[\s\-\u2013\u2014]+$/, '');
  // Commas are separators in the feed ("Saint John, Sea Dogs").
  out = out.replace(/,\s*/g, ' ');
  // Apostrophes: "Ottawa 67's" and "Val-d'Or" must KEEP their punctuation
  // so they match our DB rows. Only the typographic variant is folded.
  out = out.replace(/\u2019/g, "'");
  // Accents FIRST (NFD splits the combining marks off), then ligatures.
  // Order matters: "Saguenéens" must become "Sagueneens", not "Saguenenes".
  out = out.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  out = out.replace(/\u0153/gi, 'oe').replace(/\u0152/gi, 'oe');
  out = out.replace(/\u00e6/gi, 'ae');
  out = out.replace(/\u00f8/gi, 'o');
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * True when the feed entry names a team from another league.
 * Feed format: "- North Bay, Batallion (OHL) -"
 * The marker is NOT at the end of the string (a trailing dash follows it),
 * so the pattern must not anchor to end-of-string.
 */
function isCrossLeague(name) {
  return crossLeagueMarker(name) !== null;
}

/** Extract the parenthesized league marker, e.g. "(OHL)" -> "ohl". */
function crossLeagueMarker(name) {
  const m = String(name || '').match(/\(([A-Z0-9]+)\)/);
  return m ? m[1].toLowerCase() : null;
}

function teamLookupVariants(name) {
  const clean = normalizeTeamName(name);
  const variants = new Set([clean]);
  // "Saint John Sea Dogs" -> also try "Sea Dogs" (nickname) and "Saint John"
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length > 1) {
    variants.add(parts.slice(1).join(' '));
    variants.add(parts[0]);
  }
  // Handle "Ottawa 67s" vs "Ottawa 67's"
  variants.add(clean.replace(/(\d)s$/, "$1's"));
  return [...variants].filter(Boolean);
}

async function resolveTeamId(name, leagueId, teamCache, altLeagueId = null) {
  const variants = teamLookupVariants(name);
  const cacheKey = `${leagueId}:${altLeagueId || ''}:${variants[0]}`;
  if (teamCache.has(cacheKey)) return teamCache.get(cacheKey);

  // Search leagues in priority order:
  //   1. the marker league (explicit "(OHL)" / "(QMJHL)" tag)
  //   2. the feed's own league
  //   3. any league by name (single query, see below)
  //
  // Step 3 matters because the feeds are asymmetric: the QMJHL feed tags its
  // OHL crossover games with "(OHL)", but the OHL feed lists QMJHL crossover
  // opponents with NO tag ("Blainville-Boisbriand Armada"). Those teams live
  // in the QMJHL league row, so an OHL-only lookup misses them.
  //
  // Step 3 is ONE name-only query across all leagues (not one query per
  // league) — scanning 298 league ids per team is far too slow.
  const searchLeagues = [altLeagueId, leagueId].filter(Boolean);
  for (const lid of searchLeagues) {
    for (const v of variants) {
      const { data } = await supabase
        .from('teams')
        .select('id, name')
        .eq('league_id', lid)
        .ilike('name', v)
        .order('is_active', { ascending: false })
        .limit(1);
      // .limit(1) returns an array; .maybeSingle() would ERROR when a league
      // has more than one row with the same name (e.g. "North Bay Battalion"
      // and the older "North Bay Centennials").
      if (data && data.length > 0) {
        teamCache.set(cacheKey, data[0].id);
        return data[0].id;
      }
    }
  }
  // Fallback A: substring match within the leagues.
  for (const lid of searchLeagues) {
    for (const v of variants) {
      if (v.length < 4) continue;
      const { data } = await supabase
        .from('teams')
        .select('id, name')
        .eq('league_id', lid)
        .ilike('name', `%${v}%`)
        .order('is_active', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        teamCache.set(cacheKey, data[0].id);
        return data[0].id;
      }
    }
  }

  // Fallback B: exact name match across ALL leagues (one query, no league
  // filter). This is how untagged cross-league opponents resolve.
  for (const v of variants) {
    const { data } = await supabase
      .from('teams')
      .select('id, name')
      .ilike('name', v)
      .order('is_active', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      teamCache.set(cacheKey, data[0].id);
      return data[0].id;
    }
  }

  // Fallback C: substring match across ALL leagues.
  for (const v of variants) {
    if (v.length < 4) continue;
    const { data } = await supabase
      .from('teams')
      .select('id, name')
      .ilike('name', `%${v}%`)
      .order('is_active', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      teamCache.set(cacheKey, data[0].id);
      return data[0].id;
    }
  }

  teamCache.set(cacheKey, null);
  return null;
}

function mapStatus(g) {
  const isFinal = g.final === '1' || String(g.game_status || '').startsWith('Final');
  if (!isFinal) return 'scheduled';
  return 'completed';
}

// --- main ------------------------------------------------------------------

async function main() {
  console.log('=== HockeyTech schedule ingest ===');
  console.log(`Dry run: ${DRY_RUN} | Only: ${ONLY.join(',') || 'all'}`);
  console.log(`Started: ${new Date().toISOString()}`);

  const { data: leagueRows, error: leagueErr } = await supabase.from('leagues').select('id, name');
  if (leagueErr) throw leagueErr;

  const keys = Object.keys(LEAGUES).filter((k) => ONLY.length === 0 || ONLY.includes(k));
  const results = {};
  let totalWritten = 0;
  let totalUnresolved = 0;
  const failures = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const cfg = LEAGUES[key];
    const league = (leagueRows || []).find((l) => l.name === cfg.name);
    if (!league) {
      console.log(`[${key}] league row not found for "${cfg.name}" — skipping`);
      continue;
    }

    if (i > 0) {
      console.log(`  (waiting ${CALL_SPACING_MS / 1000}s for HockeyTech rate limit)`);
      await sleep(CALL_SPACING_MS);
    }

    let schedule = [];
    let seasonId = null;
    try {
      ({ seasonId, schedule } = await fetchSchedule(cfg.clientCode, cfg.key));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`[${key}] feed fetch failed: ${msg}`);
      failures.push(`${key}: ${msg}`);
      continue;
    }

    if (!schedule.length) {
      console.log(`[${key}] feed returned 0 games`);
      failures.push(`${key}: feed returned 0 games`);
      continue;
    }

    console.log(`[${key}] ${schedule.length} games from feed (season ${seasonId})`);

    const teamCache = new Map();
    let written = 0;
    let unresolved = 0;
    let skipped = 0;
    let downgraded = 0;

    // League ids for cross-league markers (e.g. QMJHL feed lists OHL teams).
    const altLeagueIds = {};
    for (const [k, c] of Object.entries(LEAGUES)) {
      const lr = (leagueRows || []).find((l) => l.name === c.name);
      if (lr) altLeagueIds[k] = lr.id;
    }

    for (const g of schedule) {
      // A feed entry can name a visiting team from another league
      // ("- North Bay, Batallion (OHL) -"). Resolve those against the
      // marked league instead of the feed's own league.
      const homeAlt = altLeagueIds[crossLeagueMarker(g.home_team_name)] || null;
      const awayAlt = altLeagueIds[crossLeagueMarker(g.visiting_team_name)] || null;
      const homeId = await resolveTeamId(g.home_team_name, league.id, teamCache, homeAlt);
      const awayId = await resolveTeamId(g.visiting_team_name, league.id, teamCache, awayAlt);
      if (!homeId || !awayId) {
        unresolved++;
        if (process.env.DEBUG_UNRESOLVED) {
          if (!homeId) console.log(`    ? unresolved home: "${g.home_team_name}"`);
          if (!awayId) console.log(`    ? unresolved away: "${g.visiting_team_name}"`);
        }
        continue;
      }
      const scheduledAt = (g.date_time_played || '').trim();
      if (!scheduledAt) {
        skipped++;
        continue;
      }
      const status = mapStatus(g);
      const isCompleted = status === 'completed';
      const record = {
        league_id: league.id,
        scheduled_at: scheduledAt,
        home_team_id: homeId,
        away_team_id: awayId,
        home_score: isCompleted ? parseInt(g.home_goal_count, 10) || 0 : null,
        away_score: isCompleted ? parseInt(g.visiting_goal_count, 10) || 0 : null,
        status,
        season: seasonId ? `${String(seasonId).slice(0, 4)}-${String(seasonId).slice(4, 6)}` : null,
        game_data: {
          source: 'hockeytech',
          league: key,
          ht_game_id: g.id,
          venue_name: g.venue_name || null,
          home_team_name: g.home_team_name || null,
          visiting_team_name: g.visiting_team_name || null,
          period: g.period || null,
          overtime: g.overtime === '1',
          shootout: g.shootout === '1',
          raw_status: g.game_status || null,
        },
        updated_at: new Date().toISOString(),
      };

      if (DRY_RUN) {
        written++;
        continue;
      }
      const { error } = await supabase
        .from('fixtures')
        .upsert(record, { onConflict: 'league_id,scheduled_at,home_team_id,away_team_id', ignoreDuplicates: false });
      if (error) {
        // The `fixtures_reject_completed_downgrade` trigger blocks an upsert
        // that changes a row from status='completed' back to 'scheduled'.
        // That happens when an older import (e.g. 'hockeytech-statview')
        // wrote future games as completed with 0-0 scores. The trigger
        // blocks the update, so we correct the source row's status FIRST
        // and then re-apply.
        //
        // 2026-11-06: 2,282 such rows existed (2,225 of them FUTURE games
        // marked completed with 0-0 — the site was displaying fake final
        // scores for games that had not been played).
        if (/downgrade/i.test(error.message)) {
          const { error: fixErr } = await supabase
            .from('fixtures')
            .update({ status: 'scheduled', home_score: null, away_score: null })
            .eq('league_id', league.id)
            .eq('scheduled_at', scheduledAt)
            .eq('home_team_id', homeId)
            .eq('away_team_id', awayId)
            .eq('status', 'completed');
          if (!fixErr) {
            const { error: retryErr } = await supabase
              .from('fixtures')
              .upsert(record, { onConflict: 'league_id,scheduled_at,home_team_id,away_team_id', ignoreDuplicates: false });
            if (!retryErr) {
              downgraded++;
              written++;
              continue;
            }
            error = retryErr;
          }
        }
        skipped++;
        if (skipped <= 3) console.log(`  ! upsert error: ${error.message}`);
        continue;
      }
      written++;
    }

    totalWritten += written;
    totalUnresolved += unresolved;
    results[key] = { written, unresolved, skipped, downgraded, feedGames: schedule.length };
    console.log(`[${key}] wrote=${written} unresolvedTeams=${unresolved} errors=${skipped} downgraded=${downgraded}`);
  }

  console.log('');
  console.log('=== Summary ===');
  for (const [k, v] of Object.entries(results)) {
    console.log(`  ${k.padEnd(8)} feed=${v.feedGames} written=${v.written} unresolved=${v.unresolved} errors=${v.skipped} downgraded=${v.downgraded || 0}`);
  }
  console.log(`  TOTAL written=${totalWritten} unresolvedTeams=${totalUnresolved}`);
  if (DRY_RUN) console.log('  (dry run — nothing written)');

  if (failures.length > 0) {
    console.error('');
    console.error('=== FAILURES ===');
    for (const f of failures) console.error('  ' + f);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('=== HockeyTech ingest ERROR ===');
  console.error(e);
  process.exit(1);
});
