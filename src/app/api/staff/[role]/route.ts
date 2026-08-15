import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

// Helper: format community coach from team_members
function formatCommunityCoach(m: any, teamName: string | null, teamShortName: string | null, teamLogo: string | null) {
  const displayName = m.profiles?.display_name || 'Unknown';
  const [first, ...rest] = displayName.split(' ');
  const last = rest.join(' ');
  return {
    id: `team-${m.id}`,
    source: 'community',
    first_name: first || null,
    last_name: last || null,
    full_name: displayName,
    slug: (m.profiles?.username || displayName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    position: null,
    position_abbreviation: null,
    jersey_number: null,
    nationality: null,
    birth_date: null,
    height_cm: null,
    weight_kg: null,
    shoots: null,
    headshot_url: m.profiles?.avatar_url || null,
    is_active: !m.left_at,
    role: 'coach',
    was_player: false,
    current_team_id: m.team_id,
    current_team_abbreviation: teamShortName,
    current_team_name: teamName,
    current_team_logo: teamLogo,
    league_name: null,
    teams: teamName ? {
      name: teamName,
      logo_url: teamLogo,
      league_id: null,
      leagues: null,
    } : null,
  };
}

// Coach-related roles in team_members
const COACH_ROLES = [
  'head_coach', 'assistant_coach', 'goalie_coach', 'skills_coach', 'manager'
];

// GET /api/staff/[role]?role=coach|scout|official|staff
// role=staff returns all non-player rows (catch-all)
// Other roles return rows where role = <role>
// For coaches, also includes community coaches from team_members
// across all levels (pro, adult, youth).
export async function GET(request: NextRequest, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const requested = (role || '').toLowerCase();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = (page - 1) * limit;

  if (requested === 'staff') {
    // Catch-all: anything that's not a player
    const { data, error, count } = await supabaseAdmin
      .from('nhl_players')
      .select('*', { count: 'exact' })
      .neq('role', 'player')
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

  if (['coach', 'scout', 'official', 'executive'].includes(requested)) {
    // 1) NHL staff
    const { data: nhlData, error: nhlError, count: nhlCount } = await supabaseAdmin
      .from('nhl_players')
      .select('*', { count: 'exact' })
      .eq('role', requested)
      .order('full_name', { ascending: true });

    if (nhlError) return NextResponse.json({ error: nhlError.message }, { status: 500 });

    const results: any[] = (nhlData || []).map(formatNhlStaff);

    // 2) Community coaches from team_members (all levels)
    if (requested === 'coach') {
      const { data: members, error: membersError } = await supabaseAdmin
        .from('team_members')
        .select('id, role, team_id, user_id, left_at, profiles!team_members_user_id_fkey(display_name, username, avatar_url), team_workspaces!inner(name, short_name, avatar_url)')
        .in('role', COACH_ROLES)
        .is('left_at', null);

      if (!membersError && members) {
        const community = members.map(m => {
          const tw = m.team_workspaces;
          return formatCommunityCoach(
            m,
            tw?.name || null,
            tw?.short_name || null,
            tw?.avatar_url || null
          );
        });
        results.push(...community);
      }
    }

    // Sort combined results by full_name
    results.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

    // Paginate combined results
    const total = results.length;
    const paginated = results.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginated,
      count: total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      role: requested,
    });
  }

  return NextResponse.json({ error: 'Invalid role. Use: coach, scout, official, executive, or staff.' }, { status: 400 });
}
