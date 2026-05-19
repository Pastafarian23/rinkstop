import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

const GAMES_FILE = join(process.cwd(), 'data', 'playoff-games.json');

function readGames() {
  try {
    return JSON.parse(readFileSync(GAMES_FILE, 'utf-8'));
  } catch {
    return { games: [] };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const data = readGames();
  let games = data.games || [];

  // Always prefer live data from /api/nhl/scores if available
  try {
    const scoresRes = await fetch(new URL('/api/nhl/scores', request.url).toString(), {
      headers: { 'x-forwarded-host': request.headers.get('x-forwarded-host') || 'rinkstop.com' },
    });
    if (scoresRes.ok) {
      const scores = await scoresRes.json();
      if (scores.completed || scores.upcoming) {
        const all: any[] = [
          ...(scores.completed || []).map((g: any) => ({ ...g, status: 'completed' })),
          ...(scores.upcoming || []).map((g: any) => ({ ...g, status: 'scheduled' })),
        ];
        return NextResponse.json({ games: all, rounds: buildRounds(all) });
      }
    }
  } catch {
    // Fall back to local file
  }

  if (status === 'completed') {
    games = games.filter((g: any) => g.status === 'completed');
  } else if (status === 'scheduled') {
    games = games.filter((g: any) => g.status === 'scheduled' || g.status === 'inProgress');
  }

  const completed = games
    .filter((g: any) => g.status === 'completed')
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);

  const upcoming = games
    .filter((g: any) => g.status === 'scheduled' || g.status === 'inProgress')
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, limit);

  return NextResponse.json({ games: [...completed, ...upcoming], rounds: buildRounds(games) });
}

function buildRounds(games: any[]) {
  const roundOrder = ['First Round', 'Second Round', 'Conference Finals', 'Stanley Cup Final'];
  const byRound: Record<string, any[]> = {};
  for (const g of games) {
    if (!byRound[g.round]) byRound[g.round] = [];
    byRound[g.round].push(g);
  }
  return roundOrder
    .filter(r => byRound[r])
    .map((r, i) => ({ seriesDesc: r, round: i + 1, series: groupBySeries(byRound[r]) }));
}

function groupBySeries(games: any[]) {
  const bySeries: Record<string, any[]> = {};
  for (const g of games) {
    const key = `${g.awayTeam?.abbr}-${g.homeTeam?.abbr}`;
    if (!bySeries[key]) bySeries[key] = [];
    bySeries[key].push(g);
  }
  return Object.values(bySeries).map(seriesGames => {
    const first = seriesGames[0];
    const homeWins = seriesGames.filter(g => g.homeTeam?.winner === true).length;
    const awayWins = seriesGames.filter(g => g.awayTeam?.winner === true).length;
    const nextGame = seriesGames
      .filter(g => g.status === 'scheduled')
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    return {
      desc: `${first.awayTeam?.name} vs ${first.homeTeam?.name}`,
      homeWins,
      awayWins,
      homeTeam: first.homeTeam?.name,
      awayTeam: first.awayTeam?.name,
      homeAbbr: first.homeTeam?.abbr,
      awayAbbr: first.awayTeam?.abbr,
      nextGame,
      games: seriesGames.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    };
  });
}