import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [teams, leagues, rinks, brands, players] = await Promise.all([
      supabase.from('teams').select('id', { count: 'exact', head: true }),
      supabase.from('leagues').select('id', { count: 'exact', head: true }),
      supabase.from('rinks').select('id', { count: 'exact', head: true }),
      supabase.from('brands').select('id', { count: 'exact', head: true }),
      supabase.from('players').select('id', { count: 'exact', head: true }),
    ]);

    return NextResponse.json({
      teams: teams.count ?? 0,
      leagues: leagues.count ?? 0,
      rinks: rinks.count ?? 0,
      brands: brands.count ?? 0,
      players: players.count ?? 0,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}