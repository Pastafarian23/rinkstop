import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdminRole } from '@/lib/team';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/team/[slug]/admin/activity
 *
 * Returns the last 30 days of team_notifications for admins on this team.
 * Used by the admins-hub activity feed to auto-refresh every 60s.
 *
 * RLS note: team_notifications has user_id-based RLS — a user can only SELECT
 * their own notifications. We use supabaseAdmin (service role) to bypass RLS
 * for the team-wide feed, but we still gate on the requester being an admin
 * on the team before returning anything.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (!team) return NextResponse.json({ error: 'team_not_found' }, { status: 404 });

  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();

  if (!membership || !isAdminRole(membership.role)) {
    return NextResponse.json({ error: 'not_admin' }, { status: 403 });
  }

  // Pull the list of admin user_ids on this team (so we only return
  // notifications that landed in the team-internal admin inbox — not the
  // public-facing broadcast feed that goes to all members).
  const { data: adminRows } = await supabaseAdmin
    .from('team_members')
    .select('user_id, role')
    .eq('team_id', team.id)
    .is('left_at', null)
    .in(
      'role',
      [
        'head_coach',
        'assistant_coach',
        'goalie_coach',
        'skills_coach',
        'manager',
        'team_staff',
        'president',
        'vice_president',
        'secretary',
        'treasurer',
        'board_member',
        'safety_officer',
      ]
    );

  const adminIds = (adminRows || []).map((r: any) => r.user_id);
  if (adminIds.length === 0) {
    return NextResponse.json({ activity: [] });
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: activity, error } = await supabaseAdmin
    .from('team_notifications')
    .select('id, user_id, actor_user_id, kind, title, body, payload, created_at, read_at')
    .eq('team_id', team.id)
    .in('user_id', adminIds)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(40);

  if (error) {
    console.warn('[admin/activity] select failed:', error.message);
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }

  return NextResponse.json({ activity: activity || [] });
}
