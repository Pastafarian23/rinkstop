import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

const GAMES_FILE = join(process.cwd(), 'data', 'ahl-playoff-games.json');

function readGames(): any {
  try {
    const raw = readFileSync(GAMES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { games: [], rounds: [] };
  }
}

export async function GET() {
  const data = readGames();
  const r = NextResponse.json(data);
  // Playoff data changes game-by-game; cache 30s on CDN
  r.headers.set('Cache-Control', 'public, max-age=15, s-maxage=30, stale-while-revalidate=120');
  return r;
}
