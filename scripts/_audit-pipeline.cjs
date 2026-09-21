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
const cache = require('./_games-cache.cjs');
const xsource = require('./_verify-cross-source.cjs');
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
  // Match: "Final score: Team A N, Team B M." (with apostrophes in team names OK)
  // Approach: find the line containing "Final score", then split on ","
  const fsLineMatch = content.match(/final\s+score[:\s]+([^\n]+)/i);
  if (fsLineMatch) {
    const line = fsLineMatch[1];
    const halves = line.split(',');
    if (halves.length >= 2) {
      const left = halves[0].replace(/^\*+\s*/, '').trim();
      const right = halves.slice(1).join(',').trim();
      // Extract score from end of each half: text + space + digits
      const lMatch = left.match(/^(.+?)\s+(\d+)\s*$/);
      const rMatch = right.match(/^(.+?)\s+(\d+)\s*\.?\s*$/);
      if (lMatch && rMatch) {
        claims.push({
          type: 'final_score_line',
          teamA: lMatch[1].trim(),
          scoreA: parseInt(lMatch[2], 10),
          teamB: rMatch[1].trim(),
          scoreB: parseInt(rMatch[2], 10),
          source: 'body',
        });
      }
    }
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
      const homeName = [data?.homeTeam?.placeName?.default, data?.homeTeam?.commonName?.default].filter(Boolean).join(' ')
        || data?.homeTeam?.name?.default
        || data?.home_team_name
        || data?.home_team?.name
        || data?.home?.name
        || '';
      const awayName = [data?.awayTeam?.placeName?.default, data?.awayTeam?.commonName?.default].filter(Boolean).join(' ')
        || data?.awayTeam?.name?.default
        || data?.away_team_name
        || data?.away_team?.name
        || data?.away?.name
        || '';
      const homeTri = data?.homeTeam?.abbrev || data?.home_team?.abbrev || '';
      const awayTri = data?.awayTeam?.abbrev || data?.away_team?.abbrev || '';
      const homeScore = data?.homeTeam?.score ?? data?.home_team?.score ?? data?.home_score;
      const awayScore = data?.awayTeam?.score ?? data?.away_team?.score ?? data?.away_score;

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
      // Cache format (new): data has period_type, period_number columns flattened
      // Live fetch format: data has periodDescriptor, gameOutcome, etc.
      const periodType = data?.period_type || data?.periodDescriptor?.periodType || data?.gameOutcome?.lastPeriodType || '';
      const periodNumber = data?.period_number || data?.periodDescriptor?.number || 0;
      const isOT = periodType === 'OT' || periodNumber === 4;
      const isSO = periodType === 'SO' || periodNumber === 5;
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

// Fallback for articles whose slug doesn't carry a 10-digit NHL game ID
// (added 2026-09-21 per Arnel's 'articles must be published' directive).
// Uses NHL.com /v1/schedule/{game_date} to find the game by team FKs.
// Returns the same shape as fetchNhlBoxscore or null if no match.
async function fetchNhlBoxscoreByDate(gameDate, teamHomeId, teamAwayId) {
  if (!gameDate || !teamHomeId || !teamAwayId) return null;
  try {
    // Look up team abbreviations from our teams table
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, slug')
      .in('id', [teamHomeId, teamAwayId]);
    if (!teams || teams.length < 2) return null;
    const homeTeam = teams.find(t => t.id === teamHomeId);
    const awayTeam = teams.find(t => t.id === teamAwayId);
    if (!homeTeam || !awayTeam) return null;

    // Fetch NHL.com schedule for the date
    const r = await fetch(`https://api-web.nhle.com/v1/schedule/${gameDate}`);
    if (!r.ok) return null;
    const data = await r.json();
    const gameWeek = data.gameWeek || [];
    const dayData = gameWeek.find(d => d.date === gameDate);
    if (!dayData) return null;
    const games = dayData.games || [];

    // Match by team name (NHL.com returns "Pittsburgh" / "Penguins"; we need fuzzy)
    const homeKey = (homeTeam.name || '').toLowerCase().split(/\s+/)[0];
    const awayKey = (awayTeam.name || '').toLowerCase().split(/\s+/)[0];
    for (const g of games) {
      const hName = ((g.homeTeam?.placeName?.default || '') + ' ' + (g.homeTeam?.commonName?.default || '')).trim().toLowerCase();
      const aName = ((g.awayTeam?.placeName?.default || '') + ' ' + (g.awayTeam?.commonName?.default || '')).trim().toLowerCase();
      if ((hName.includes(homeKey) || hName.includes(awayKey)) && (aName.includes(awayKey) || aName.includes(homeKey))) {
        // Found the game — fetch its boxscore
        const boxRes = await fetch(`https://api-web.nhle.com/v1/gamecenter/${g.id}/boxscore`);
        if (!boxRes.ok) return null;
        const boxData = await boxRes.json();
        return { source: `nhl.com (date-match, game ${g.id})`, data: boxData };
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Highlightly league ID -> Highlightly numeric ID
const HIGHLIGHTLY_LEAGUE_NAMES = {
  '69d4de0c-b072-4f52-8950-eb728acdc7f9': '40781',     // SHL
  '03e919d1-2180-443b-aba4-6719d25d2eff': '16953',     // DEL
  'a08f6dac-eb1f-48b6-a11b-56fbb5642752': '30569',     // KHL
  'e052d66a-6f63-42da-94fc-25a809203c2f': '32271',     // MHL
  '30fef7f6-0054-4605-83b7-ec619b72f328': '31420',     // VHL
  'dead3e40-9f79-4488-a50b-755eb9a8cee0': '51844',     // SPHL
  '1ad37b08-894c-42dd-8583-2247bf927b6c': '32271',     // Friendly Intl → MHL proxy
};
const HIGHKEY = process.env.HIGHLIGHTLY_API_KEY;

async function findHighlightlyMatch(highLid, dateIso, homeHint, awayHint) {
  const dates = [dateIso];
  const baseD = new Date((dateIso || '2026-01-01') + 'T00:00:00Z');
  for (let i = 1; i <= 2; i++) {
    dates.push(new Date(baseD.getTime() + i * 86400000).toISOString().slice(0, 10));
    dates.push(new Date(baseD.getTime() - i * 86400000).toISOString().slice(0, 10));
  }
  for (const d of dates) {
    try {
      const r = await fetch('https://hockey.highlightly.net/matches?leagueId=' + highLid + '&date=' + d + '&limit=20', {
        headers: { 'x-rapidapi-key': HIGHKEY, 'x-rapidapi-host': 'hockey-highlights-api.p.rapidapi.com' },
      });
      if (!r.ok) continue;
      const j = await r.json();
      const matches = Array.isArray(j.data) ? j.data : (Array.isArray(j) ? j : []);
      for (const raw of matches) {
        const homeName = raw.home?.name || raw.homeTeam?.name || '';
        const awayName = raw.away?.name || raw.awayTeam?.name || '';
        const scoreRaw = raw.state?.score?.current;
        if (!scoreRaw) continue;
        const parts = scoreRaw.split('-').map(s => parseInt(s.trim(), 10));
        if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) continue;
        // Try matching both directions (homeHint as either home or away)
        // Use cache.norm() to strip diacritics so "Eisbaren" matches "Eisbären"
        const a = cache.norm(homeName) === cache.norm(homeHint.split(' ')[0])
          ? cache.norm(homeName) : cache.norm(awayName) === cache.norm(homeHint.split(' ')[0]) ? cache.norm(awayName) : '';
        const b = cache.norm(awayName) === cache.norm(awayHint.split(' ')[0])
          ? cache.norm(awayName) : cache.norm(homeName) === cache.norm(awayHint.split(' ')[0]) ? cache.norm(homeName) : '';
        // Better: just normalize both sides and compare
        const homeN = cache.norm(homeName);
        const awayN = cache.norm(awayName);
        const articleHomeN = cache.norm(homeHint);
        const articleAwayN = cache.norm(awayHint);
        const directMatch = (homeN === articleHomeN && awayN === articleAwayN) ||
                            (awayN === articleHomeN && homeN === articleAwayN) ||
                            // Allow loose match on first word too (legacy fallback)
                            (homeName.toLowerCase().includes(articleHomeN) && awayName.toLowerCase().includes(articleAwayN)) ||
                            (awayName.toLowerCase().includes(articleHomeN) && homeName.toLowerCase().includes(articleAwayN));
        if (directMatch) {
          return {
            homeTeamName: homeName, awayTeamName: awayName,
            homeScore: parts[0], awayScore: parts[1],
            date: d,
            state: raw.state?.description,
            scoreOverTime: raw.state?.score?.overTime || null,
            scorePenalties: raw.state?.score?.penalties || null,
            scoreFirstPeriod: raw.state?.score?.firstPeriod || null,
            scoreSecondPeriod: raw.state?.score?.secondPeriod || null,
            scoreThirdPeriod: raw.state?.score?.thirdPeriod || null,
          };
        }
      }
    } catch (e) {}
  }
  return null;
}


// Wrap any boxscore fetch with cache-first logic.
// liveFetch() should return { source, leagueName, boxscore: {home_team, away_team, home_score, away_score} } or null.
// If cache hit: returns cached boxscore (0 API calls).
// If cache miss: live fetch, write to cache, then return.
async function fetchWithCache(source, sourceLeagueId, leagueName, dateIso, homeHint, awayHint, leagueId, liveFetch) {
  // 1. Cache lookup
  const cached = await cache.lookup({ date: dateIso, homeHint, awayHint });
  let finishedRows = cached.filter(r => r.finished);
  let liveRows = [];
  if (finishedRows.length === 0) {
    // 2. Live fetch
    const result = await liveFetch();
    if (process.env.DEBUG) console.error('DEBUG fetchWithCache', source, 'liveFetch result:', result ? 'OK' : 'NULL', 'boxscore:', result?.boxscore ? 'present' : 'MISSING');
    if (!result || !result.boxscore) return null;
    const bx = result.boxscore;
    // 3. Write to cache (insert-only via upsert)
    const hs = bx.home_team_name || bx.home_team?.name || bx.home?.name || null;
    const as_ = bx.away_team_name || bx.away_team?.name || bx.away?.name || null;
    const hn = cache.norm(hs);
    const an = cache.norm(as_);
    if (!hs || !as_ || !hn || !an) return result;
    // Extract period info from various adapter schemas
    const rawBoxscore = bx.raw || bx;
    const periodDescriptor = rawBoxscore?.periodDescriptor || {};
    const gameOutcome = rawBoxscore?.gameOutcome || {};
    liveRows = [{
      source,
      source_league_id: sourceLeagueId,
      league_name: leagueName,
      league_id: leagueId,
      game_date: dateIso,
      home_team_name: hs, away_team_name: as_,
      home_team_normalized: hn, away_team_normalized: an,
      home_score: bx.home_score,
      away_score: bx.away_score,
      raw_score: (bx.raw_score || bx.raw?.state?.score?.current) || null,
      finished: true,
      raw: bx.raw !== undefined ? bx.raw : null,
      period_type: periodDescriptor.periodType || gameOutcome.lastPeriodType || null,
      period_number: periodDescriptor.number || null,
    }];
    if (process.env.DEBUG_CACHE) console.error('DEBUG cache.write', source, 'has_raw=', !!liveRows[0].raw);
    await cache.write(liveRows[0]);
    finishedRows = liveRows;
  }
  // 4. Use verifyFromCache to decide multi-source vs single-source
  const v = xsource.verifyFromCache(finishedRows);
  return v.boxscore ? { ...v.boxscore, xsource_meta: { status: v.status, sources: v.sources } } : null;
}

// Derive periodDescriptor from a Highlightly raw match.
function derivePeriodDescriptor(highlightlyResult) {
  const ot = highlightlyResult?.scoreOverTime;
  const so = highlightlyResult?.scorePenalties;
  if (so && /^\d/.test(so)) return { number: 5, periodType: 'SO' };
  if (ot && /^\d/.test(ot)) return { number: 4, periodType: 'OT' };
  return { number: 3, periodType: 'REG' };
}

async function fetchHighlightlyBoxscore(leagueId, gameDate, title) {
  const highLid = HIGHLIGHTLY_LEAGUE_NAMES[leagueId];
  if (!highLid) return null;
  const tParts = (title || '').split(' top ');
  if (tParts.length < 2) return null;
  const homeHint = tParts[0].trim();
  const restAfter = tParts[1];
  const awayMatch = restAfter.match(/^(.+?)\s+\d/);
  if (!awayMatch) return null;
  const awayHint = awayMatch[1].trim();
  const result = await findHighlightlyMatch(highLid, gameDate, homeHint, awayHint);
  if (!result) return null;
  // Determine OT/SO from raw response (fetched inside the function via overTime/penalties fields)
  // Note: findHighlightlyMatch currently doesn't expose the raw match — return raw=hit
  return {
    source: 'highlightly (' + highLid + ', ' + result.homeTeamName + ' vs ' + result.awayTeamName + ')',
    data: {
      home_team: { name: result.homeTeamName },
      away_team: { name: result.awayTeamName },
      home_score: result.homeScore,
      away_score: result.awayScore,
      state: result.state,
      // Period info extracted from overTime/penalties score components
      periodDescriptor: derivePeriodDescriptor(result),
      gameOutcome: derivePeriodDescriptor(result),
    },
  };
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

async function fetchIihfBoxscore(gameDate, title) {
  // IIHF world championship data via fixturedownload.com
  // For "Slovakia top Sweden 4-2" articles dated 2026-05-26, etc.
  const year = gameDate ? parseInt(gameDate.slice(0, 4), 10) : 2026;
  const yearsToTry = [year - 1, year, year + 1].filter(y => y >= 2015 && y <= 2030);
  const tm = (title || '').match(/^(.+?)\s+(?:top|defeat|beat|edge|down)\s+(.+?)\s+\d+-\d+/i);
  if (!tm) return null;
  const articleTeams = [tm[1].replace(/^\*\*/, '').trim(), tm[2].trim()];
  const articleTeamKeys = articleTeams.map(t => ({ full: t.toLowerCase(), last: t.toLowerCase().split(' ').pop() }));

  for (const y of yearsToTry) {
    try {
      const r = await fetch(`https://fixturedownload.com/feed/json/iihf-ice-hockey-world-championship-${y}`);
      if (!r.ok) continue;
      const j = await r.json();
      const games = Array.isArray(j) ? j : (j.games || []);
      const d0 = new Date(gameDate + 'T00:00:00Z');
      const dayBefore = new Date(d0); dayBefore.setUTCDate(d0.getUTCDate() - 1);
      const dayAfter = new Date(d0); dayAfter.setUTCDate(d0.getUTCDate() + 1);
      const dateKeys = [dayBefore.toISOString().slice(0,10), gameDate, dayAfter.toISOString().slice(0,10)];
      // Prefer exact date
      let match = games.find(g => {
        if ((g.DateUtc || '').slice(0, 10) !== gameDate) return false;
        if (g.HomeTeamScore === null || g.AwayTeamScore === null) return false;
        const h = (g.HomeTeam || '').toLowerCase();
        const a = (g.AwayTeam || '').toLowerCase();
        return articleTeamKeys.some(k => h.includes(k.last)) && articleTeamKeys.some(k => a.includes(k.last));
      });
      if (!match) {
        match = games.find(g => {
          if (!dateKeys.includes((g.DateUtc || '').slice(0, 10))) return false;
          if (g.HomeTeamScore === null || g.AwayTeamScore === null) return false;
          const h = (g.HomeTeam || '').toLowerCase();
          const a = (g.AwayTeam || '').toLowerCase();
          return articleTeamKeys.some(k => h.includes(k.last)) && articleTeamKeys.some(k => a.includes(k.last));
        });
      }
      if (match) {
        return {
          source: `fixturedownload iihf-${y}`,
          data: {
            homeTeam: { name: { default: match.HomeTeam }, score: match.HomeTeamScore },
            awayTeam: { name: { default: match.AwayTeam }, score: match.AwayTeamScore },
            periodDescriptor: { number: 3, periodType: 'REG' },
            gameOutcome: { lastPeriodType: 'REG' },
          }
        };
      }
    } catch (e) {}
  }
  return null;
}

async function fetchBoxscore(article) {
  let leagueId = article.league_id;
  if (!leagueId && article.team_home_id) {
    leagueId = await lookupTeamLeague(article.team_home_id);
  }

  // Extract team hints from article title (for cache lookup keys)
  const titleForHints = article.title || '';
  const tm = titleForHints.match(/^(.+?)\s+(?:top|defeat|beat|edge|down)\s+(.+?)\s+\d+-\d+/i);
  const articleHomeHint = tm ? tm[1].replace(/^\*\*/, '').trim() : null;
  const articleAwayHint = tm ? tm[2].trim() : null;
  if (!articleHomeHint || !articleAwayHint) {
    // Can't cache without hints — fall back to existing per-adapter flow
    return fetchBoxscoreNoCache(article, leagueId);
  }

  // NHL.com — cache first (source: nhl_com)
  if (leagueId === '2b5f2b9d-84b9-4edb-8373-a732b72f4e40') {
    return fetchWithCache(
      'nhl_com', '', 'NHL',
      article.game_date, articleHomeHint, articleAwayHint, leagueId,
      async () => {
        // Try slug-based game ID first (fast path). If that fails AND
        // the post has team FKs + game_date stamped, fall back to
        // date-based NHL.com schedule lookup (added 2026-09-21 per
        // Arnel's 'articles must be published, not held in drafts' directive).
        let b = await fetchNhlBoxscore(article.slug);
        if (!b || !b.data) {
          if (article.team_home_id && article.team_away_id && article.game_date) {
            b = await fetchNhlBoxscoreByDate(article.game_date, article.team_home_id, article.team_away_id);
          }
        }
        if (!b || !b.data) return null;
        const d = b.data;
        const homeName = d.homeTeam?.placeName?.default
          ? (d.homeTeam.placeName.default + ' ' + (d.homeTeam.commonName?.default || '')).trim()
          : (d.homeTeam?.name?.default || '');
        const awayName = d.awayTeam?.placeName?.default
          ? (d.awayTeam.placeName.default + ' ' + (d.awayTeam.commonName?.default || '')).trim()
          : (d.awayTeam?.name?.default || '');
        return {
          source: 'nhl_com',
          leagueName: 'NHL',
          boxscore: {
            home_team_name: homeName,
            away_team_name: awayName,
            home_score: d.homeTeam?.score,
            away_score: d.awayTeam?.score,
            raw_score: (d.homeTeam?.score ?? '?') + ' - ' + (d.awayTeam?.score ?? '?'),
            raw: d,
          },
        };
      }
    );
  }

  // IIHF
  const iiTfCountries = /Slovakia|Sweden|Czechia|Czech|Slovenia|Switzerland|Germany|Austria|France|Norway|Finland|Denmark|Hungary|Latvia|Italy|Great Britain|Canada|United States/i;
  if (iiTfCountries.test(article.title || '')) {
    return fetchWithCache(
      'iihf_fixture', 'world', 'IIHF',
      article.game_date, articleHomeHint, articleAwayHint, leagueId,
      () => fetchIihfBoxscore(article.game_date, article.title || '').then(b => {
        if (!b || !b.data) return null;
        const d = b.data;
        const homeName = d.homeTeam?.name?.default || d.home_team_name || '';
        const awayName = d.awayTeam?.name?.default || d.away_team_name || '';
        return {
          source: 'iihf_fixture',
          leagueName: 'IIHF',
          boxscore: {
            home_team_name: homeName,
            away_team_name: awayName,
            home_score: d.homeTeam?.score ?? d.home_score,
            away_score: d.awayTeam?.score ?? d.away_score,
            raw_score: (d.homeTeam?.score ?? '?') + ' - ' + (d.awayTeam?.score ?? '?'),
            raw: d,
          },
        };
      })
    );
  }

  // Highlightly (other-hockey subscription)
  if (HIGHLIGHTLY_LEAGUE_NAMES[leagueId]) {
    const highLid = HIGHLIGHTLY_LEAGUE_NAMES[leagueId];
    return fetchWithCache(
      'highlightly_hockey', highLid, 'DEL/KHL/etc',
      article.game_date, articleHomeHint, articleAwayHint, leagueId,
      () => fetchHighlightlyBoxscore(leagueId, article.game_date, article.title || '').then(b => ({
        source: 'highlightly_hockey',
        leagueName: 'SHL/DEL/KHL/etc',
        boxscore: b && b.data ? {
          home_team_name: b.data.home_team?.name || b.data.home_team,
          away_team_name: b.data.away_team?.name || b.data.away_team,
          home_score: b.data.home_score, away_score: b.data.away_score,
          raw_score: b.data.raw_score || (b.data.home_score + ' - ' + b.data.away_score),
          raw: b.data,
        } : null,
      }))
    );
  }

  // HockeyTech (default adapter)
  return fetchWithCache(
    'hockeytech', 'mixed', 'HockeyTech leagues',
    article.game_date, articleHomeHint, articleAwayHint, leagueId,
    () => fetchHockeyTechBoxscore(leagueId, article.game_date, article.title || '').then(b => {
      if (!b || !b.data) return null;
      // HockeyTech returns NHL.com-style schema: homeTeam.name.default + visitingTeam.name.default
      const d = b.data;
      const homeName = d.homeTeam?.placeName?.default
        ? (d.homeTeam.placeName.default + ' ' + (d.homeTeam.commonName?.default || '')).trim()
        : (d.homeTeam?.name?.default || d.home_team_name || '');
      const awayName = d.awayTeam?.placeName?.default
        ? (d.awayTeam.placeName.default + ' ' + (d.awayTeam.commonName?.default || '')).trim()
        : (d.awayTeam?.name?.default || d.away_team_name || '');
      return {
        source: 'hockeytech',
        leagueName: 'WHL/AHL/OHL/ECHL/QMJHL',
        boxscore: {
          home_team_name: homeName,
          away_team_name: awayName,
          home_score: d.homeTeam?.score ?? d.home_score,
          away_score: d.awayTeam?.score ?? d.away_score,
          raw_score: (d.homeTeam?.score ?? d.home_score) + ' - ' + (d.awayTeam?.score ?? d.away_score),
          raw: d,
        },
      };
    })
  );
}

// Fallback for articles we can't extract team hints from (older titles without "top" pattern).
async function fetchBoxscoreNoCache(article, leagueId) {
  if (leagueId === '2b5f2b9d-84b9-4edb-8373-a732b72f4e40') {
    // Try slug-based game ID first (faster path). Fall back to date-based
    // lookup using stamped posts.team_home_id / team_away_id + game_date
    // (added 2026-09-21 per Arnel's 'articles must be published' directive).
    const slugResult = await fetchNhlBoxscore(article.slug);
    if (slugResult) return slugResult;
    if (article.team_home_id && article.team_away_id && article.game_date) {
      return fetchNhlBoxscoreByDate(article.game_date, article.team_home_id, article.team_away_id);
    }
    return null;
  }
  const iiTfCountries = /Slovakia|Sweden|Czechia|Czech|Slovenia|Switzerland|Germany|Austria|France|Norway|Finland|Denmark|Hungary|Latvia|Italy|Great Britain|Canada|United States/i;
  if (iiTfCountries.test(article.title || '')) {
    return fetchIihfBoxscore(article.game_date, article.title || '');
  }
  if (HIGHLIGHTLY_LEAGUE_NAMES[leagueId]) {
    return fetchHighlightlyBoxscore(leagueId, article.game_date, article.title || '');
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
