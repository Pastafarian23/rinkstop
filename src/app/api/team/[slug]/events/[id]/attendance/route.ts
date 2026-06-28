import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hasTeamAdminAccess, tierGateResponse } from '@/lib/tier-gate';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/team/[slug]/events/[id]/attendance
 *
 * Mark attendance for a player on an event. Tier-gated for admin roles only.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse(JSON.stringify({ error: 'unauthenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { slug, id } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();
  if (!normalizedSlug || !id) {
    return new NextResponse(JSON.stringify({ error: 'invalid_params' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) {
    return new NextResponse(JSON.stringify({ error: 'team_not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: myMembership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  if (!myMembership) {
    return new NextResponse(JSON.stringify({ error: 'not_a_member' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const gate = await hasTeamAdminAccess(userId);
  if (!gate.allowed) {
    return tierGateResponse(gate);
  }

  const adminRoles = ['head_coach', 'assistant_coach', 'manager', 'president', 'vice_president'];
  if (!adminRoles.includes(myMembership.role)) {
    return new NextResponse(JSON.stringify({ error: 'forbidden_not_admin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { playerId, attendanceStatus, attendanceNote } = body;
  if (!playerId || !attendanceStatus) {
    return new NextResponse(JSON.stringify({ error: 'missing_params' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const validStatuses = ['present', 'absent', 'late', 'excused'];
  if (!validStatuses.includes(attendanceStatus)) {
    return new NextResponse(JSON.stringify({ error: 'invalid_status' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if RSVP exists for this player + event
  const { data: rsvp } = await supabaseAdmin
    .from('team_rsvps')
    .select('id')
    .eq('event_id', id)
    .eq('user_id', playerId)
    .maybeSingle();

  const now = new Date().toISOString();

  if (rsvp) {
    const { error: updErr } = await supabaseAdmin
      .from('team_rsvps')
      .update({
        attendance_status: attendanceStatus,
        attendance_note: attendanceNote ?? null,
        attendance_at: now,
        marked_by: userId,
      })
      .eq('id', rsvp.id);

    if (updErr) {
      return new NextResponse(JSON.stringify({ error: 'update_failed', detail: updErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } else {
    const { error: insErr } = await supabaseAdmin
      .from('team_rsvps')
      .insert({
        event_id: id,
        user_id: playerId,
        response: 'yes',
        attendance_status: attendanceStatus,
        attendance_note: attendanceNote ?? null,
        attendance_at: now,
        marked_by: userId,
      });

    if (insErr) {
      return new NextResponse(JSON.stringify({ error: 'insert_failed', detail: insErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return NextResponse.json({ ok: true, playerId, attendanceStatus });
}