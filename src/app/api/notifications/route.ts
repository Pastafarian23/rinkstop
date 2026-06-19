import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface NotificationRow {
  id: string;
  user_id: string;
  team_id: string;
  actor_user_id: string | null;
  kind: 'news' | 'result' | 'schedule' | 'announcement';
  entity_id: string | null;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('team_notifications')
    .select('id, user_id, team_id, actor_user_id, kind, entity_id, title, body, payload, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<NotificationRow[]>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also fetch team names + actor names so the UI can show context
  const teamIds = Array.from(new Set((data || []).map((n) => n.team_id)));
  const actorIds = Array.from(new Set((data || []).map((n) => n.actor_user_id).filter((id): id is string => !!id)));

  const [teamsRes, actorsRes] = await Promise.all([
    teamIds.length
      ? supabaseAdmin.from('team_workspaces').select('id, slug, name').in('id', teamIds).returns<{ id: string; slug: string; name: string }[]>()
      : Promise.resolve({ data: [] as { id: string; slug: string; name: string }[] }),
    actorIds.length
      ? supabaseAdmin.from('profiles').select('user_id, display_name, username').in('user_id', actorIds).returns<{ user_id: string; display_name: string | null; username: string | null }[]>()
      : Promise.resolve({ data: [] as { user_id: string; display_name: string | null; username: string | null }[] }),
  ]);

  const teamsById = Object.fromEntries((teamsRes.data || []).map((t) => [t.id, t]));
  const actorsById = Object.fromEntries((actorsRes.data || []).map((a) => [a.user_id, a]));

  const enriched = (data || []).map((n) => ({
    ...n,
    team: teamsById[n.team_id] || null,
    actor: n.actor_user_id ? actorsById[n.actor_user_id] || null : null,
  }));

  const unread = enriched.filter((n) => !n.read_at).length;
  return NextResponse.json({ notifications: enriched, unread });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ids: string[] | undefined = Array.isArray(body.ids) ? body.ids : undefined;
  const markAllRead = body.mark_all_read === true;

  let query = supabaseAdmin
    .from('team_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);

  if (markAllRead) {
    // already filtered to user_id + is read_at null
  } else if (ids && ids.length > 0) {
    query = query.in('id', ids);
  } else {
    return NextResponse.json({ error: 'ids_or_mark_all_read_required' }, { status: 400 });
  }

  const { error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, updated: count });
}