#!/usr/bin/env node
/**
 * Highlight article accuracy audit pipeline.
 *
 * For each highlight article:
 *  1. Extract claims from content (score, OT/SO, teams, players, stats)
 *  2. Identify the source game via post metadata
 *  3. Fetch canonical boxscore from the league's primary source
 *  4. Verify each claim against the boxscore
 *  5. Output per-article: PASS / FAIL / NEEDS_*
 *
 * Per Arnel's directive (2026-09-16 00:54 CDT):
 *  - Every mismatch is flagged, no threshold filtering
 *  - Auto-fix is NOT performed — mismatches go to review queue
 *  - Highlightly is available as a primary source (key provided)
 */

require('./load-secrets.cjs');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HIGHLIGHTLY_KEY = '879d84…1562';

// --- helpers ---

function extractYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/\/vi\/([^/]+)\//);
  return m ? m[1] : null;
}

function normalizeName(s) {
  if (!s) return '';
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function teamNameMatch(a, b) {
  if (!a || !b) return false;
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  // Try abbreviation match
  const abbrA = (a || '').replace(/\.\s*/g, '').toUpperCase();
  const abbrB = (b || '').replace(/\.\s*/g, '').toUpperCase();
  if (abbrA === abbrB) return true;
  if (abbrA.length <= 4 && (na.includes(abbrB) || abbrB.includes(na))) return true;
  // Last word of full name
  const lastWord = (s) => normalizeName(s).split(' ').filter(Boolean).pop();
  const la = lastWord(a);
  const lb = lastWord(b);
  if (la && lb && la === lb) return true;
  return false;
}

function extractClaims(article) {
  const claims = [];
  const title = article.title || '';
  const content = article.content || '';

  // 1. Title score pattern
  const titleMatch = title.match(/^(.+?)\s+(?:top|defeat|beat|edge|down)\s+(.+?)\s+(\d+)-(\d+)(?:\s+in\s+(?:a\s+)?(OT|SO|overtime|shootout))?$/i);
  if (titleMatch) {
    claims.push({
      type: 'title_score',
      winner: titleMatch[1].trim(),
      loser: titleMatch[2].trim(),
      winnerScore: parseInt(titleMatch[3], 10),
      loserScore: parseInt(titleMatch[4], 10),
      otSo: titleMatch[5] || null,
      source: 'title',
    });
  }

  // 2. Final score line in body
  const fsMatch = content.match(/final\s+score[:\s]+(.+?)\s+(\d+)[,\s]+(.+?)\s+(\d+)/i);
  if (fsMatch) {
    claims.push({
      type: 'final_score_line',
      teamA: fsMatch[1].replace(/\*\*/g, '').trim(),
      scoreA: parseInt(fsMatch[2], 10),
      teamB: fsMatch[3].trim(),
      scoreB: parseInt(fsMatch[4], 10),
      source: 'body',
    });
  }

  // 3. Lead line
  const leadMatch = content.match(/\*(\d{4}-\d{2}-\d{2})\s+[—-]\s+(.+?)\s+(\d+),\s+(.+?)\s+(\d+)\.\s+Final\.?\s*(?:\(([^)]+)\))?/);
  if (leadMatch) {
    claims.push({
      type: 'lead_line',
      teamA: leadMatch[2].replace(/\*\*/g, '').trim(),
      scoreA: parseInt(leadMatch[3], 10),
      teamB: leadMatch[4].replace(/\*\*/g, '').trim(),
      scoreB: parseInt(leadMatch[5], 10),
      otSo: leadMatch[6] || null,
      source: 'body_lead',
    });
  }

  // 4. OT/SO explicit
  if (/in\s+(?:a\s+)?(?:shootout|so)\b/i.test(title) || /in a shootout|in shootout/i.test(content)) {
    claims.push({ type: 'ot_so_explicit', value: 'SO', source: 'body_or_title' });
  }
  if (/in\s+(?:a\s+)?(?:overtime|ot)\b/i.test(title) || /decided in overtime/i.test(content)) {
    if (!/shootout|so\b/i.test(title)) {
      claims.push({ type: 'ot_so_explicit', value: 'OT', source: 'body_or_title' });
    }
  }

  // 5. Goal summary lines
  const goalPattern = /^\s*(\d(?:st|nd|rd|th)|OT)\s+(\d{1,2}:\d{2})\s+[—-]\s+(.+?),\s+([A-Za-z][A-Za-z0-9 \-']+?)(?:\s+\(([^)]+)\))?\.\s+Score\s+now\s+(\d+)-(\d+)/gm;
  let goalMatch;
  while ((goalMatch = goalPattern.exec(content)) !== null) {
    claims.push({
      type: 'goal',
      period: goalMatch[1],
      time: goalMatch[2],
      scorer: goalMatch[3].trim(),
      team: goalMatch[4].trim(),
      assists: goalMatch[5] || null,
      scoreAfter: `${goalMatch[6]}-${goalMatch[7]}`,
      source: 'body',
    });
  }

  // 6. Goalie stats
  const goaliePattern = /([A-Z]\.\s*[A-Za-z\-']+(?:\s+[A-Za-z\-']+)*)\s+\(([^)]+)\):\s+(\d+)\s+SV\s+on\s+(\d+)\s+SH,\s+(\d+)\s+GA,\s+([\d.]+)\s+SV%,\s+(\d{1,2}:\d{2})\s+TOI\.\s+Decision:\s+([A-Z]+)/g;
  let goalieMatch;
  while ((goalieMatch = goaliePattern.exec(content)) !== null) {
    claims.push({
      type: 'goalie',
      name: goalieMatch[1].trim(),
      team: goalieMatch[2].trim(),
      saves: parseInt(goalieMatch[3], 10),
      shotsAgainst: parseInt(goalieMatch[4], 10),
      goalsAgainst: parseInt(goalieMatch[5], 10),
      svPct: goalieMatch[6],
      toi: goalieMatch[7],
      decision: goalieMatch[8],
      source: 'body',
    });
  }

  // 7. Venue
  const venueMatch = content.match(/Venue:\s*([^\n*]+)/i);
  if (venueMatch) {
    claims.push({ type: 'venue', value: venueMatch[1].trim(), source: 'body' });
  }

  // 8. Source claim
  const sourceMatch = content.match(/Source:\s*([^\n*]+)/i);
  if (sourceMatch) {
    claims.push({ type: 'claimed_source', value: sourceMatch[1].trim(), source: 'body' });
  }

  return claims;
}

