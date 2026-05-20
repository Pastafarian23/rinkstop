import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const GAMES_FILE = join(process.cwd(), 'data', 'playoff-games.json');

function readGames(): any {
  try {
    const raw = readFileSync(GAMES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { games: [], rounds: [] };
  }
}

export async function GET(request: NextRequest) {
  // Try Supabase first
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await supabase
      .from('playoff_updates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      const lastUpdate = data[0].created_at;
      const updates = await supabase
        .from('playoff_updates')
        .select('*')
        .order('created_at', { ascending: false });
      return NextResponse.json({ updates: updates.data || [] });
    }
  } catch {}

  // Fallback: return stored bracket data
  const gamesData = readGames();
  return NextResponse.json(gamesData);
}