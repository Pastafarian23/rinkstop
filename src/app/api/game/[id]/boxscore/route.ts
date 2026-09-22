import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIP, applyRateLimitHeaders } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 120, windowMs: 60 * 1000 };

const NHL_BASE = 'https://api-web.nhle.com';
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const HL_KEY = process.env.HIGHLIGHTLY_API_KEY;
const HL_HOST = 'hockey-highlights-api.p.rapidapi.com';

// League UUID → Highlightly numeric league ID. Mirrors the map in
// scripts/_audit-pipeline.cjs (HIGHLIGHTLY_LEAGUE_NAMES) and
// scripts/_daily-scores-all-leagues.cjs (HL_LEAGUE_UUIDS). Keep in lockstep
// or HL feeding for three weeks will break.
// Per Arnel 2026-09-22 02:49 CDT: /scores page clicks showed
// 'Detailed box score on the league's official site' for KHL/SHL/DEL/etc.
// because the API only handled NHL. This adds HL as the canonical source
// for non-NHL leagues, returning at least period scores + final score +
// game state description. Much better UX than a blank fallback.
const LEAGUE_UUID_TO_HL_ID: Record<string, string | number> = {
  // NHL handled separately (nhl.highlightly.net)
  '2b5f2b9d-84b9-4edb-8373-a732b72f4e40': 'NHL',
  '69d4de0c-b072-4f52-8950-eb728acdc7f9': '40781',     // SHL
  '03e919d1-2180-443b-aba4-6719d25d2eff': '16953',     // DEL
  'a08f6dac-eb1f-48b6-a11b-56fbb5642752': '30569',     // KHL
  'e052d66a-6f63-42da-94***': '32271',     // MHL
  '30fef7f6-0054-4605-83b7-ec619b72f328': '31420',     // VHL
  'dead3e40-9f79-4488-a50b-755eb9a8cee0': '51844',     // SPHL
  'dc212fdb-98bd-4fd5-842c-598ba34565b5': '14400',     // Liiga
};