function verifyClaims(claims, boxscore) {
  const results = [];
  for (const c of claims) {
    if (c.type === 'title_score' || c.type === 'final_score_line' || c.type === 'lead_line') {
      if (!boxscore) {
        results.push({ claim: c, status: 'CANNOT_VERIFY', reason: 'no boxscore available' });
        continue;
      }
      const data = boxscore.data;
      // NHL.com: placeName.default + commonName.default = full team name
      // e.g. "Dallas" + " " + "Stars" = "Dallas Stars"
      const homeName = [data?.homeTeam?.placeName?.default, data?.homeTeam?.commonName?.default].filter(Boolean).join(' ') || data?.homeTeam?.name?.default || '';
      const awayName = [data?.awayTeam?.placeName?.default, data?.awayTeam?.commonName?.default].filter(Boolean).join(' ') || data?.awayTeam?.name?.default || '';
      const homeTri = data?.homeTeam?.abbrev || '';
      const awayTri = data?.awayTeam?.abbrev || '';
      const homeScore = data?.homeTeam?.score;
      const awayScore = data?.awayTeam?.score;

      const articleWinner = c.winner || c.teamA;
      const articleLoser = c.loser || c.teamB;
      const articleWS = (c.winnerScore !== undefined) ? c.winnerScore : c.scoreA;
      const articleLS = (c.loserScore !== undefined) ? c.loserScore : c.scoreB;
      const wn = (articleWinner || '').replace(/\*\*/g, '').trim();
      const ln = (articleLoser || '').replace(/\*\*/g, '').trim();

      let matched = null;
      if (teamNameMatch(homeName, wn) && teamNameMatch(awayName, ln)) {
        matched = { winnerSide: 'home', winnerScore: homeScore, loserScore: awayScore };
      } else if (teamNameMatch(awayName, wn) && teamNameMatch(homeName, ln)) {
        matched = { winnerSide: 'away', winnerScore: awayScore, loserScore: homeScore };
      }

      if (!matched) {
        results.push({
          claim: c,
          status: 'FAIL',
          reason: `teams don't match: article says "${articleWinner}" vs "${articleLoser}" but boxscore has ${awayTri || awayName} @ ${homeTri || homeName}`,
        });
      } else if (matched.winnerScore !== articleWS || matched.loserScore !== articleLS) {
        results.push({
          claim: c,
          status: 'FAIL',
          reason: `score mismatch: article says ${wn} ${articleWS}, ${ln} ${articleLS} but boxscore has winner=${matched.winnerScore} loser=${matched.loserScore}`,
        });
      } else {
        results.push({ claim: c, status: 'PASS' });
      }
    } else if (c.type === 'ot_so_explicit') {
      if (!boxscore) {
        results.push({ claim: c, status: 'CANNOT_VERIFY' });
        continue;
      }
      const data = boxscore.data;
      const periodDescriptor = data?.periodDescriptor || {};
      const periodType = periodDescriptor.periodType || '';
      const periodNumber = periodDescriptor.number || 0;
      const lastPeriodType = data?.gameOutcome?.lastPeriodType || periodType;
      const isOT = lastPeriodType === 'OT' || periodNumber === 4;
      const isSO = lastPeriodType === 'SO' || periodNumber === 5;
      if (c.value === 'OT' && !isOT) {
        results.push({ claim: c, status: 'FAIL', reason: `article says OT but boxscore periodDescriptor is '${periodType}' (number ${periodNumber})` });
      } else if (c.value === 'SO' && !isSO) {
        results.push({ claim: c, status: 'FAIL', reason: `article says SO but boxscore periodDescriptor is '${periodType}' (number ${periodNumber})` });
      } else {
        results.push({ claim: c, status: 'PASS' });
      }
    } else if (c.type === 'goal') {
      results.push({ claim: c, status: 'NEEDS_PBP', reason: 'play-by-play not in boxscore endpoint' });
    } else if (c.type === 'three_star' || c.type === 'goalie') {
      results.push({ claim: c, status: 'NEEDS_PBP', reason: 'detailed stats not in boxscore endpoint' });
    } else if (c.type === 'venue') {
      results.push({ claim: c, status: 'NEEDS_VERIFY', reason: 'venue needs separate lookup' });
    } else if (c.type === 'claimed_source') {
      results.push({ claim: c, status: 'META', note: `article claims source: ${c.value}` });
    } else {
      results.push({ claim: c, status: 'UNHANDLED', reason: `claim type ${c.type} not handled yet` });
    }
  }
  return results;
}

