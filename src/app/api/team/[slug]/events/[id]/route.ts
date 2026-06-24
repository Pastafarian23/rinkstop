import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hasTeamAdminAccess, tierGateResponse } from '@/lib/tier-gate';

export const dynamic = 'force-dynamic';

/**
 * GET /api/team/[slug]/events/[id]
 *
 * Single event detail. Auth + membership required (no tier gate).
 */
export async function GET(
  _req: Request,
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
    .select('id, slug, name, currency')
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

  const { data: event, error } = await supabaseAdmin
    .from('team_events')
    .select('*')
    .eq('id', id)
    .eq('team_id', team.id)
    .maybeSingle();

  if (error || !event) {
    return new NextResponse(JSON.stringify({ error: 'event_not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // RSVP count for this event
  const { count: rsvpCount } = await supabaseAdmin
    .from('team_rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', id)
    .eq('response', 'yes');

  return NextResponse.json({ event, rsvp_count: rsvpCount ?? 0 });
}

/**
 * PATCH /api/team/[slug]/events/[id]
 *
 * Update an event. Tier-gated.
 * Only the creator OR a coach/manager/president role can edit.
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
    .select('id, slug, name, currency')
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

  // Tier gate
  const gate = await hasTeamAdminAccess(userId);
  if (!gate.allowed) {
    return tierGateResponse(gate);
  }

  // Fetch the existing event to check author + role
  const { data: existing } = await supabaseAdmin
    .from('team_events')
    .select('id, team_id, created_by')
    .eq('id', id)
    .eq('team_id', team.id)
    .maybeSingle();
  if (!existing) {
    return new NextResponse(JSON.stringify({ error: 'event_not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const adminRoles = ['head_coach', 'assistant_coach', 'manager', 'president', 'vice_president'];
  const isAuthor = existing.created_by === userId;
  const isAdmin = adminRoles.includes(myMembership.role);
  if (!isAuthor && !isAdmin) {
    return new NextResponse(JSON.stringify({ error: 'forbidden_not_author_or_admin' }), {
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

  const update: Record<string, unknown> = {};
  const stringFields = ['title', 'description', 'opposing_team', 'location_note'];
  for (const f of stringFields) {
    if (body[f] !== undefined) update[f] = String(body[f]).slice(0, f === 'description' ? 2000 : f === 'location_note' ? 500 : 200);
  }
  if (body.event_kind !== undefined) {
    const allowedKinds = ['practice', 'game', 'tournament', 'tryout', 'meeting', 'team_event'];
    if (!allowedKinds.includes(body.event_kind)) {
      return new NextResponse(JSON.stringify({ error: 'invalid_event_kind' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    update.event_kind = body.event_kind;
  }
  if (body.starts_at !== undefined) update.starts_at = new Date(body.starts_at).toISOString();
  if (body.ends_at !== undefined) update.ends_at = new Date(body.ends_at).toISOString();
  if (body.arrival_minutes !== undefined) update.arrival_minutes = Number(body.arrival_minutes);
  if (body.cost_per_player !== undefined) update.cost_per_player = Number.isFinite(Number(body.cost_per_player)) ? Number(body.cost_per_player) : null;
  if (body.currency !== undefined) update.currency = String(body.currency);
  if (body.rsvp_required !== undefined) update.rsvp_required = body.rsvp_required === true;
  if (body.rsvp_deadline !== undefined) update.rsvp_deadline = body.rsvp_deadline ? new Date(body.rsvp_deadline).toISOString() : null;
  if (body.max_attendees !== undefined) update.max_attendees = Number.isFinite(Number(body.max_attendees)) ? Number(body.max_attendees) : null;
  if (body.status !== undefined) {
    if (!['scheduled', 'cancelled', 'completed'].includes(body.status)) {
      return new NextResponse(JSON.stringify({ error: 'invalid_status' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    update.status = body.status;
  }
  if (body.is_off_ice !== undefined) update.is_off_ice = body.is_off_ice === true;
  if (body.practice_plan_id !== undefined) update.practice_plan_id = body.practice_plan_id || null;
  if (body.rink_id !== undefined) update.rink_id = body.rink_id || null;

  // Time order check if both times are being updated or one is updated alongside the other
  if (update.starts_at || update.ends_at) {
    const startVal = update.starts_at ?? (await supabaseAdmin.from('team_events').select('starts_at').eq('id', id).maybeSingle()).data?.starts_at;
    const endVal = update.ends_at ?? (await supabaseAdmin.from('team_events').select('ends_at').eq('id', id).maybeSingle()).data?.ends_at;
    if (startVal && endVal && new Date(endVal) <= new Date(startVal)) {
      return new NextResponse(JSON.stringify({ error: 'ends_before_starts' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (Object.keys(update).length === 0) {
    return new NextResponse(JSON.stringify({ error: 'no_fields_to_update' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error: updErr } = await supabaseAdmin
    .from('team_events')
    .update(update)
    .eq('id', id);

  if (updErr) {
    return new NextResponse(JSON.stringify({ error: 'update_failed', detail: updErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return NextResponse.json({ ok: true, updated: Object.keys(update) });
}

/**
 * DELETE /api/team/[slug]/events/[id]
 *
 * Delete an event. Tier-gated.
 * Only the creator OR a coach/manager/president role can delete.
 */
export async function DELETE(
  _req: Request,
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
    .select('id, slug, name')
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

  const { data: existing } = await supabaseAdmin
    .from('team_events')
    .select('id, team_id, created_by')
    .eq('id', id)
    .eq('team_id', team.id)
    .maybeSingle();
  if (!existing) {
    return new NextResponse(JSON.stringify({ error: 'event_not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const adminRoles = ['head_coach', 'assistant_coach', 'manager', 'president', 'vice_president'];
  const isAuthor = existing.created_by === userId;
  const isAdmin = adminRoles.includes(myMembership.role);
  if (!isAuthor && !isAdmin) {
    return new NextResponse(JSON.stringify({ error: 'forbidden_not_author_or_admin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error: delErr } = await supabaseAdmin
    .from('team_events')
    .delete()
    .eq('id', id);

  if (delErr) {
    return new NextResponse(JSON.stringify({ error: 'delete_failed', detail: delErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return NextResponse.json({ ok: true, deleted_id: id });
}