// Cache: gameId → { boxscore + pbp, expiresAt }
const cache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`gamebox:${ip}`, RATE_LIMIT);
  if (!result.allowed) {
    const response = new NextResponse(JSON.stringify({ error: 'Too many requests' }), { status: 429 });
    applyRateLimitHeaders(response, result);
    return response;
  }

  const { id: gameId } = await ctx.params;
  if (!gameId) {
    return NextResponse.json({ error: 'Missing game id' }, { status: 400 });
  }

  // Cache hit
  const cached = cache.get(gameId);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  // Identify game: NHL.com 10-digit nhl_game_id, or a fixtures.uuid
  let nhlGameId: string | null = null;
  if (/^\d{10}$/.test(gameId)) {
    nhlGameId = gameId;
  } else {
    // Look up the fixture by uuid → nhl_game_id (game_data JSONB only)
// Per Arnel 2026-09-22 02:49 CDT: /scores page clicks were hitting
// 'Detailed box score on the league's official site' because the API
// only checked fixtures.nhl_game_id (column doesn't exist in prod).
// The canonical location is fixtures.game_data->>'nhl_game_id' JSONB.
// 2026-09-22 fix: SELECTING the missing column causes a 42703 error and
// returns null for the whole row — so nhl_game_id (column), game_data
// (JSONB), AND the joined teams all come back undefined. Use only the
// JSONB path; skip the column reference entirely.
    const { data: fx } = await supabaseAdmin.from('fixtures')
      .select('game_data, league_id, scheduled_at, home_team_id, away_team_id, home_team:teams!fixtures_home_team_id_fkey(name), away_team:teams!fixtures_away_team_id_fkey(name)')
      .eq('id', gameId)
      .maybeSingle();
    if (fx?.game_data?.nhl_game_id) {
      nhlGameId = String(fx.game_data.nhl_game_id);
    } else if (fx?.game_data?.hl_match_id && fx.league_id) {
      // Non-NHL: fall back to Highlightly boxscore (period scores + final score)
      const hlResp = await fetchHighlightlyBoxscore(fx);
      if (hlResp) return hlResp;
      // 2026-09-22: For IIHF / Stanley Cup / Olympic content, also try
      // Wikipedia as a 3rd cross-source. Returns null gracefully if no
      // fixture matches a Wikipedia table. Per Arnel's accuracy concern
      // (2026-09-22 00:48 CDT), Wikipedia match alone = 'wikipedia'
      // source flag (NOT auto-upgraded to PASS_HIGH). Only confirms
      // what HL already provided.
      const wikiResp = await fetchWikipediaBoxscore(fx);
      if (wikiResp) return wikiResp;
      // Fall through to NHL.com path or "non-nhl" response
      return NextResponse.json({ source: 'none', reason: 'non-nhl' });
    } else {
      // Not an NHL game — return null gracefully (page shows "detailed stats on league.com")
      return NextResponse.json({ source: 'none', reason: 'non-nhl' });
    }
  }

  // Fetch boxscore + play-by-play in parallel
  const fetchBox = async (): Promise<any | null> => {
    const r = await fetch(`${NHL_BASE}/v1/gamecenter/${nhlGameId}/boxscore`);
    return r.ok ? r.json() : null;
  };
  const fetchPbp = async (): Promise<any | null> => {
    const r = await fetch(`${NHL_BASE}/v1/gamecenter/${nhlGameId}/play-by-play`);
    return r.ok ? r.json() : null;
  };
  const [boxRes, pbpRes] = await Promise.all([
    fetchBox().catch<any>(() => null),
    fetchPbp().catch<any>(() => null),
  ]);

  if (!boxRes) {
    return NextResponse.json({ source: 'nhl.com', error: 'boxscore fetch failed' }, { status: 502 });
  }

  // Build a player-id → name lookup from boxscore
  const playerNames: Record<number, string> = {};
  for (const side of ['homeTeam', 'awayTeam'] as const) {
    const pbg = boxRes.playerByGameStats?.[side] || {};
    for (const group of ['forwards', 'defense', 'goalies'] as const) {
      for (const p of pbg[group] || []) {
        if (p.playerId && p.name?.default) playerNames[p.playerId] = p.name.default;
      }
    }
  }

  // Extract goals from play-by-play
  const goals: any[] = [];
  if (pbpRes?.plays) {
    for (const p of pbpRes.plays) {
      if (p.typeDescKey !== 'goal') continue;
      const d = p.details || {};
      const isHome = d.eventOwnerTeamId === boxRes.homeTeam?.id;
      goals.push({
        period: p.period,
        periodDescriptor: pbpRes.periodDescriptor, // for OT detection
        timeInPeriod: p.timeInPeriod,
        timeRemaining: p.timeRemaining,
        scorer: { id: d.scoringPlayerId, name: playerNames[d.scoringPlayerId] || `Player ${d.scoringPlayerId}`, total: d.scoringPlayerTotal },
        assist1: d.assist1PlayerId ? { id: d.assist1PlayerId, name: playerNames[d.assist1PlayerId] || `Player ${d.assist1PlayerId}`, total: d.assist1PlayerTotal } : null,
        assist2: d.assist2PlayerId ? { id: d.assist2PlayerId, name: playerNames[d.assist2PlayerId] || `Player ${d.assist2PlayerId}`, total: d.assist2PlayerTotal } : null,
        shotType: d.shotType,
        strength: d.strength || null,
        homeScore: d.homeScore,
        awayScore: d.awayScore,
        isHome,
      });
    }
  }

  // Goalie decisions: starter with goalsAgainst > 0 + W/L from gameOutcome
  const goalies: any = { home: null, away: null };
  const gameOutcome = boxRes.gameOutcome || {};
  for (const side of ['homeTeam', 'awayTeam'] as const) {
    const starters = boxRes.playerByGameStats?.[side]?.goalies?.filter((g: any) => g.starter) || [];
    const starter = starters[0];
    if (starter) {
      goalies[side === 'homeTeam' ? 'home' : 'away'] = {
        name: starter.name?.default,
        playerId: starter.playerId,
        goalsAgainst: starter.goalsAgainst,
        saves: starter.saves,
        shotsAgainst: starter.shotsAgainst,
        savePct: starter.shotsAgainst > 0 ? (starter.saves / starter.shotsAgainst).toFixed(3) : null,
        toi: starter.toi,
        decision: side === 'homeTeam' ? gameOutcome.lastWinner || null : (gameOutcome.lastLoser === null && gameOutcome.lastWinner !== null ? null : null),
      };
    }
  }

  // Player stats: forwards/defense/goalies for each team
  const playerStats: any = { home: { forwards: [], defense: [], goalies: [] }, away: { forwards: [], defense: [], goalies: [] } };
  for (const side of ['homeTeam', 'awayTeam'] as const) {
    const pbg = boxRes.playerByGameStats?.[side] || {};
    const key = side === 'homeTeam' ? 'home' : 'away';
    playerStats[key].forwards = (pbg.forwards || []).map((p: any) => ({
      name: p.name?.default, position: p.position, sweaterNumber: p.sweaterNumber,
      goals: p.goals, assists: p.assists, points: p.points, plusMinus: p.plusMinus,
      pim: p.pim, hits: p.hits, sog: p.sog, blockedShots: p.blockedShots,
      powerPlayGoals: p.powerPlayGoals, faceoffWinningPctg: p.faceoffWinningPctg,
      toi: p.toi, shifts: p.shifts,
    }));
    playerStats[key].defense = (pbg.defense || []).map((p: any) => ({
      name: p.name?.default, position: p.position, sweaterNumber: p.sweaterNumber,
      goals: p.goals, assists: p.assists, points: p.points, plusMinus: p.plusMinus,
      pim: p.pim, hits: p.hits, sog: p.sog, blockedShots: p.blockedShots,
      toi: p.toi, shifts: p.shifts,
    }));
    playerStats[key].goalies = (pbg.goalies || []).map((p: any) => ({
      name: p.name?.default, sweaterNumber: p.sweaterNumber, starter: p.starter,
      goalsAgainst: p.goalsAgainst, saves: p.saves, shotsAgainst: p.shotsAgainst,
      savePct: p.shotsAgainst > 0 ? (p.saves / p.shotsAgainst).toFixed(3) : null,
      toi: p.toi, pim: p.pim,
    }));
  }

  // Team stats
  const teamStats: any = { home: null, away: null };
  for (const side of ['homeTeam', 'awayTeam'] as const) {
    const t = boxRes[side];
    const key = side === 'homeTeam' ? 'home' : 'away';
    teamStats[key] = {
      sog: t.sog,
      score: t.score,
      abbrev: t.abbrev,
      placeName: t.placeName?.default,
    };
  }

  // Game metadata
  const gameInfo = {
    id: boxRes.id,
    season: boxRes.season,
    gameType: boxRes.gameType,
    gameDate: boxRes.gameDate,
    gameState: boxRes.gameState,
    periodDescriptor: boxRes.periodDescriptor,
    regPeriods: boxRes.regPeriods,
    venue: boxRes.venue?.default,
    venueLocation: `${boxRes.venueLocation?.default || ''}`.trim(),
    startTimeUTC: boxRes.startTimeUTC,
    threeStars: (boxRes.summary?.threeStars || []).map((s: any) => ({
      star: s.star, playerId: s.playerId,
      name: playerNames[s.playerId] || `Player ${s.playerId}`, teamAbbrev: s.teamAbbrev,
    })),
  };

  const response = {
    source: 'nhl.com',
    gameInfo,
    teamStats,
    goals,
    goalies,
    playerStats,
    cachedAt: new Date().toISOString(),
  };

  cache.set(gameId, { data: response, expiresAt: Date.now() + CACHE_TTL_MS });
  const out = NextResponse.json(response);
  out.headers.set('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=600');
  applyRateLimitHeaders(out, result);
  return out;
}
// fetchHighlightlyBoxscore — 2026-09-22 fallback for non-NHL leagues.
// HL's matches list endpoint returns period scores, final score, and game
// state description. Not as rich as NHL.com (no player stats, no goal log)
// but still 10x better UX than 'go check the league's site'.
async function fetchHighlightlyBoxscore(fx: any): Promise<NextResponse | null> {
  if (!HL_KEY) return null;
  const hlLeagueId = LEAGUE_UUID_TO_HL_ID[fx.league_id];
  if (!hlLeagueId) return null;
  const hlMatchId = fx.game_data?.hl_match_id;
  if (!hlMatchId) return null;

  // HL uses nhl.highlightly.net for NHL (handled above) and
  // hockey.highlightly.net for everything else. Liiga/AHL/etc live on
  // hockey.highlightly.net with the league id.
  const url = (hlLeagueId === 'NHL')
    ? `https://nhl.highlightly.net/matches?date=${(fx.scheduled_at || '').slice(0,10)}&limit=50`
    : `https://hockey.highlightly.net/matches?leagueId=${hlLeagueId}&date=${(fx.scheduled_at || '').slice(0,10)}&limit=20`;
  const host = (hlLeagueId === 'NHL') ? 'nhl.highlightly.net' : HL_HOST;
  let j: any;
  try {
    const res = await fetch(url, { headers: { 'x-rapidapi-key': HL_KEY, 'x-rapidapi-host': host } });
    if (!res.ok) return null;
    j = await res.json();
  } catch {
    return null;
  }
  const matches: any[] = Array.isArray(j.data) ? j.data : Array.isArray(j) ? j : [];
  const match = matches.find(m => String(m.id) === String(hlMatchId));
  if (!match) return null;

  const score = match.state?.score || {};
  const current = (score.current || '').split('-').map((n: string) => Number(n.trim()));
  const parsePeriod = (s?: string) => (s || '').split('-').map((n: string) => Number(n.trim()));
  const homeScore = current[0] ?? fx.home_score ?? null;
  const awayScore = current[1] ?? fx.away_score ?? null;
  const response: any = {
    source: 'highlightly',
    leagueName: match.league?.name || null,
    gameInfo: {
      id: String(match.id),
      gameDate: (match.date || '').slice(0, 10),
      gameState: match.state?.description || 'Final',
      venue: match.venue?.name || null,
      venueLocation: match.venue?.city ? `${match.venue.city}, ${match.venue.country || ''}`.trim() : null,
      threeStars: [],
    },
    teamStats: {
      home: {
        abbrev: match.homeTeam?.abbreviation || null,
        name: match.homeTeam?.name || null,
        score: homeScore,
        sog: null, // HL doesn't expose SOG for non-NHL
      },
      away: {
        abbrev: match.awayTeam?.abbreviation || null,
        name: match.awayTeam?.name || null,
        score: awayScore,
        sog: null,
      },
    },
    periodScores: {
      first: parsePeriod(score.firstPeriod),
      second: parsePeriod(score.secondPeriod),
      third: parsePeriod(score.thirdPeriod),
      overtime: parsePeriod(score.overTime),
      // 2026-09-22 audit fix (bug #16): HL's `score.penalties` field is
      // the PENALTY-SHOOTOUT period score (e.g. 1-0 after shootout).
      // We previously labelled this `shootout` which is technically
      // accurate but ambiguous. Keep both names so consumers can use
      // either, but document the source. Note: there is no separate
      // "main shootout" field — HL conflates it under penalties.
      penalties: parsePeriod(score.penalties),
      shootout: parsePeriod(score.penalties),
    },
    goals: [], // HL doesn't expose goal log via this endpoint
    goalies: { home: null, away: null },
    playerStats: { home: { forwards: [], defense: [], goalies: [] }, away: { forwards: [], defense: [], goalies: [] } },
    cachedAt: new Date().toISOString(),
  };
  // Final score echo from DB to verify HL agrees
  if (fx.home_score != null && homeScore != null && Number(fx.home_score) !== Number(homeScore)) {
    response.scoreDiscrepancy = { home: { db: fx.home_score, hl: homeScore }, away: { db: fx.away_score, hl: awayScore } };
  }
  const out = NextResponse.json(response);
  out.headers.set('Cache-Control', 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800');
  return out;
}

// fetchWikipediaBoxscore — 2026-09-22: Wikipedia cross-source for
// IIHF events, Stanley Cup playoffs, Olympic qualifiers.
// Returns null if the league isn't a known Wikipedia target OR the
// game isn't in the page's tables. Per Arnel's accuracy concern,
// Wikipedia matches are flagged as source='wikipedia' so the page
// shows them with the same fidelity as HL but doesn't auto-upgrade
// to PASS_HIGH (that decision is up to the audit pipeline, not
// the boxscore API).
async function fetchWikipediaBoxscore(fx: any): Promise<NextResponse | null> {
  const leagueSlug = (fx as any)?.game_data?.wikipedia_page || null;
  // 2026-09-22 audit fix (bug #12): year was hardcoded to 2024.
  // Build the Wikipedia page slug from the actual scheduled_at year
  // so 2025 and 2026 events also resolve. Fallback chain:
  //   1) explicit game_data.wikipedia_page override
  //   2) per-league known pages for the year of the game
  //   3) generic most-recent page
  const eventYear = (fx?.scheduled_at || '').slice(0, 4) || String(new Date().getFullYear());
  const WIKI_PAGE_BY_LEAGUE_YEAR: Record<string, (year: string) => string> = {
    'iihf-worlds': (y) => `${y} IIHF World Championship`,
    'iihf-world-championships': (y) => `${y} IIHF World Championship`,
    'olympic-games-world': (y) => (y === '2026' ? '2026 Winter Olympics' : `${y} Winter Olympics`),
    'olympic-games-women-world': (y) => (y === '2026' ? '2026 Winter Olympics' : `${y} Winter Olympics`),
    'stanley-cup-final': (y) => `${y} Stanley Cup Final`,
    'stanley-cup-playoffs': (y) => `${y} Stanley Cup playoffs`,
  };
  const pageSlug =
    leagueSlug ||
    (WIKI_PAGE_BY_LEAGUE_YEAR[fx?.league?.slug] && WIKI_PAGE_BY_LEAGUE_YEAR[fx?.league?.slug](eventYear)) ||
    null;
  if (!pageSlug) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { lookupWikipediaBoxscore } = require('../../../server/cross-source/wikipedia-boxscore.cjs');
    const dateIso = (fx.scheduled_at || '').slice(0, 10);
    // 2026-09-22 audit fix (bug #13): previous code declared
    // visitorHint/homeHint from team FK joins then OVERWROTE them
    // with potentially-empty game_data values, falling through to
    // empty strings. Now use the FX joins as the authoritative
    // source, with game_data as fallback (FX joins always resolve
    // when fixtures.home_team_id/away_team_id are set; game_data
    // fields are only populated by HL fallback path).
    const homeName = fx?.home_team?.name || (fx as any)?.game_data?.home_team_name || '';
    const awayName = fx?.away_team?.name || (fx as any)?.game_data?.away_team_name || '';
    // The Wikipedia IIHF template order is {{ih-rt|visitor}} vs {{ih|home}}
    // — i.e., the visiting team (away) is listed first in the table.
    // In our fixtures schema, home_team_id = the home arena team, and
    // away_team_id = the visitor. So:
    //   visitorHint = away team name
    //   homeHint    = home team name
    const result = await lookupWikipediaBoxscore({
      pageSlug,
      dateIso,
      visitorHint: awayName,
      homeHint: homeName,
    });
    if (!result) return null;
    const response: any = {
      source: 'wikipedia',
      gameInfo: {
        id: `${pageSlug}-${dateIso}-${result.visitor}-${result.home}`,
        gameDate: result.date,
        gameState: result.otSo ? `Final/${result.otSo}` : 'Final',
        venue: null,
        venueLocation: null,
        threeStars: [],
      },
      teamStats: {
        home: { name: result.home, score: result.homeScore, sog: null },
        away: { name: result.visitor, score: result.visitorScore, sog: null },
      },
      periodScores: null,
      goals: [],
      goalies: { home: null, away: null },
      playerStats: { home: { forwards: [], defense: [], goalies: [] }, away: { forwards: [], defense: [], goalies: [] } },
      cachedAt: new Date().toISOString(),
      wikipediaPage: pageSlug,
      wikipediaOtSo: result.otSo,
    };
    const out = NextResponse.json(response);
    out.headers.set('Cache-Control', 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800');
    return out;
  } catch (e) {
    return null;
  }
}
