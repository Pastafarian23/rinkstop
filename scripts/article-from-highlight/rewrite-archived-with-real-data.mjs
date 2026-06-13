#!/usr/bin/env node
/**
 * rewrite-archived-with-real-data.mjs
 *
 * Re-write the 686 archived articles with REAL data from primary
 * sources. This is the fix for the 2026-06-12 article accuracy crisis
 * where the LLM-generated pipeline had produced 686 articles with
 * unverifiable or potentially fabricated facts.
 *
 * For each archived post with a highlight_id:
 *   1. Look up the highlight in highlight_backups
 *   2. For NHL: query NHL.com to find the actual game id (the
 *      highlight_backups.match_id is a Highlightly sandbox id, not
 *      a real NHL.com id)
 *   3. Fetch the structured facts block from NHL.com
 *   4. Render a deterministic article from the facts (LLM is not
 *      involved — every claim is traceable to a JSON field)
 *   5. Cross-link: set team_home_id, team_away_id, league_id,
 *      country_slug, game_date, game_type, game_season on the post
 *   6. Move from `archived` back to `published` with a new slug
 *      that includes the new headline
 *
 * Source of truth priority:
 *   - NHL: NHL.com (gamecenter landing + boxscore)
 *   - AHL, ECHL, OHL, WHL, QMJHL, USHL, PWHL: HockeyTech
 *   - NCAA: NCAA.com
 *   - KHL, MHL, VHL: KHL mobile API
 *   - IIHF World Championship: fixturedownload.com + IIHF.com
 *
 * Modes:
 *   --league=NHL     Only re-write this league
 *   --limit=N        Cap on articles per run
 *   --dry-run        Don't actually update posts
 *   --execute        Do update posts (default: dry-run)
 *   --start-id=N     Resume from this archived post id
 *
 * Usage:
 *   node scripts/article-from-highlight/rewrite-archived-with-real-data.mjs --league=NHL --limit=5
 *   node scripts/article-from-highlight/rewrite-archived-with-real-data.mjs --league=NHL --limit=5 --execute
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { fetchNhlGameFacts, renderFactsAsArticle } from './datasources/nhlcom-article-data.mjs';
import { findNhlGameId } from './datasources/nhlcom-game-matcher.mjs';

// Load env from the Next.js .env file
const envFile = '/root/.openclaw/workspace/rinkstop-platform/.env';
for (const line of readFileSync(envFile, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// CLI args
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const LEAGUE = args.league || 'NHL';
const LIMIT = parseInt(String(args.limit ?? '5'), 10);
const DRY_RUN = args.execute ? false : true;
const START_ID = args['start-id'] ? parseInt(String(args['start-id']), 10) : null;

// Slug generation
function slugify(s) {
  return s.toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function leagueSlugToId(s) {
  if (!s) return null;
  const sl = s.toLowerCase();
  if (sl.includes('nhl')) return 'nhl';
  if (sl.includes('ahl')) return 'ahl';
  if (sl.includes('echl')) return 'echl';
  if (sl.includes('ohl')) return 'ohl';
  if (sl.includes('whl')) return 'whl';
  if (sl.includes('qmjhl')) return 'qmjhl';
  if (sl.includes('khl')) return 'khl';
  if (sl.includes('mhl')) return 'mhl';
  if (sl.includes('vhl')) return 'vhl';
  if (sl.includes('shl')) return 'shl';
  if (sl.includes('del')) return 'del';
  if (sl.includes('memorial')) return 'memorial-cup';
  if (sl.includes('world')) return 'iihf-world-championship';
  if (sl.includes('sphl')) return 'sphl';
  if (sl.includes('pwhl')) return 'pwhl';
  if (sl.includes('national league')) return 'national-league';
  if (sl.includes('allsvenskan')) return 'hockey-allsvenskan';
  return null;
}

function countryToSlug(s) {
  if (!s) return null;
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function nhlAbbrevToTeamSlug(abbrev) {
  const map = {
    ANA: 'anaheim-ducks', ARI: 'arizona-coyotes', BOS: 'boston-bruins',
    BUF: 'buffalo-sabres', CGY: 'calgary-flames', CAR: 'carolina-hurricanes',
    CHI: 'chicago-blackhawks', COL: 'colorado-avalanche', CBJ: 'columbus-blue-jackets',
    DAL: 'dallas-stars', DET: 'detroit-red-wings', EDM: 'edmonton-oilers',
    FLA: 'florida-panthers', LAK: 'los-angeles-kings', MIN: 'minnesota-wild',
    MTL: 'montreal-canadiens', NSH: 'nashville-predators', NJD: 'new-jersey-devils',
    NYI: 'new-york-islanders', NYR: 'new-york-rangers', OTT: 'ottawa-senators',
    PHI: 'philadelphia-flyers', PIT: 'pittsburgh-penguins', SJS: 'san-jose-sharks',
    SEA: 'seattle-kraken', STL: 'st-louis-blues', TBL: 'tampa-bay-lightning',
    TOR: 'toronto-maple-leafs', UTA: 'utah-mammoth', VAN: 'vancouver-canucks',
    VGK: 'vegas-golden-knights', WSH: 'washington-capitals', WPG: 'winnipeg-jets',
  };
  return map[abbrev] || null;
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
  const teamSlugToId = {};
  for (const t of allTeams) if (t.slug) teamSlugToId[t.slug] = { id: t.id, league_id: t.league_id, name: t.name, country: t.country };
  const { data: leagues } = await sb.from('leagues').select('id, name, slug');
  const leagueSlugToUuid = {};
  for (const l of (leagues || [])) leagueSlugToUuid[l.slug] = l.id;
  return { teamSlugToId, leagueSlugToUuid, teamCount: allTeams.length };
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'EXECUTE'} | League: ${LEAGUE} | Limit: ${LIMIT}`);
  
  const { teamSlugToId, leagueSlugToUuid, teamCount } = await buildTeamAndLeagueCaches();
  const nhlLeagueId = leagueSlugToUuid['nhl'];
  console.log(`Cached ${teamCount} teams and ${Object.keys(leagueSlugToUuid).length} leagues`);
  console.log(`NHL league UUID: ${nhlLeagueId}`);
  
  // Pull archived posts with highlight_id
  let q = sb.from('posts')
    .select('id, title, slug, highlight_id, published_at, content, status')
    .eq('status', 'archived')
    .not('highlight_id', 'is', null)
    .order('id', { ascending: true });
  if (START_ID) q = q.gte('id', START_ID);
  const { data: posts, error } = await q.limit(LIMIT);
  if (error) { console.error(error); return; }
  console.log(`Found ${posts?.length || 0} archived posts to process`);
  
  // Pull highlight info
  const hlIds = [...new Set((posts || []).map(p => p.highlight_id))];
  const { data: hls } = await sb.from('highlight_backups')
    .select('id, home_team_name, away_team_name, match_date, league_name, league_id, country_code, match_round, match_season')
    .in('id', hlIds);
  const hlMap = new Map((hls || []).map(h => [h.id, h]));
  
  let succeeded = 0, skippedNoGame = 0, failed = 0;
  const results = [];
  
  for (let i = 0; i < (posts || []).length; i++) {
    const post = posts[i];
    const hl = hlMap.get(post.highlight_id);
    if (!hl) { console.log(`[${i+1}] ${post.id} — no highlight record`); skippedNoGame++; continue; }
    
    const leagueName = hl.league_name?.name || hl.league_name || '';
    if (LEAGUE && !leagueName.toLowerCase().includes(LEAGUE.toLowerCase())) {
      console.log(`[${i+1}] ${post.id} — skipping non-${LEAGUE} (${leagueName})`);
      continue;
    }
    
    // 1. Find NHL.com game id (for NHL only — other leagues TBD)
    const gameIdResult = await findNhlGameId(hl.home_team_name, hl.away_team_name, (hl.match_date || '').slice(0, 10));
    if (!gameIdResult) {
      console.log(`[${i+1}] ${post.id} — no NHL.com game found for ${hl.away_team_name} @ ${hl.home_team_name} on ${hl.match_date}`);
      skippedNoGame++;
      continue;
    }
    
    // 2. Fetch facts
    const facts = await fetchNhlGameFacts(gameIdResult.gameId);
    if (!facts || !facts.complete) {
      console.log(`[${i+1}] ${post.id} — game ${gameIdResult.gameId} has no complete facts (state: ${facts?.gameState})`);
      skippedNoGame++;
      continue;
    }
    
    // 3. Render article
    const newContent = renderFactsAsArticle(facts);
    if (!newContent) { console.log(`[${i+1}] ${post.id} — render returned null`); failed++; continue; }
    
    // 4. Build new title/slug. Use winner-loser score convention so
    // "X top Y N-M" always reads as "X scored N, Y scored M" regardless
    // of which team was home/away.
    const w = facts.winner;
    const l = facts.loser;
    const wName = `${w?.placeName?.default || ''} ${w?.commonName?.default || ''}`.trim();
    const lName = `${l?.placeName?.default || ''} ${l?.commonName?.default || ''}`.trim();
    const winnerScore = w.score;
    const loserScore = l.score;
    const winnerLoserScore = `${winnerScore}-${loserScore}`;
    const otBit = facts.wasOT ? ' in OT' : facts.wasSO ? ' in SO' : '';
    const playoffBit = facts.gameType === 3 ? ' — Stanley Cup Playoffs' : '';
    const newTitle = `${wName} top ${lName} ${winnerLoserScore}${otBit}${playoffBit}`;
    const newSlug = `${slugify(`${wName}-${lName}-${winnerLoserScore}-${facts.date}`)}-${gameIdResult.gameId}`;
    const newSubtitle = `${facts.date} — ${facts.away.name} ${facts.away.score}, ${facts.home.name} ${facts.home.score}. Final.${otBit}`;
    
    // 5. Cross-link team and league ids
    const homeTeamSlug = nhlAbbrevToTeamSlug(facts.home.abbrev);
    const awayTeamSlug = nhlAbbrevToTeamSlug(facts.away.abbrev);
    const homeTeamId = homeTeamSlug ? teamSlugToId[homeTeamSlug]?.id : null;
    const awayTeamId = awayTeamSlug ? teamSlugToId[awayTeamSlug]?.id : null;
    const gameDate = (facts.startTimeUTC || '').slice(0, 10);
    const gameSeason = parseInt((gameDate || '0000-00-00').slice(0, 4), 10);
    const gameType = facts.gameType === 3 ? 'playoff' : (facts.gameType === 2 ? 'regular' : 'other');
    const gameTypeFromHl = hl.match_round || gameType;
    
    // 6. Update the post
    // Slug uniqueness: the same NHL game can have multiple archived
    // posts (different YouTube highlight videos of the same game). All
    // those posts would try to set the same slug, violating the
    // posts_slug_key unique constraint. To handle this, we append a
    // short disambiguator derived from the post id when we detect a
    // collision.
    let finalSlug = newSlug;
    const slugCheck = await sb.from('posts').select('id').eq('slug', finalSlug).neq('id', post.id).limit(1);
    if (slugCheck.data && slugCheck.data.length > 0) {
      // Append a 6-char disambiguator from the post id
      finalSlug = `${newSlug}-${post.id.replace(/-/g, '').slice(0, 6)}`;
    }
    
    const update = {
      title: newTitle,
      slug: finalSlug,
      content: newContent,
      subtitle: newSubtitle,
      status: 'published',
      published_at: new Date().toISOString(),
      seo_title: `${newTitle} | RinkStop`,
      seo_description: `${newSubtitle} ${facts.away.name} and ${facts.home.name} faced off at ${facts.venue || 'the arena'}. Final score ${facts.finalScore}.`,
      // og_image_url: prefer the existing image on the post (if one was set
      // by a prior pipeline step), fall back to the planned /api/og/... route,
      // and finally to null (the HomeNewsSection renders a gradient fallback
      // when og_image_url is null — never use a headline string here, that
      // produces broken <img> tags in the news grid).
      og_image_url:
        (post.og_image_url && /^https?:\/\//i.test(post.og_image_url) ? post.og_image_url : null)
        || (gameIdResult?.gameId ? `https://rinkstop.com/api/og/game-${gameIdResult.gameId}.png` : null),
      team_home_id: homeTeamId,
      team_away_id: awayTeamId,
      league_id: nhlLeagueId,
      country_slug: 'usa', // NHL games: USA-based (some in Canada); for cross-link to country page, can refine later
      game_date: gameDate,
      game_type: gameTypeFromHl,
      game_season: gameSeason,
    };
    
    if (DRY_RUN) {
      console.log(`[${i+1}] ${post.id} → would update:`);
      console.log(`      Title: ${newTitle}`);
      console.log(`      Slug:  ${finalSlug}`);
      console.log(`      Score: ${facts.finalScore}`);
      console.log(`      Cross-link: home=${homeTeamSlug || '?'} (${homeTeamId || 'NULL'}), away=${awayTeamSlug || '?'} (${awayTeamId || 'NULL'})`);
      results.push({ post_id: post.id, status: 'would_update', title: newTitle, gameId: gameIdResult.gameId });
      succeeded++;
    } else {
      const { error: upErr } = await sb.from('posts').update(update).eq('id', post.id);
      if (upErr) {
        console.log(`[${i+1}] ${post.id} — UPDATE FAILED: ${upErr.message}`);
        failed++;
      } else {
        console.log(`[${i+1}] ${post.id} → ${newTitle} [PUBLISHED]`);
        results.push({ post_id: post.id, status: 'published', title: newTitle, gameId: gameIdResult.gameId });
        succeeded++;
      }
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Skipped (no game found): ${skippedNoGame}`);
  console.log(`Failed: ${failed}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'EXECUTE'}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