// --- boxscore fetchers ---

async function fetchNhlBoxscore(slug) {
  // Match 10-digit NHL game id, allowing for trailing hash suffix
  // e.g. "...-2025030123-834ec0" → game_id = "2025030123"
  const m = slug?.match(/-(\d{10})(?:-[a-f0-9]+)?\$/);
  if (!m) return null;
  const gameId = m[1];
  try {
    const r = await fetch(`https://api-web.nhle.com/v1/gamecenter/${gameId}/boxscore`);
    if (!r.ok) return null;
    const data = await r.json();
    return { source: `nhl.com (game ${gameId})`, data };
  } catch (e) {
    return null;
  }
}

async function fetchHockeyTechBoxscore(leagueId, gameDate, title) {
  const leagueMap = {
    'b05d6d26-d5d6-4cfd-a48b-f5646fa7d611': { clientCode: 'ahl',   key: '50c2cd9b5e18e390' },
    '46f49db9-e63d-407d-a99c-802f87576ab2': { clientCode: 'whl',   key: 'f1aa699db3d81487' },
    'deb6816a-ccaf-48bf-9f5e-5a7c3387f922': { clientCode: 'lhjmq', key: 'f1aa699db3d81487' },
    'd767362d-c13b-4c7a-8c8c-27ec33990882': { clientCode: 'ohl',   key: 'f1aa699db3d81487' }, // OHL
    '85e8e902-441c-4102-b111-5a37f0350484': { clientCode: 'echl',  key: '2c2b89ea7345cae8' }, // ECHL
    'cf714ebc-0631-4ad9-b3e7-3822372be945': { clientCode: 'echl',  key: '2c2b89ea7345cae8' }, // ECHL (alt)
  };
  const cfg = leagueMap[leagueId];
  if (!cfg) return null;

  // Fetch multiple seasons to cover playoffs.
  // WHL uses 3-digit season IDs (285-295); AHL/OHL/QMJHL/ECHL use 2-digit (76-95).
  // Fetch both ranges to be safe across leagues.
  const allGames = new Map();
  const seasonIds = [76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295];
  for (const sid of seasonIds) {
    try {
      const r = await fetch(`https://lscluster.hockeytech.com/feed/?feed=modulekit&view=schedule&key=${cfg.key}&client_code=${cfg.clientCode}&fmt=json&lang=en&season_id=${sid}`);
      if (r.ok) {
        const j = await r.json();
        for (const g of (j.SiteKit?.Schedule || [])) {
          if (!allGames.has(g.id)) allGames.set(g.id, g);
        }
      }
    } catch (e) {}
  }

  const teams = extractTeamsFromTitle(title);
  if (teams.length !== 2) return null;
  const d0 = new Date(gameDate + 'T00:00:00Z');
  const dayBefore = new Date(d0); dayBefore.setUTCDate(d0.getUTCDate() - 1);
  const dayAfter = new Date(d0); dayAfter.setUTCDate(d0.getUTCDate() + 1);
  const dateKeys = [dayBefore.toISOString().slice(0, 10), gameDate, dayAfter.toISOString().slice(0, 10)];
  const teamKeys = teams.map(t => ({ full: t.toLowerCase(), last: t.toLowerCase().split(' ').pop() }));

  const isMatch = (g) => {
    if ((g.date_played || '').slice(0, 10) !== gameDate) return false;
    if (g.final !== '1') return false;
    const h = (g.home_team_name || '').toLowerCase();
    const a = (g.visiting_team_name || '').toLowerCase();
    return teamKeys.some(k => h.includes(k.last)) && teamKeys.some(k => a.includes(k.last));
  };
  // Prefer exact date match; fall back to ±1 day window
  let match = [...allGames.values()].find(isMatch);
  if (!match) {
    match = [...allGames.values()].find(g => {
      if (!dateKeys.includes((g.date_played || '').slice(0, 10))) return false;
      if (g.final !== '1') return false;
      const h = (g.home_team_name || '').toLowerCase();
      const a = (g.visiting_team_name || '').toLowerCase();
      return teamKeys.some(k => h.includes(k.last)) && teamKeys.some(k => a.includes(k.last));
    });
  }

  if (!match) return null;
  return {
    source: `hockeytech ${cfg.clientCode}`,
    data: {
      homeTeam: { abbrev: match.home_team_code, name: { default: match.home_team_name }, score: parseInt(match.home_goal_count, 10) },
      awayTeam: { abbrev: match.visiting_team_code, name: { default: match.visiting_team_name }, score: parseInt(match.visiting_goal_count, 10) },
      periodDescriptor: { number: match.shootout === '1' ? 5 : (match.overtime === '1' ? 4 : 3), periodType: match.shootout === '1' ? 'SO' : (match.overtime === '1' ? 'OT' : 'REG') },
      gameOutcome: { lastPeriodType: match.shootout === '1' ? 'SO' : (match.overtime === '1' ? 'OT' : 'REG') },
    }
  };
}

