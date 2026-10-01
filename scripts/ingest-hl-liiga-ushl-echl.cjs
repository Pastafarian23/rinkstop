#!/usr/bin/env node
/**
 * ingest-hl-liiga-ushl-echl.cjs — 2026-10-01 one-shot
 *
 * Fill the league gap on /directory/games for Liiga (Finland), USHL
 * (US junior), and ECHL (US minor pro). All three are live on
 * Highlightly's hockey.highlightly.net (the nhl.* subdomain only serves
 * NHL + NCAA; other leagues use the generic hockey.* subdomain).
 *
 * Verified coverage before writing:
 *     - Liiga id=14400 → 39 games in past 14 days
 *     - ECHL  id=50993 → 0 games in past 14 days, 6,213 across 2020-12 → 2026-11
 *     - USHL  id=53546 → 25 games in past 14 days
 *
 * HL response schema (hockey.* differs slightly from nhl.*):
 *   {
 *     id, date (ISO UTC), week, country {code, name}, state {clock, score, ...},
 *     homeTeam {id, name, logo}, awayTeam {id, name, logo},
 *     league {id, name, season}
 *   }
 *
 * Strategy:
 *   1. Paginate /matches with limit=100, offset=0..N for each league
 *      separately. NHL-style script did 25k in one pass; we'll do per-league
 *      scopes because each league has a different total.
 *   2. For each match: resolve home_team_id / away_team_id via the team's
 *      name (case-insensitive, normalize Finnish accented chars).
 *   3. Skip if home_team_id / away_team_id can't be resolved (no fixture
 *      row inserted — better than a row with NULL FKs that fails the
 *      games API filter `not('home_team_id','is', null)`).
 *   4. Dedupe by (home_team_id, away_team_id, scheduled_at) — natural key
 *      from the orchestrator's own definition in scripts/nhl-ingest/.
 *   5. Insert in batches of 50.
 *
 * Idempotent: every fixture checked against the natural key. Re-runnable.
 *
 * Run: node scripts/ingest-hl-liiga-ushl-echl.cjs [--rate=N] [--max-offset=N]
 *   --rate=N         ms between API calls (default 1100)
 *   --max-offset=N   cap per-league offset (default 8000)
 *   --only=liiga     playoff usec HL league id list to ingest
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HL_KEY = process.env.HIGHLIGHTLY_API_KEY;
if (!HL_KEY) { console.error('HIGHLIGHTLY_API_KEY missing'); process.exit(1); }
if (!SUPABASE_URL || !SB_KEY) { console.error('Supabase env missing'); process.exit(1); }

const HL_BASE = 'https://hockey.highlightly.net';  // NOT nhl.* — see header
const HL_HOST = 'hockey-highlightly-api.p.rapidapi.com';
const PAGE = 100;

const onlyArg = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1];
const rateArg = process.argv.find(a => a.startsWith('--rate='));
const RATE_MS = rateArg ? parseInt(rateArg.split('=')[1], 10) : 1100;
const maxOffArg = process.argv.find(a => a.startsWith('--max-offset='));
const MAX_OFFSET = maxOffArg ? parseInt(maxOffArg.split('=')[1], 10) : 8000;

// HL league_id → DB league_id. The DB league IDs come from the leagues
// table (verified by SELECT id,slug FROM leagues WHERE slug IN ('liiga',
// 'echl','ushl',…)). Pin priority: national = primary slug; alternative
// duplicate slugs (echl, ushl, liiga-finland) are excluded to avoid
// inserting into a secondary table.
const HL_LEAGUES = {
  14400: { name: 'Liiga',         slug: 'liiga',          priority: 1 },  // Finland
  53546: { name: 'USHL',          slug: 'ushl',           priority: 1 },  // US junior
  50993: { name: 'ECHL',          slug: 'echl',           priority: 1 },  // US minor pro
};

const ALLOWED = onlyArg
  ? onlyArg.split(',').map(s => s.trim()).filter(Boolean)
  : Object.keys(HL_LEAGUES);

const supabase = createClient(SUPABASE_URL, SB_KEY);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function loadDbLeagues() {
  const slugs = [...new Set(Object.values(HL_LEAGUES).map(l => l.slug))];
  const out = {};
  for (let i = 0; i < slugs.length; i += 50) {
    const batch = slugs.slice(i, i + 50);
    const { data, error } = await supabase
      .from('leagues')
      .select('id, name, slug')
      .in('slug', batch);
    if (error) throw error;
    for (const l of data || []) out[l.slug] = l.id;
  }
  return out;
}

// Build a normalized-name → teams[] index from team_workspaces.
// Paginate because there are >1000 active teams.
function normName(s) {
  if (!s) return '';
  let x = String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  // Strip team-name suffixes that Liiga/USHL/ECHL commonly append
  // (city name). HL sometimes sends just "Tappara" while the DB has
  // "Tappara Tampere". Stripping city words lets the shorter form hit.
  x = x.replace(/\b(tampere|helsinki|oulu|jyvaskyla|jyv skyl|kuopio|rauma|lappeenranta|vaasa|kouvola|lahti|mikkeli|espoo|h meenlinna|pori|helsingfors)\b/g, '');
  x = x.replace(/\b(team|fc|club|hockey|liiga)\b/g, '');
  x = x.replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return x;
}

// Resolve an HL team name to a DB team. Tries: exact normalized match
// first, then prefix match (HL: 'Tappara' ↔ DB: 'Tappara Tampere' after
// norm both sides), then any team whose normalized form starts with the
// HL form. Logs the match reason for debugging.
function resolveTeam(teamsByNorm, teamsList, hlName) {
  const exact = teamsByNorm.get(normName(hlName));
  if (exact) return exact;
  // Prefix match: only useful for the team we're ingesting
  const target = normName(hlName);
  for (const t of teamsList) {
    const tn = normName(t.name);
    if (tn.startsWith(target) || target.startsWith(tn)) return t;
  }
  return null;
}

async function loadActiveTeams() {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('team_workspaces')
      .select('id, slug, name, league_id')
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

async function fetchHLMatches(hlLeagueId, offset) {
  const url = `${HL_BASE}/matches?leagueId=${hlLeagueId}&limit=${PAGE}&offset=${offset}`;
  const res = await fetch(url, { headers: { 'x-rapidapi-key': HL_KEY, 'x-rapidapi-host': HL_HOST } });
  if (!res.ok) throw new Error(`HL ${res.status} leagueId=${hlLeagueId} offset=${offset}`);
  const data = await res.json();
  return data.data || [];
}

async function ingestLeague(hlLeagueId, dbLeagueId, teamsByNorm, allTeams) {
  console.log(`\n=== HL league ${hlLeagueId} → DB ${dbLeagueId} ===`);
  let offset = 0;
  let total = 0, matched = 0, skipped = 0, inserted = 0, noTeam = 0;
  let done = false;
  const seenKeys = new Set();

  while (!done && offset <= MAX_OFFSET) {
    let batch;
    try {
      batch = await fetchHLMatches(hlLeagueId, offset);
    } catch (e) {
      console.error(`  err offset=${offset}: ${e.message}`);
      break;
    }
    if (batch.length === 0) { done = true; break; }
    total += batch.length;
    const insertBuf = [];

    for (const m of batch) {
      const homeName = m.homeTeam?.name || m.homeTeam?.shortName || '';
      const awayName = m.awayTeam?.name || m.awayTeam?.shortName || '';
      const homeN = normName(homeName);
      const awayN = normName(awayName);
      let homeTeam = teamsByNorm.get(homeN);
      let awayTeam = teamsByNorm.get(awayN);
      if (!homeTeam) homeTeam = resolveTeam(teamsByNorm, allTeams, homeName);
      if (!awayTeam) awayTeam = resolveTeam(teamsByNorm, allTeams, awayName);

      if (!homeTeam || !awayTeam) {
        noTeam++;
        continue;
      }

      const scheduled_at = m.date; // ISO UTC from HL
      const naturalKey = `${homeTeam.id}|${awayTeam.id}|${scheduled_at}`;
      if (seenKeys.has(naturalKey)) {
        skipped++;
        continue;
      }
      seenKeys.add(naturalKey);

      // HL hockey.* state.score.current = "X - Y" string
      let home_score = null, away_score = null;
      const cur = m.state?.score?.current;
      if (cur && typeof cur === 'string' && cur.includes('-')) {
        const parts = cur.split('-').map(s => parseInt(s.trim(), 10));
        if (parts.length === 2 && parts.every(Number.isFinite)) {
          home_score = parts[0];
          away_score = parts[1];
        }
      }

      const status = m.state?.description?.toLowerCase().includes('finished') ? 'completed'
        : m.state?.description?.toLowerCase().includes('live') ? 'in_progress'
        : 'scheduled';

      insertBuf.push({
        league_id: dbLeagueId,
        home_team_id: homeTeam.id,
        away_team_id: awayTeam.id,
        scheduled_at,
        status,
        home_score,
        away_score,
        season: m.league?.season || null,
        game_data: {
          highlightly_id: m.id,
          hl_league_id: hlLeagueId,
          hl_home_id: m.homeTeam?.id,
          hl_away_id: m.awayTeam?.id,
          hl_state: m.state?.description || null,
        },
      });
      matched++;
    }

    if (insertBuf.length > 0) {
      // Insert in chunks of 50
      for (let i = 0; i < insertBuf.length; i += 50) {
        const chunk = insertBuf.slice(i, i + 50);
        const { error } = await supabase.from('fixtures').insert(chunk);
        if (error) {
          if (error.code === '23505' || (error.message || '').includes('duplicate')) {
            skipped += chunk.length;
          } else {
            console.error(`  insert err: ${error.message}`);
            skipped += chunk.length;
          }
        } else {
          inserted += chunk.length;
        }
      }
    }

    process.stdout.write(`  offset=${String(offset).padStart(5)} fetched=${String(total).padStart(5)} matched=${String(matched).padStart(5)} skipped=${String(skipped).padStart(5)} inserted=${String(inserted).padStart(5)} no_team=${String(noTeam).padStart(4)}\r`);

    if (batch.length < PAGE) { done = true; break; }
    offset += PAGE;
    await sleep(RATE_MS);
  }
  console.log(`\n  -> total=${total} matched=${matched} skipped=${skipped} inserted=${inserted} no_team_match=${noTeam}`);
  return { total, matched, inserted, skipped, noTeam };
}

async function main() {
  console.log('=== HL Liiga/USHL/ECHL ingest ===');
  console.log(`ALLOWED: ${ALLOWED.join(', ')}`);
  console.log(`RATE: ${RATE_MS}ms/call  MAX_OFFSET: ${MAX_OFFSET}`);

  const dbLeagues = await loadDbLeagues();
  console.log('DB leagues resolved:', Object.entries(dbLeagues).map(([k,v]) => `${k}=${v.slice(0,8)}`).join(' '));

  console.log('Loading active teams (paginated)...');
  const allTeams = await loadActiveTeams();
  console.log(`  └─ ${allTeams.length} active teams`);

  // Build name index restricted to the target league IDs (HL /matches only
  // returns teams from that league, so cross-league collisions won't happen
  // for a single ingest run, but restricting the index prevents ambiguous
  // team names like "JYP" from resolving to the wrong league).
  const targetDbLeagueIds = new Set(
    ALLOWED.map(hlId => dbLeagues[HL_LEAGUES[hlId].slug]).filter(Boolean)
  );
  console.log(`  target league IDs: ${[...targetDbLeagueIds].map(s => s.slice(0,8)).join(', ')}`);

  const teamsByNorm = new Map();
  const targetTeamList = [];
  for (const t of allTeams) {
    if (!targetDbLeagueIds.has(t.league_id)) continue;
    targetTeamList.push(t);
    const key = normName(t.name);
    if (!teamsByNorm.has(key)) teamsByNorm.set(key, t);
  }
  console.log(`  name index: ${teamsByNorm.size} teams`);

  const summary = {};
  for (const hlId of ALLOWED) {
    const conf = HL_LEAGUES[hlId];
    const dbId = dbLeagues[conf.slug];
    if (!dbId) {
      console.error(`\n!! DB league missing for slug=${conf.slug} (HL id=${hlId}). Skipping.`);
      continue;
    }
    summary[conf.slug] = await ingestLeague(parseInt(hlId, 10), dbId, teamsByNorm, targetTeamList);
  }

  console.log('\n=== SUMMARY ===');
  for (const [slug, s] of Object.entries(summary)) {
    console.log(`  ${slug.padEnd(8)} total=${s.total} matched=${s.matched} inserted=${s.inserted} skipped=${s.skipped} no_team=${s.noTeam}`);
  }
}

main().catch(err => {
  console.error('FATAL', err);
  process.exit(1);
});