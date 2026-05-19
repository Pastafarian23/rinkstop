import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const [{ count: teams }, { count: players }, { count: leagues }, { count: rinks }, { count: fixtures }] =
    await Promise.all([
      supabaseAdmin.from('teams').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('players').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('leagues').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('rinks').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('fixtures').select('id', { count: 'exact', head: true }),
    ]);

  return NextResponse.json({
    teams: teams ?? 0,
    players: players ?? 0,
    leagues: leagues ?? 0,
    rinks: rinks ?? 0,
    games: fixtures ?? 0,
  });
}