function extractTeamsFromTitle(title) {
  const m = title.match(/^(.+?)\s+(?:top|defeat|beat|edge|down)\s+(.+?)\s+\d+-\d+/i);
  if (!m) return [];
  return [m[1].replace(/^\*\*/, '').trim(), m[2].trim()];
}

// Cache for team→league lookups (avoids hitting DB for every article)
const teamLeagueCache = new Map();
async function lookupTeamLeague(teamId) {
  if (teamLeagueCache.has(teamId)) return teamLeagueCache.get(teamId);
  const { data } = await supabase
    .from('teams')
    .select('league_id, leagues(name)')
    .eq('id', teamId)
    .single();
  const result = data?.league_id || null;
  teamLeagueCache.set(teamId, result);
  return result;
}

async function fetchBoxscore(article) {
  let leagueId = article.league_id;
  if (!leagueId && article.team_home_id) {
    leagueId = await lookupTeamLeague(article.team_home_id);
  }
  if (leagueId === '2b5f2b9d-84b9-4edb-8373-a732b72f4e40') {
    return fetchNhlBoxscore(article.slug);
  }
  return fetchHockeyTechBoxscore(leagueId, article.game_date, article.title || '');
}

// --- main ---

(async () => {
  const limit = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '10', 10);
  const saveJson = process.argv.includes('--json');
  const slugsFilter = process.argv.find(a => a.startsWith('--slug='))?.split('=')[1];
  // Route human output to stderr when --json so stdout stays pure JSON
  const log = (...a) => { for (const x of a) process.stderr.write(String(x) + '\n'); };

  log(`=== AUDIT (limit=${limit}) ===\n`);

  let query = supabase
    .from('posts')
    .select('id, slug, title, content, team_home_id, team_away_id, league_id, game_date, og_image_url, highlight_id, status')
    .not('highlight_id', 'is', null);

  if (slugsFilter) query = query.eq('slug', slugsFilter);

  const { data: posts, error } = await query.limit(limit);
  if (error) { log('error:', error); return; }
  log(`Got ${posts?.length || 0} posts\n`);

  const summary = { PASS: 0, FAIL: 0, NEEDS_PBP: 0, NEEDS_VERIFY: 0, CANNOT_VERIFY: 0, META: 0, NOTE: 0, UNHANDLED: 0 };
  const articleReports = [];

  for (let i = 0; i < (posts || []).length; i++) {
    const p = posts[i];
    const ytId = extractYouTubeId(p.og_image_url);
    const claims = extractClaims(p);
    const boxscore = await fetchBoxscore(p);
    const results = boxscore ? verifyClaims(claims, boxscore) : claims.map(c => ({ claim: c, status: 'CANNOT_VERIFY', reason: 'no boxscore fetched' }));

    for (const r of results) summary[r.status] = (summary[r.status] || 0) + 1;

    articleReports.push({
      slug: p.slug,
      title: p.title,
      league_id: p.league_id,
      game_date: p.game_date,
      yt_id: ytId,
      claims_count: claims.length,
      boxscore_source: boxscore?.source || null,
      results,
    });

    log(`[${i + 1}/${posts.length}] ${p.slug} → ${boxscore ? '✓' : '✗'} ${results.filter(r => r.status === 'FAIL').length} FAIL`);
  }

  if (saveJson) {
    process.stdout.write(JSON.stringify({ summary, reports: articleReports }, null, 2));
  } else {
    log(`\n${'='.repeat(80)}`);
    log(`SUMMARY:`);
    log(JSON.stringify(summary, null, 2));
    log(`\nPer-article detail:`);
    for (const a of articleReports) {
      const fails = a.results.filter(r => r.status === 'FAIL');
      if (fails.length === 0) continue;
      log(`\n${'─'.repeat(60)}`);
      log(`SLUG: ${a.slug}`);
      log(`TITLE: ${a.title}`);
      log(`BOXSCORE: ${a.boxscore_source || 'NONE'}`);
      for (const r of fails) {
        log(`  ❌ ${r.reason}`);
      }
    }
  }
})().catch(e => { console.error('FATAL:', e.message, e.stack); });
