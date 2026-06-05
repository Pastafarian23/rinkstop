import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper: format NHL row to the RinkStop players shape so existing detail page works
function formatNhlStaff(p: any) {
  const name = p.full_name || `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  const [first, ...rest] = name.split(' ');
  const last = rest.join(' ');
  return {
    id: `nhl-${p.id}`,
    source: 'nhl',
    first_name: first || null,
    last_name: last || null,
    full_name: name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    position: p.position ?? null,
    position_abbreviation: p.position_abbreviation ?? null,
    jersey_number: p.jersey_number ?? null,
    nationality: p.nationality ?? null,
    birth_date: p.birth_date ?? null,
    height_cm: p.height ?? null,
    weight_kg: p.weight ?? null,
    shoots: p.shoots ?? null,
    headshot_url: p.logo ?? null,
    is_active: p.is_active ?? false,
    role: p.role ?? 'staff',
    was_player: p.was_player ?? false,
    current_team_id: p.current_team_id ?? null,
    current_team_abbreviation: p.current_team_abbreviation ?? null,
    current_team_name: p.current_team_name ?? null,
    current_team_logo: p.current_team_logo ?? null,
    league_name: p.league_name ?? null,
    teams: p.current_team_name ? {
      name: p.current_team_name,
      logo_url: p.current_team_logo,
      league_id: p.league_name || 'NHL',
      leagues: { name: p.league_name || 'NHL', slug: (p.league_name || 'nhl').toLowerCase() },
    } : null,
  };
}

// GET /api/staff/[role]?role=coach|scout|official|staff
// role=staff returns all non-player rows (catch-all)
// Other roles return rows where role = <role>
export async function GET(request: NextRequest, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const requested = (role || '').toLowerCase();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = (page - 1) * limit;

  let q = supabase
    .from('nhl_players')
    .select('*', { count: 'exact' });

  if (requested === 'staff') {
    // Catch-all: anything that's not a player
    q = q.neq('role', 'player');
  } else if (['coach', 'scout', 'official', 'executive'].includes(requested)) {
    q = q.eq('role', requested);
  } else {
    return NextResponse.json({ error: 'Invalid role. Use: coach, scout, official, executive, or staff.' }, { status: 400 });
  }

  const { data, error, count } = await q
    .order('full_name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: (data || []).map(formatNhlStaff),
    count: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
    role: requested,
  });
}
