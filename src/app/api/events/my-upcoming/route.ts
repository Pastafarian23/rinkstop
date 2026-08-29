import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/events/my-upcoming
 * Returns upcoming events for teams the authenticated user is a member of.
 * Used by the FAB RSVP action to let users RSVP to their team's events.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  // Get teams the user is a member of
  const { data: memberships, error: memErr } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId);

  if (memErr) {
    return NextResponse.json({ error: memErr.message }, { status: 500 });
  }

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const teamIds = memberships.map((m: { team_id: string }) => m.team_id);

  // Get upcoming events for those teams
  const { data: events, error: evErr } = await supabaseAdmin
    .from('team_events')
    .select(`
      id,
      title,
      starts_at,
      event_kind,
      team_id,
      team_workspaces!inner(name)
    `)
    .in('team_id', teamIds)
    .eq('status', 'scheduled')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(limit);

  if (evErr) {
    return NextResponse.json({ error: evErr.message }, { status: 500 });
  }

  const formatted = (events ?? []).map((e: any) => ({
    id: e.id,
    title: e.title,
    event_date: e.starts_at,
    event_type: e.event_kind,
    team_id: e.team_id,
    team_name: (e.team_workspaces as any)?.name ?? 'Team',
  }));

  return NextResponse.json({ data: formatted });
}
