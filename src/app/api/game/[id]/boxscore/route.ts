import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIP, applyRateLimitHeaders } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 120, windowMs: 60 * 1000 };

const NHL_BASE = 'https://api-web.nhle.com';
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    // Look up the fixture by uuid → nhl_game_id
    const { data: fx } = await supabaseAdmin.from('fixtures')
      .select('nhl_game_id, league_id')
      .eq('id', gameId)
      .maybeSingle();
    if (fx?.nhl_game_id) {
      nhlGameId = fx.nhl_game_id;
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