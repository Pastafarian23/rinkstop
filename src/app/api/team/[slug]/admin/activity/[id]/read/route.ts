import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdminRole } from '@/lib/team';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ slug: string; id: string }>;
}

/**
 * POST /api/team/[slug]/admin/activity/[id]/read
 *
 * Marks a single team_notifications row as read for the calling user.
 * Bypasses RLS by using the service role + an explicit ownership check
 * (must be the row's user_id) so a user can never mark someone else's
 * notification as read.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { slug, id } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();
  if (!id) return NextResponse.json({ error: 'bad_id' }, { status: 400 });

  // Team + admin gate (cheap — same shape as every other admin endpoint)
  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id')
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

  // Mark read — guard with user_id = auth user so we only ever update the
  // caller's own row. read_at = now().
  const { error } = await supabaseAdmin
    .from('team_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    console.warn('[admin/activity/read] update failed:', error.message);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
