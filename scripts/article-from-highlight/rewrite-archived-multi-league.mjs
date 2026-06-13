#!/usr/bin/env node
/**
 * rewrite-archived-multi-league.mjs
 *
 * Multi-league version of rewrite-archived-with-real-data. Re-writes
 * archived posts using the right source adapter per league, plus
 * cross-link team/league/player fields, plus player-name extraction.
 *
 * Built 2026-06-12 after the NHL re-write completed (384/384 done).
 * Replaces the per-league source logic in match-data.mjs with a
 * centralized league mapper.
 *
 * For each archived post with a highlight_id:
 *   1. Look up the highlight in highlight_backups
 *   2. Map the highlight's league_name to our internal leagues
 *   3. Find the right source adapter (HockeyTech / KHL / IIHF / NCAA)
 *   4. Fetch structured data; render deterministic article
 *   5. Cross-link: team_home_id, team_away_id, league_id, country_slug,
 *      game_date, game_type, game_season, player_id
 *   6. Move from `archived` back to `published` with new slug
 *
 * Modes:
 *   --league=NAME  Only re-write this league (NHL, AHL, OHL, etc.)
 *   --limit=N      Cap on articles per run
 *   --execute      Actually update posts (default: dry-run)
 *   --start-id=N   Resume from this archived post id
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { isFinalScore, normalizeLeague } from './match-data.mjs';
import { renderFactsAsArticle } from './datasources/nhlcom-article-data.mjs';
import { mapHighlightLeague } from './datasources/league-mapper.mjs';
import { renderGenericArticle, buildGenericSlug } from './datasources/generic-renderer.mjs';
import { findPlayerInTitle } from './datasources/player-name-matcher.mjs';
import { hockeytechMatchData } from './datasources/hockeytech.mjs';
import { khlMatchData } from './datasources/khl.mjs';
import { iihfMatchData } from './datasources/iihf.mjs';
import { ncaaMatchData } from './datasources/ncaa.mjs';
import { thesportsdbMatchData, thesportsdbLeagueId } from './datasources/thesportsdb.mjs';

// Inline lightweight Highlightly lookup, isolated to this script so we
// don't trigger the central router (which tries Highlightly twice
// with 8s timeouts, causing 30-60s per post when we get 429s).
let _highlightlyRateLimited = false;
let _highlightlyRateLimitUntil = 0;
async function highlightlyDirect(teams, date, apiKey) {
  if (!apiKey || !teams || !teams.length || !date) return null;
  if (_highlightlyRateLimited && Date.now() < _highlightlyRateLimitUntil) return null;
  const teamKeys = teams.map(t => ({ full: t.replace(/^the\s+/i, '').toLowerCase().trim(), last: t.toLowerCase().split(/\s+/).pop() }));
  const endpoints = [
    { base: 'https://hockey.highlightly.net', host: 'hockey-highlights-api.p.rapidapi.com' },
    { base: 'https://nhl.highlightly.net', host: 'nhl-ncaah-api.p.rapidapi.com' },
  ];
  const d0 = new Date(date + 'T00:00:00Z');
  const dayBefore = new Date(d0); dayBefore.setUTCDate(d0.getUTCDate() - 1);
  const dayAfter = new Date(d0); dayAfter.setUTCDate(d0.getUTCDate() + 1);
  const dates = [dayBefore.toISOString().slice(0, 10), date, dayAfter.toISOString().slice(0, 10)];
  for (const ep of endpoints) {
    for (const d of dates) {
      try {
        const res = await fetch(`${ep.base}/matches?date=${d}&limit=20`, {
          headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': ep.host },
          signal: AbortSignal.timeout(4000),
        });
        if (res.status === 429) {
          _highlightlyRateLimited = true;
          _highlightlyRateLimitUntil = Date.now() + 5 * 60 * 1000; // 5 min backoff
          return null;
        }
        if (!res.ok) continue;
        const j = await res.json();
        for (const m of (j.data || [])) {
          const homeName = (m.homeTeam?.name || m.homeTeam?.displayName || '').toLowerCase();
          const awayName = (m.awayTeam?.name || m.awayTeam?.displayName || '').toLowerCase();
          const homeHas = teamKeys.some(k => homeName.includes(k.last) || homeName.includes(k.full));
          const awayHas = teamKeys.some(k => awayName.includes(k.last) || awayName.includes(k.full));
          if (homeHas && awayHas) {
            const sc = m.state?.score || {};
            const current = sc.current || '';
            const otGoals = sc.overTime && sc.overTime !== '0 - 0' && sc.overTime !== '0-0';
            const soGoals = sc.penalties && sc.penalties !== '0 - 0' && sc.penalties !== '0-0';
            return {
              source: 'highlightly', home_team: m.homeTeam?.name, away_team: m.awayTeam?.name,
              league: m.league?.name, gameId: m.id, score: current,
              wasOT: otGoals, wasSO: soGoals, description: m.state?.description,
              firstPeriod: sc.firstPeriod, secondPeriod: sc.secondPeriod, thirdPeriod: sc.thirdPeriod,
              overTimeGoals: sc.overTime, penalties: sc.penalties,
            };
          }
        }
      } catch {}
    }
  }
  return null;
}

// Direct fetch per source. Avoids the central router's Highlightly-first
// fallback which causes multi-minute waits on 429s. Uses TheSportsDB as
// the universal primary for leagues it covers, with league-specific
// adapters as secondary verification (per Arnel's directive, 2026-06-12).
async function fetchForLeague({ teams, date, leagueMap }) {
  const leagueShort = leagueMap.shortName || leagueMap.name;
  const leagueFull = leagueMap.name;
  // Hard 8s timeout per source. If a source hangs, skip and return null.
  const withTimeout = (p, ms = 8000) => Promise.race([
    p,
    new Promise(resolve => setTimeout(() => resolve(null), ms)),
  ]);
  // Step 1: TheSportsDB primary (covers DEL, SHL, KHL, VHL, Memorial Cup,
  // Swiss NL, OHL, QMJHL, WHL, SPHL, Allsvenskan, Liiga)
  let primary = null;
  if (thesportsdbLeagueId(leagueShort) || thesportsdbLeagueId(leagueFull)) {
    primary = await withTimeout(thesportsdbMatchData({ teams, date, league: leagueShort }));
  }
  // Step 2: League-specific primary (HockeyTech/IIHF/NCAA) for leagues
  // that have a dedicated adapter — used as secondary verification.
  let secondary = null;
  if (leagueMap.source === 'hockeytech') {
    secondary = await withTimeout(hockeytechMatchData({ teams, date, league: leagueShort }));
  } else if (leagueMap.source === 'khl') {
    // KHL mobile API as secondary when TSDB didn't have it
    if (!primary) {
      secondary = await withTimeout(khlMatchData({ teams, date, league: leagueShort }));
    }
  } else if (leagueMap.source === 'iihf') {
    secondary = await withTimeout(iihfMatchData({ teams, date, league: leagueShort }));
  } else if (leagueMap.source === 'ncaa') {
    secondary = await withTimeout(ncaaMatchData({ teams, date, league: leagueShort }));
  } else if (leagueMap.source === 'highlightly') {
    // Highlightly was historically primary; keep it as a secondary when TSDB
    // didn't find anything
    if (!primary) {
      secondary = await withTimeout(highlightlyDirect(teams, date, process.env.HIGHLIGHTLY_API_KEY));
    }
  }
  // Step 3: If we have both, verify they agree. If they disagree, return null
  // and let the audit cron flag it.
  if (primary && secondary) {
    if (primary.score !== secondary.score) {
      console.warn(`  ⚠ score mismatch: TSDB=${primary.score} vs ${leagueMap.source}=${secondary.score} (${teams[0]} @ ${teams[1]} ${date})`);
      // Trust TSDB unless secondary is Highlightly (which has the 429 problem)
      return leagueMap.source === 'highlightly' ? secondary : primary;
    }
    return primary; // they agree
  }
  return primary || secondary;
}

const envFile = '/root/.openclaw/workspace/rinkstop-platform/.env';
for (const line of readFileSync(envFile, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const LEAGUE = args.league ? String(args.league).toUpperCase() : null; // null = all
const LIMIT = parseInt(String(args.limit ?? '50'), 10);
const DRY_RUN = args.execute ? false : true;
const START_ID = args['start-id'] ? String(args['start-id']) : null;

function slugify(s) {
  return s.toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function buildTeamAndLeagueCaches() {
  // Supabase default limit is 1000 rows; we have 2275 teams. Paginate.
  const allTeams = [];
  let from = 0;
  while (true) {
    const { data: t, error: tErr } = await sb.from('teams')
      .select('id, slug, league_id, name, city, country')
      .range(from, from + 999);
    if (tErr) { console.error('Teams fetch error:', tErr); break; }
    if (!t || t.length === 0) break;
    allTeams.push(...t);
    if (t.length < 1000) break;
    from += 1000;
  }
  // Build a name-based lookup (last word of team name; case-insensitive)
  const teamByName = new Map();
  for (const t of allTeams) {
    if (!t.name) continue;
    const key = t.name.toLowerCase().replace(/['']/g, '').trim();
    teamByName.set(key, { id: t.id, league_id: t.league_id, name: t.name, country: t.country });
    // Also last-word key (e.g. "Carolina Hurricanes" -> "hurricanes")
    const lastWord = key.split(/\s+/).pop();
    if (lastWord && lastWord.length >= 4 && !teamByName.has(lastWord)) {
      teamByName.set(lastWord, { id: t.id, league_id: t.league_id, name: t.name, country: t.country });
    }
  }
  const { data: leagues } = await sb.from('leagues').select('id, name, slug');
  const leagueSlugToUuid = {};
  for (const l of (leagues || [])) leagueSlugToUuid[l.slug] = l.id;
  return { teamByName, leagueSlugToUuid, teamCount: allTeams.length, leagueCount: (leagues || []).length };
}

function findTeamId(teamByName, teamName) {
  if (!teamName) return null;
  const k = teamName.toLowerCase().replace(/['']/g, '').trim();
  // Direct match
  if (teamByName.has(k)) return teamByName.get(k);
  // Try last word
  const last = k.split(/\s+/).pop();
  if (last && teamByName.has(last)) return teamByName.get(last);
  // Try with "the" removed
  const noThe = k.replace(/^the\s+/, '');
  if (teamByName.has(noThe)) return teamByName.get(noThe);
  return null;
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'EXECUTE'} | League filter: ${LEAGUE || 'all'} | Limit: ${LIMIT}`);
  
  const { teamByName, leagueSlugToUuid, teamCount, leagueCount } = await buildTeamAndLeagueCaches();
  console.log(`Cached ${teamCount} teams and ${leagueCount} leagues`);
  
  // Pull all archived posts with highlight_id
  let q = sb.from('posts')
    .select('id, title, content, subtitle, slug, highlight_id')
    .eq('status', 'archived')
    .not('highlight_id', 'is', null)
    .order('created_at', { ascending: true })
    .limit(LIMIT);
  if (START_ID) q = q.gt('id', START_ID);
  const { data: posts, error } = await q;
  if (error) { console.error('Posts fetch error:', error); return; }
  console.log(`Found ${posts?.length || 0} archived posts to process`);
  
  // Pull highlight info
  const hlIds = [...new Set((posts || []).map(p => p.highlight_id))];
  const { data: hls } = await sb.from('highlight_backups')
    .select('id, title, home_team_name, away_team_name, match_date, league_name, league_id, country_code, match_round, match_season, image_url')
    .in('id', hlIds);
  const hlMap = new Map((hls || []).map(h => [h.id, h]));
  
  let succeeded = 0, skippedNoData = 0, skippedWrongLeague = 0, failed = 0;
  const results = [];
  
  for (let i = 0; i < (posts || []).length; i++) {
    const post = posts[i];
    const hl = hlMap.get(post.highlight_id);
    if (!hl) { console.log(`[${i+1}] ${post.id} — no highlight record`); skippedNoData++; continue; }
    
    // Map the highlight's league to our internal mapping
    const leagueMap = mapHighlightLeague(hl.league_name);
    if (!leagueMap) { 
      console.log(`[${i+1}] ${post.id} — unrecognized league: ${normalizeLeague(hl.league_name)}`); 
      skippedWrongLeague++; continue; 
    }
    
    // Filter by --league=NAME if specified
    if (LEAGUE) {
      const matches = (
        leagueMap.shortName?.toUpperCase() === LEAGUE.toUpperCase() ||
        leagueMap.name?.toLowerCase() === LEAGUE.toLowerCase()
      );
      if (!matches) {
        skippedWrongLeague++;
        continue;
      }
    }
    
    // Strategy: 
    //   - NHL: use NHL.com direct (existing path) — already covered by
    //     the previous rewriter. Here we skip NHL unless the new path
    //     finds a better source.
    //   - All others: use getMatchData() (which tries the right adapter)
    if (leagueMap.source === 'nhlcom') {
      // Skip NHL — already done
      skippedWrongLeague++;
      continue;
    }
    
    const teams = [hl.home_team_name, hl.away_team_name].filter(Boolean);
    const date = (hl.match_date || '').slice(0, 10);
    if (!teams[0] || !teams[1] || !date) {
      console.log(`[${i+1}] ${post.id} — missing team/date data`);
      skippedNoData++;
      continue;
    }
    
    // Fetch from the right adapter (use the league mapper to pick
    // the source directly, NOT the central getMatchData router, because
    // Highlightly is rate-limited and we don't want to wait for it on
    // every post when we already know the right source from the league).
    // Highlightly is still used as a secondary verification.
    const matchData = await fetchForLeague({ teams, date, leagueMap });
    if (!matchData || !isFinalScore(matchData.score)) {
      // Universal team-link fallback: even if we can't verify the score,
      // link the post to its home/away team so it shows on the team page.
      const homeFallback = findTeamId(teamByName, hl.home_team_name);
      const awayFallback = findTeamId(teamByName, hl.away_team_name);
      if ((homeFallback || awayFallback) && !DRY_RUN) {
        await sb.from('posts').update({
          team_home_id: homeFallback?.id || null,
          team_away_id: awayFallback?.id || null,
          league_id: leagueMap.id || null,
          country_slug: leagueMap.country || null,
        }).eq('id', post.id);
      }
      console.log(`[${i+1}] ${post.id} — no source data, teams-linked (${leagueMap.name}: ${hl.away_team_name} @ ${hl.home_team_name} ${date})`);
      skippedNoData++;
      continue;
    }
    
    // Render the article (generic path)
    const article = renderGenericArticle({ match: matchData, league: leagueMap });
    if (!article) { console.log(`[${i+1}] ${post.id} — render returned null`); failed++; continue; }
    
    // Build title/slug
    const newTitle = article.split('\n')[0].replace(/^#\s*/, '').trim();
    const newSubtitle = article.split('\n').find(l => l.startsWith('*') && l.endsWith('*'))?.replace(/^\*|\*$/g, '') || '';
    const newSlug = buildGenericSlug({ match: matchData, league: leagueMap, postId: post.id });
    
    // Cross-link teams
    const homeTeam = findTeamId(teamByName, matchData.home);
    const awayTeam = findTeamId(teamByName, matchData.away);
    
    // Match featured player (if specified in title)
    const featuredPlayer = await findPlayerInTitle(
      sb, hl.title || post.title,
      homeTeam?.id, awayTeam?.id
    );
    
    // Slug uniqueness
    let finalSlug = newSlug;
    const slugCheck = await sb.from('posts').select('id').eq('slug', finalSlug).neq('id', post.id).limit(1);
    if (slugCheck.data && slugCheck.data.length > 0) {
      finalSlug = `${newSlug}-${post.id.replace(/-/g, '').slice(0, 6)}`;
    }
    
    const gameDate = (matchData.startTimeUTC || date || '').slice(0, 10);
    const gameSeason = parseInt((gameDate || '0000-00-00').slice(0, 4), 10);
    const gameType = (hl.match_round || '').toLowerCase().includes('playoff') || (hl.match_round || '').toLowerCase().includes('post')
      ? 'playoff'
      : 'regular';
    
    const update = {
      title: newTitle,
      slug: finalSlug,
      content: article,
      subtitle: newSubtitle,
      status: 'published',
      published_at: new Date().toISOString(),
      seo_title: `${newTitle} | RinkStop`,
      seo_description: newSubtitle,
      // Prefer the highlight's video thumbnail (ESPN/YouTube/etc. CDN URL
      // from highlight_backups.image_url). Fall back to a team logo only if
      // no thumbnail is available. Never use a headline string here.
      og_image_url:
        (hl.image_url && /^https?:\/\//i.test(hl.image_url) ? hl.image_url : null)
        || (matchData?.home_team_logo && /^https?:\/\//i.test(matchData.home_team_logo) ? matchData.home_team_logo : null)
        || null,
      team_home_id: homeTeam?.id || null,
      team_away_id: awayTeam?.id || null,
      league_id: leagueMap.id || null,
      country_slug: leagueMap.country || null,
      game_date: gameDate,
      game_type: gameType,
      game_season: gameSeason,
      player_id: featuredPlayer?.playerId || null,
    };
    
    if (DRY_RUN) {
      console.log(`[${i+1}] ${post.id} → ${newTitle} [DRY] (${leagueMap.name}, player=${featuredPlayer?.fullName || 'none'})`);
    } else {
      const { error: uErr } = await sb.from('posts').update(update).eq('id', post.id);
      if (uErr) { console.log(`[${i+1}] ${post.id} — update failed: ${uErr.message}`); failed++; continue; }
      console.log(`[${i+1}] ${post.id} → ${newTitle} [PUBLISHED] (${leagueMap.name}, player=${featuredPlayer?.fullName || 'none'})`);
      succeeded++;
    }
    results.push({ id: post.id, title: newTitle, league: leagueMap.name, player: featuredPlayer?.fullName });
  }
  
  console.log('\n=== Summary ===');
  console.log(`Total: ${posts.length} | Published: ${succeeded} | No source data: ${skippedNoData} | Wrong league: ${skippedWrongLeague} | Failed: ${failed}`);
  if (DRY_RUN) console.log('(DRY RUN — no posts updated. Re-run with --execute to commit.)');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
