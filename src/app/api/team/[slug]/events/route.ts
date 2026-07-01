import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hasTeamAdminAccess, tierGateResponse } from '@/lib/tier-gate';

export const dynamic = 'force-dynamic';

/**
 * GET /api/team/[slug]/events
 *
 * Piece G1b — list all events for a team.
 *
 * Auth + gate checks (in order):
 *   1. Authenticated (Clerk) → 401 if not
 *   2. Team exists + is_active → 404 if not
 *   3. User is on the team's roster (team_members) → 403 if not
 *   4. (GET only) No tier gate — any team member can read events
 *
 * Returns: { events: [...], gate: { tier, reason } }
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse(JSON.stringify({ error: 'unauthenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();
  if (!normalizedSlug) {
    return new NextResponse(JSON.stringify({ error: 'invalid_slug' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: team, error: teamErr } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, name, is_active, currency')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (teamErr || !team) {
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

  // GET does NOT require paid tier — any team member can view events.
  // We still load the gate result for the UI to optionally render upgrade prompts.
  const gate = await hasTeamAdminAccess(userId);

  // Fetch events ordered by start time, descending (upcoming first)
  const { data: events, error: evErr } = await supabaseAdmin
    .from('team_events')
    .select(`
      id, team_id, rink_id, event_kind, title, description,
      starts_at, ends_at, arrival_minutes, cost_per_player, currency,
      rsvp_required, rsvp_deadline, max_attendees, opposing_team,
      location_note, status, created_by, created_at, updated_at,
      is_off_ice, practice_plan_id
    `)
    .eq('team_id', team.id)
    .order('starts_at', { ascending: false })
    .limit(500);

  if (evErr) {
    return new NextResponse(JSON.stringify({ error: 'fetch_failed', detail: evErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return NextResponse.json({
    events: events ?? [],
    gate: { tier: gate.tier, reason: gate.reason, allowed: gate.allowed },
    team: { id: team.id, slug: team.slug, name: team.name, currency: team.currency },
  });
}

/**
 * POST /api/team/[slug]/events
 *
 * Create a new event. Tier-gated (paid tier required).
 *
 * Body shape:
 * {
 *   event_kind: 'practice' | 'game' | 'tournament' | 'tryout' | 'meeting' | 'team_event',
 *   title: string,
 *   description?: string,
 *   starts_at: ISO string,
 *   ends_at: ISO string,
 *   arrival_minutes?: number,
 *   rink_id?: string,
 *   opposing_team?: string,
 *   location_note?: string,
 *   is_off_ice?: boolean,
 *   practice_plan_id?: string | null,
 *   rsvp_required?: boolean,
 *   rsvp_deadline?: ISO string | null,
 *   max_attendees?: number | null,
 *   cost_per_player?: number | null,
 *   status?: 'scheduled' | 'cancelled' | 'completed'
 * }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse(JSON.stringify({ error: 'unauthenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();
  if (!normalizedSlug) {
    return new NextResponse(JSON.stringify({ error: 'invalid_slug' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Look up team
  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, name, currency, timezone, home_rink_id')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) {
    return new NextResponse(JSON.stringify({ error: 'team_not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Membership check
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

  // Parse and validate body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const requiredFields = ['event_kind', 'title', 'starts_at', 'ends_at'];
  for (const f of requiredFields) {
    if (!body[f]) {
      return new NextResponse(JSON.stringify({ error: 'missing_field', field: f }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const allowedKinds = ['practice', 'game', 'tournament', 'tryout', 'meeting', 'team_event'];
  if (!allowedKinds.includes(body.event_kind)) {
    return new NextResponse(JSON.stringify({ error: 'invalid_event_kind' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Time order check
  const startsAt = new Date(body.starts_at);
  const endsAt = new Date(body.ends_at);
  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
    return new NextResponse(JSON.stringify({ error: 'invalid_datetime' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (endsAt <= startsAt) {
    return new NextResponse(JSON.stringify({ error: 'ends_before_starts' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Optional rink reference — only include if provided
  const rinkId = body.rink_id && typeof body.rink_id === 'string' ? body.rink_id : null;

  // Resolve timezone — team.timezone is authoritative.
  // Fallback chain: client-provided timezone (if valid) -> team.timezone -> rink.timezone -> UTC
  let resolvedTimezone = team.timezone;
  if (!resolvedTimezone && rinkId) {
    const { data: rinkRow } = await supabaseAdmin
      .from('rinks')
      .select('timezone')
      .eq('id', rinkId)
      .maybeSingle();
    resolvedTimezone = rinkRow?.timezone || null;
  }
  if (!resolvedTimezone) {
    resolvedTimezone = body.timezone && typeof body.timezone === 'string' ? body.timezone : 'UTC';
  }
  // If client provided a timezone, validate it matches (warn but don't reject for now)
  const clientTimezone = body.timezone && typeof body.timezone === 'string' ? body.timezone : null;
  if (clientTimezone && clientTimezone !== resolvedTimezone) {
    console.warn(`[events] client timezone ${clientTimezone} differs from team timezone ${resolvedTimezone}; using team timezone`);
  }

  const insert = {
    team_id: team.id,
    event_kind: body.event_kind,
    title: String(body.title).slice(0, 200),
    description: body.description ? String(body.description).slice(0, 2000) : null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    arrival_minutes: Number.isFinite(Number(body.arrival_minutes)) ? Number(body.arrival_minutes) : 30,
    cost_per_player: Number.isFinite(Number(body.cost_per_player)) ? Number(body.cost_per_player) : null,
    currency: body.currency || team.currency || 'USD',
    rsvp_required: body.rsvp_required === false ? false : true,
    rsvp_deadline: body.rsvp_deadline ? new Date(body.rsvp_deadline).toISOString() : null,
    max_attendees: Number.isFinite(Number(body.max_attendees)) ? Number(body.max_attendees) : null,
    opposing_team: body.opposing_team ? String(body.opposing_team).slice(0, 200) : null,
    location_note: body.location_note ? String(body.location_note).slice(0, 500) : null,
    status: ['scheduled', 'cancelled', 'completed'].includes(body.status) ? body.status : 'scheduled',
    created_by: userId,
    is_off_ice: body.is_off_ice === true,
    practice_plan_id: body.practice_plan_id || null,
    timezone: resolvedTimezone,
    ...(rinkId ? { rink_id: rinkId } : {}),
  };

  const { data: created, error: insErr } = await supabaseAdmin
    .from('team_events')
    .insert(insert)
    .select('id')
    .single();

  if (insErr || !created) {
    return new NextResponse(JSON.stringify({ error: 'insert_failed', detail: insErr?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return NextResponse.json({ id: created.id, event: { ...insert, id: created.id } }, { status: 201 });
}