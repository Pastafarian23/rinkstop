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
  const status = searchParams.get('status'); // 'completed' | 'scheduled' | 'all'
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const data = readGames();
  let games = data.games || [];

  // Filter by status
  if (status === 'completed') {
    games = games.filter((g: any) => g.status === 'completed');
  } else if (status === 'scheduled') {
    games = games.filter((g: any) => g.status === 'scheduled' || g.status === 'inProgress');
  }

  // Sort: most recent first for completed; soonest first for upcoming
  const completed = games
    .filter((g: any) => g.status === 'completed')
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);

  const upcoming = games
    .filter((g: any) => g.status === 'scheduled' || g.status === 'inProgress')
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, limit);

  const response = NextResponse.json({
    completed,
    upcoming,
    all: games.slice(0, limit),
    total: games.length,
    lastUpdated: new Date().toISOString(),
  });

  response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  return response;
}