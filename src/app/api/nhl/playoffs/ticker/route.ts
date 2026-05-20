import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

const GAMES_FILE = join(process.cwd(), 'data', 'playoff-games.json');

function readGames(): any {
  try {
    const raw = readFileSync(GAMES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { games: [] };
  }
}

export async function GET() {
  try {
    const data = readGames();
    const games: any[] = data.games || [];

    const sorted = [...games].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Most recent completed first
    const recent = sorted.filter(g => g.status === 'completed').slice(0, 6);
    // Next upcoming games — oldest first (soonest games)
    const upcoming = sorted
      .filter(g => g.status === 'scheduled' || g.status === 'inProgress')
      .slice(0, 4)
      .reverse();

    const tickerItems: any[] = [];

    tickerItems.push({
      type: 'label',
      text: 'Stanley Cup Playoffs',
    });

    for (const g of upcoming) {
      const home = g.homeTeam;
      const away = g.awayTeam;
      tickerItems.push({
        type: 'upcoming',
        awayAbbr: away.abbr,
        awayName: away.name,
        homeAbbr: home.abbr,
        homeName: home.name,
        date: g.date,
        round: g.round,
        seriesLabel: g.seriesLabel,
        tvNetwork: g.tvNetwork || null,
      });
    }

    for (const g of recent) {
      const home = g.homeTeam;
      const away = g.awayTeam;
      const homeWin = home.winner;
      tickerItems.push({
        type: 'final',
        awayAbbr: away.abbr,
        awayName: away.name,
        awayScore: homeWin ? away.score : home.score,
        homeAbbr: home.abbr,
        homeName: home.name,
        homeScore: homeWin ? home.score : away.score,
        round: g.round,
        seriesLabel: g.seriesLabel,
        periodDisplay: g.periodDisplay || null,
      });
    }

    const allItems = [...tickerItems, ...tickerItems];
    return NextResponse.json(allItems);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}