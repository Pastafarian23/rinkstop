import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/teams/[id]
 * Single team with league, claims count, recent fixtures.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;
  const { id } = await params;

  const { data: team, error } = await supabaseAdmin
    .from('team_workspaces')
    .select('*, leagues!teams_league_id_fkey(id, name, slug)')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!team) {
    return NextResponse.json({ error: 'team_not_found' }, { status: 404 });
  }

  // Claims count
  const { count: claimsCount } = await supabaseAdmin
    .from('team_claims')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', id)
    .eq('status', 'approved');

  // Recent fixtures
  const { data: fixtures } = await supabaseAdmin
    .from('fixtures')
    .select('id, game_date, status, home_team_id, away_team_id, home_score, away_score, league_id')
    .or(`home_team_id.eq.${id},away_team_id.eq.${id}`)
    .order('game_date', { ascending: false })
    .limit(10);

  return NextResponse.json({ team, claimsCount: claimsCount || 0, fixtures: fixtures || [] });
}

/**
 * PATCH /api/admin/teams/[id]
 * Update team metadata. league_id change is super_admin only (data integrity).
 * Body: { name?, city?, country?, league_id? }
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;
  const admin = auth.admin;
  const { id } = await params;

  let body: { name?: string; city?: string; country?: string; league_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (typeof body.name === 'string') updates.name = body.name.trim();
  if (typeof body.city === 'string') updates.city = body.city.trim() || null;
  if (typeof body.country === 'string') updates.country = body.country.trim() || null;
  if (typeof body.league_id === 'string') {
    if (!admin.isSuperAdmin) {
      return NextResponse.json(
        { error: 'super_admin_required', message: 'Only super admins can change a team\u2019s league assignment.' },
        { status: 403 }
      );
    }
    if (body.league_id === '') {
      updates.league_id = null;
    } else {
      // Verify league exists
      const { data: league } = await supabaseAdmin
        .from('leagues')
        .select('id')
        .eq('id', body.league_id)
        .maybeSingle();
      if (!league) {
        return NextResponse.json({ error: 'league_not_found' }, { status: 400 });
      }
      updates.league_id = body.league_id;
    }
  }

  const { data, error } = await supabaseAdmin
    .from('team_workspaces')
    .update(updates)
    .eq('id', id)
    .select('*, leagues!teams_league_id_fkey(id, name, slug)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ team: data });
}
