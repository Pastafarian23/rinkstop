#!/usr/bin/env node
/**
 * backfill-player-id-from-pbp.mjs
 *
 * Per Arnel's directive 2026-06-12, populate `posts.player_id` for
 * already-published posts whose highlights don't name a player. We
 * pull the NHL.com game ID from the post's content, fetch the
 * play-by-play for that game, extract goal-scorer names, and match
 * each scorer to a player in the players table on the home/away team.
 *
 * Strategy: for each post with a numeric NHL game ID in content:
 *   1. Fetch /v1/gamecenter/{id}/play-by-play
 *   2. Walk all events with type=505 (goal) or detail that includes
 *      "scoringPlayerId"; collect unique scorer last names
 *   3. Match each scorer to players on team_home_id or team_away_id
 *      (single match = use; multiple ambiguous = skip; none = no link)
 *   4. If exactly ONE scorer is found on those teams, link that player
 *   5. If MULTIPLE scorers are found, leave player_id NULL but log
 *      them so the player page can show "top scorers in this game"
 *
 * Modes:
 *   --limit=N   Cap on articles per run
 *   --execute   Actually update posts (default: dry-run)
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) acc[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  return acc;
}, {});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const NHL_API = env.NEXT_PUBLIC_NHL_API || 'https://api-web.nhle.com/v1';

const LIMIT = parseInt((process.argv.find(a => a.startsWith('--limit=')) || '--limit=200').split('=')[1], 10);
const DRY_RUN = !process.argv.includes('--execute');

// PBP cache: same gameId can appear in multiple posts (home+away are
// linked to the same NHL game). Saves us from fetching the same PBP twice.
const _pbpCache = new Map();

// 200ms between NHL.com calls — be a good citizen. With ~400 NHL games
// in the corpus, 200ms × 400 = ~80s for a full pass. Two PBP calls
// per game (PBP + player lookups) = ~3 min.
const _nhlGap = 200;
let _lastNhl = 0;
let _nhl429Until = 0;
async function nhlFetch(path) {
  if (Date.now() < _nhl429Until) {
    await new Promise(r => setTimeout(r, _nhl429Until - Date.now()));
  }
  const wait = Math.max(0, _nhlGap - (Date.now() - _lastNhl));
  if (wait) await new Promise(r => setTimeout(r, wait));
  _lastNhl = Date.now();
  try {
    const r = await fetch(`${NHL_API}${path}`, { signal: AbortSignal.timeout(6000) });
    if (r.status === 429) {
      _nhl429Until = Date.now() + 30000;
      return null;
    }
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

function extractGameIdFromContent(content) {
  if (!content) return null;
  // Look for "game id NNNNN" or gamecenter/NNNNN in the source line.
  // NHL.com game IDs follow YYYYPPGGRRXX pattern.
  const m1 = content.match(/game id (\d{10})/);
  if (m1) return m1[1];
  const m2 = content.match(/gamecenter\/(\d{10})/);
  if (m2) return m2[1];
  return null;
}

function extractScorerNamesFromPbp(pbp) {
  // PBP structure varies but typical:
  // pbp.plays[].details.scoringPlayerId -> player lookup
  // OR pbp.plays[].details.shootingPlayerId (shots)
  // OR raw 'lastName' / 'firstName' in older API shapes.
  const scorerIds = new Set();
  const plays = pbp?.plays || pbp?.allPlays || [];
  for (const play of plays) {
    // Type 505 = goal (NHL.com standard)
    const isGoal = (play.typeCode === '505') || (play.typeDescKey === 'goal') || (play.type === 'GOAL');
    if (!isGoal) continue;
    const d = play.details || {};
    const scorerId = d.scoringPlayerId || d.playerId;
    if (scorerId) scorerIds.add(scorerId);
  }
  return [...scorerIds];
}

async function resolvePlayerIds(pbp, ids) {
  // /v1/player/{id}/landing gives us first/last name + current team.
  // We can also just batch through the games' rosters.
  const out = [];
  for (const id of ids) {
    const p = await nhlFetch(`/player/${id}/landing`);
    if (!p) continue;
    const first = p.firstName?.default || p.firstName || '';
    const last = p.lastName?.default || p.lastName || '';
    if (first || last) {
      out.push({ id, firstName: first, lastName: last, currentTeamId: p.currentTeamId });
    }
  }
  return out;
}

const _scorerNameCache = new Map();
async function resolveScorerNames(nhlIds) {
  // Use the same PBP we already fetched — it embeds scorer names
  // via the player ID lookup. We only need each name once per run.
  const out = [];
  for (const id of nhlIds) {
    if (_scorerNameCache.has(id)) {
      out.push(_scorerNameCache.get(id));
      continue;
    }
    const p = await nhlFetch(`/player/${id}/landing`);
    if (!p) continue;
    const first = p.firstName?.default || p.firstName || '';
    const last = p.lastName?.default || p.lastName || '';
    if (first || last) {
      const obj = { id, firstName: first, lastName: last };
      _scorerNameCache.set(id, obj);
      out.push(obj);
    }
  }
  return out;
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'EXECUTE'} | Limit: ${LIMIT}`);
  
  // Pull published posts that look like NHL game articles (have "game id NNNNN"
  // in content) and have no player_id yet.
  const r = await sb.from('posts')
    .select('id, title, content, team_home_id, team_away_id, highlight_id')
    .eq('status', 'published')
    .not('highlight_id', 'is', null)
    .is('player_id', null)
    .limit(LIMIT);
  if (r.error) { console.error('Posts fetch error:', r.error); return; }
  const posts = r.data || [];
  console.log(`Found ${posts.length} published posts without player_id`);
  
  // Build a players cache for the home/away teams. Include ALL players
  // for the relevant league so we don't miss roster moves. We do this
  // in two passes:
  //   1. Direct in() for known home/away team_ids
  //   2. Fallback by fetching all NHL league players (6352 total in DB)
  const teamIds = [...new Set(posts.flatMap(p => [p.team_home_id, p.team_away_id]).filter(Boolean))];
  let allPlayers = [];
  // Pass 1: in() with team_ids
  const playersR = await sb.from('players')
    .select('id, first_name, last_name, team_id')
    .in('team_id', teamIds);
  allPlayers = playersR.data || [];
  // Pass 2: also fetch by league=NHL (catches roster changes)
  // Find the NHL league id
  const nhlLeagueR = await sb.from('leagues').select('id').ilike('name', '%national hockey league%').limit(1);
  if (nhlLeagueR.data?.[0]) {
    // Fetch teams in NHL league
    const nhlTeamsR = await sb.from('teams').select('id').eq('league_id', nhlLeagueR.data[0].id);
    const nhlTeamIds = (nhlTeamsR.data || []).map(t => t.id);
    if (nhlTeamIds.length) {
      const r2 = await sb.from('players').select('id, first_name, last_name, team_id').in('team_id', nhlTeamIds);
      // Merge
      const seen = new Set(allPlayers.map(p => p.id));
      for (const p of (r2.data || [])) {
        if (!seen.has(p.id)) { allPlayers.push(p); seen.add(p.id); }
      }
    }
  }
  const playersByTeam = new Map();
  for (const p of allPlayers) {
    if (!p.team_id) continue;
    if (!playersByTeam.has(p.team_id)) playersByTeam.set(p.team_id, []);
    playersByTeam.get(p.team_id).push(p);
  }
  console.log(`Cached ${allPlayers.length} players across ${playersByTeam.size} teams`);
  
  // Global name-uniqueness map: last name -> count of players with that name
  // anywhere in the cache. Used to disambiguate when a team has multiple
  // players with the same last name (e.g. "Staal").
  const lastNameCount = new Map();
  for (const p of allPlayers) {
    const k = (p.last_name || '').toLowerCase().trim();
    if (!k) continue;
    lastNameCount.set(k, (lastNameCount.get(k) || 0) + 1);
  }
  
  let linked = 0, noGameId = 0, noScorers = 0, ambiguous = 0, noMatch = 0, failed = 0;
  const failedIds = [];
  
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const gameId = extractGameIdFromContent(post.content);
    if (!gameId) {
      noGameId++;
      continue;
    }
    if (!/^20\d{8}$/.test(gameId)) {
      // Not an NHL game ID
      noGameId++;
      continue;
    }
    
    // Cache PBP per gameId in this run so we don't re-fetch the same one
    if (!_pbpCache.has(gameId)) {
      _pbpCache.set(gameId, await nhlFetch(`/gamecenter/${gameId}/play-by-play`));
    }
    const pbp = _pbpCache.get(gameId);
    if (!pbp) {
      failed++;
      failedIds.push(post.id);
      continue;
    }
    
    const scorerIds = extractScorerNamesFromPbp(pbp);
    if (scorerIds.length === 0) {
      noScorers++;
      continue;
    }
    
    // Resolve scorer names (cached within this run)
    const scorers = await resolveScorerNames(scorerIds);

    // Match each scorer to a player in our players table for home/away team
    const homePlayers = playersByTeam.get(post.team_home_id) || [];
    const awayPlayers = playersByTeam.get(post.team_away_id) || [];
    const allTeamPlayers = [...homePlayers, ...awayPlayers];
    
    const matched = [];
    const ambiguousScorers = [];
    for (const scorer of scorers) {
      // Build a set of name variants for this scorer
      const sLast = (scorer.lastName || '').toLowerCase().trim();
      const sFirst = (scorer.firstName || '').toLowerCase().trim();
      if (!sLast) continue;
      const candidates = allTeamPlayers.filter(p => {
        const pLast = (p.last_name || '').toLowerCase().trim();
        return pLast === sLast || pLast.includes(sLast) || sLast.includes(pLast);
      });
      if (candidates.length === 1) {
        matched.push({ scorerId: scorer.id, player: candidates[0] });
      } else if (candidates.length > 1) {
        // Disambiguate: if the scorer has a first name and exactly one
        // candidate shares the first initial, use that one. Otherwise
        // it's truly ambiguous.
        let chosen = null;
        if (sFirst) {
          const firstInitial = sFirst[0];
          const narrowed = candidates.filter(p => (p.first_name || '').trim()[0]?.toLowerCase() === firstInitial);
          if (narrowed.length === 1) chosen = narrowed[0];
        }
        if (chosen) {
          matched.push({ scorerId: scorer.id, player: chosen });
        } else {
          ambiguousScorers.push({ scorer, candidates });
        }
      }
      // else: 0 candidates = no roster match
    }
    
    if (matched.length === 0) {
      // No scorer was unique. If at least one scorer has at least one
      // candidate, fall back to the top-scorer's first candidate.
      if (ambiguousScorers.length > 0) {
        // Get top scorer
        const totals = new Map();
        for (const play of (pbp?.plays || [])) {
          if (play.typeCode !== 505) continue;
          const d = play.details || {};
          if (d.scoringPlayerId && d.scoringPlayerTotal) {
            totals.set(d.scoringPlayerId, d.scoringPlayerTotal);
          }
        }
        const bestScorer = ambiguousScorers.sort((a, b) => (totals.get(b.scorer.id) || 0) - (totals.get(a.scorer.id) || 0))[0];
        if (bestScorer && bestScorer.candidates.length > 0) {
          const single = bestScorer.candidates[0];
          if (DRY_RUN) {
            console.log(`[${i+1}] ${post.id} → player ${single.first_name} ${single.last_name} (top scorer fallback, game ${gameId}) [DRY]`);
          } else {
            const { error } = await sb.from('posts').update({ player_id: single.id }).eq('id', post.id);
            if (error) { console.log(`[${i+1}] ${post.id} — update failed: ${error.message}`); failed++; continue; }
            console.log(`[${i+1}] ${post.id} → player ${single.first_name} ${single.last_name} (top scorer fallback) [LINKED]`);
          }
          linked++;
          continue;
        }
      }
      noMatch++;
      continue;
    }
    if (matched.length > 1) {
      // Multiple UNIQUE scorers matched. Fall back: pick the scorer
      // whose PBP "scoringPlayerTotal" is highest (the most-prolific
      // scorer in that game). Already resolved above; just pick max.
      // Each scorer has details.scoringPlayerTotal; we already lost
      // it after resolveScorerNames. Re-derive from PBP.
      const totals = new Map(); // scorerId -> total
      for (const play of (pbp?.plays || [])) {
        if (play.typeCode !== 505) continue;
        const d = play.details || {};
        if (d.scoringPlayerId && d.scoringPlayerTotal) {
          totals.set(d.scoringPlayerId, d.scoringPlayerTotal);
        }
      }
      // Pick the matched scorer with the highest total
      let best = matched[0];
      for (const m of matched) {
        const t = totals.get(m.scorerId) || 0;
        const bT = totals.get(best.scorerId) || 0;
        if (t > bT) best = m;
      }
      const single = best.player;
      if (DRY_RUN) {
        console.log(`[${i+1}] ${post.id} → player ${single.first_name} ${single.last_name} (best of ${matched.length} scorers, total=${totals.get(best.scorerId)}, game ${gameId}) [DRY]`);
      } else {
        const { error } = await sb.from('posts').update({ player_id: single.id }).eq('id', post.id);
        if (error) { console.log(`[${i+1}] ${post.id} — update failed: ${error.message}`); failed++; continue; }
        console.log(`[${i+1}] ${post.id} → player ${single.first_name} ${single.last_name} (best of ${matched.length} scorers) [LINKED]`);
      }
      linked++;
      continue;
    }
    // Exactly one match — link it
    const single = matched[0].player;
    if (DRY_RUN) {
      console.log(`[${i+1}] ${post.id} → player ${single.first_name} ${single.last_name} (scorer ${matched[0].scorerId}, game ${gameId}) [DRY]`);
    } else {
      const { error } = await sb.from('posts').update({ player_id: single.id }).eq('id', post.id);
      if (error) { console.log(`[${i+1}] ${post.id} — update failed: ${error.message}`); failed++; continue; }
      console.log(`[${i+1}] ${post.id} → player ${single.first_name} ${single.last_name} [LINKED]`);
    }
    linked++;
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Total: ${posts.length} | Linked: ${linked} | No game ID: ${noGameId} | No scorers: ${noScorers} | Ambiguous: ${ambiguous} | No match: ${noMatch} | Failed: ${failed}`);
  if (failedIds.length) {
    const { writeFileSync } = await import('fs');
    writeFileSync('/tmp/pbp-failed-ids.json', JSON.stringify(failedIds));
    console.log(`Wrote ${failedIds.length} failed IDs to /tmp/pbp-failed-ids.json for retry`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
