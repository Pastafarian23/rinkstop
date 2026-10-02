// src/app/api/manage/team/[id]/programs/route.ts
//
// WS38 - Club Starter team-registration-management.
//
// Owner API for the team's programs list / create.
//
//   GET  /api/manage/team/[id]/programs
//     - All team_events for this team_workspaces row.
//   POST /api/manage/team/[id]/programs
//     - Create a new team_events row. Body matches the team_events schema.
//       Only whitelisted fields are accepted.
//
// Auth: caller must have an approved team claim on the parent workspace.
// The workspace id in [id] is team_workspaces.id (uuid); the claim's entity_id
// is the same uuid.

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EVENT_KINDS = new Set([
  'practice',
  'game',
  'tryout',
  'tournament',
  'camp',
  'meeting',
  'other',
]);
const STATUSES = new Set(['scheduled', 'cancelled', 'completed']);

const ALLOWED_FIELDS = new Set([
  'event_kind',
  'title',
  'description',
  'starts_at',
  'ends_at',
  'arrival_minutes',
  'cost_per_player',
  'currency',
  'rsvp_required',
  'rsvp_deadline',
  'max_attendees',
  'opposing_team',
  'location_note',
  'status',
  'rink_id',
  'is_off_ice',
  'timezone',
]);

function bad(msg: string, field?: string) {
  return NextResponse.json({ error: msg, field }, { status: 400 });
}

function validateField(field: string, value: unknown): string | null {
  if (value === null) return null;
  switch (field) {
    case 'title':
      return typeof value === 'string' && value.trim().length >= 1 && value.length <= 200 ? null : 'title must be 1-200 chars';
    case 'description':
      return typeof value === 'string' && value.length <= 4000 ? null : 'description too long';
    case 'event_kind':
      return typeof value === 'string' && EVENT_KINDS.has(value) ? null : `event_kind must be one of: ${[...EVENT_KINDS].join(', ')}`;
    case 'status':
      return typeof value === 'string' && STATUSES.has(value) ? null : `status must be one of: ${[...STATUSES].join(', ')}`;
    case 'starts_at':
    case 'ends_at':
    case 'rsvp_deadline':
      return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? null : 'must be ISO timestamp string';
    case 'arrival_minutes':
      return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 600 ? null : 'arrival_minutes must be 0-600';
    case 'cost_per_player':
      return typeof value === 'number' && value >= 0 ? null : 'cost_per_player must be non-negative';
    case 'currency':
      return typeof value === 'string' && /^[A-Z]{3}$/.test(value) ? null : 'currency must be 3-letter code';
    case 'rsvp_required':
      return typeof value === 'boolean' ? null : 'rsvp_required must be boolean';
    case 'max_attendees':
      return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 100000 ? null : 'max_attendees must be 1-100000';
    case 'opposing_team':
      return typeof value === 'string' && value.length <= 200 ? null : 'opposing_team too long';
    case 'location_note':
      return typeof value === 'string' && value.length <= 500 ? null : 'location_note too long';
    case 'rink_id':
      return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value) ? null : 'rink_id must be a uuid';
    case 'is_off_ice':
      return typeof value === 'boolean' ? null : 'is_off_ice must be boolean';
    case 'timezone':
      return typeof value === 'string' && value.length <= 60 ? null : 'timezone too long';
  }
  return `unknown field: ${field}`;
}

async function authorize(userId: string, workspaceId: string) {
  const { count } = await supabaseAdmin
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('claim_type', 'team')
    .eq('entity_id', workspaceId)
    .eq('status', 'approved');
  if (!count) return { ok: false as const, status: 403, error: 'forbidden' };

  // Confirm workspace exists. Cheap; prevents leaking existence info.
  const { data: ws } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, currency')
    .eq('id', workspaceId)
    .maybeSingle();
  if (!ws) return { ok: false as const, status: 404, error: 'team_not_found' };

  return { ok: true as const, workspace: ws };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  const authz = await authorize(userId, id);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status });

  const { data, error } = await supabaseAdmin
    .from('team_events')
    .select('id, team_id, event_kind, title, starts_at, ends_at, status, rsvp_required, rsvp_deadline, max_attendees, cost_per_player, currency, rink_id, opposing_team, is_off_ice, location_note, created_at, updated_at')
    .eq('team_id', id)
    .order('starts_at', { ascending: false });

  if (error) {
    console.error('[team-programs GET] failed', error);
    return NextResponse.json({ error: 'load_failed', message: error.message }, { status: 500 });
  }

  // Count RSVPs per program. We do a single grouped query — much cheaper than
  // a per-row count subquery.
  const programIds = (data || []).map((r) => (r as { id: string }).id);
  let rsvpCounts: Record<string, number> = {};
  if (programIds.length > 0) {
    const { data: rsvpRows } = await supabaseAdmin
      .from('team_rsvps')
      .select('event_id, response')
      .in('event_id', programIds)
      .eq('response', 'yes');
    for (const row of rsvpRows || []) {
      const k = (row as { event_id: string }).event_id;
      rsvpCounts[k] = (rsvpCounts[k] || 0) + 1;
    }
  }

  return NextResponse.json({
    programs: data || [],
    rsvp_counts: rsvpCounts,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  const authz = await authorize(userId, id);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad('invalid_json');
  }

  // Required: title, starts_at, ends_at
  if (typeof body.title !== 'string' || body.title.trim().length === 0) {
    return bad('title_required', 'title');
  }
  if (typeof body.starts_at !== 'string' || Number.isNaN(Date.parse(body.starts_at))) {
    return bad('starts_at_required', 'starts_at');
  }
  if (typeof body.ends_at !== 'string' || Number.isNaN(Date.parse(body.ends_at))) {
    return bad('ends_at_required', 'ends_at');
  }
  if (Date.parse(body.ends_at as string) <= Date.parse(body.starts_at as string)) {
    return bad('ends_at_must_be_after_starts_at', 'ends_at');
  }

  const insert: Record<string, unknown> = {
    team_id: id,
    created_by: userId,
    title: body.title,
    starts_at: body.starts_at,
    ends_at: body.ends_at,
  };

  for (const [field, value] of Object.entries(body)) {
    if (field === 'title' || field === 'starts_at' || field === 'ends_at') {
      insert[field] = value;
      continue;
    }
    if (!ALLOWED_FIELDS.has(field)) return bad('field_not_allowed', field);
    const err = validateField(field, value);
    if (err) return bad(err, field);
    insert[field] = value;
  }

  // Sensible defaults (mirror the legacy EventForm default values).
  if (!('event_kind' in insert)) insert.event_kind = 'practice';
  if (!('arrival_minutes' in insert)) insert.arrival_minutes = 30;
  if (!('currency' in insert)) insert.currency = authz.workspace.currency || 'PHP';
  if (!('rsvp_required' in insert)) insert.rsvp_required = true;
  if (!('status' in insert)) insert.status = 'scheduled';
  if (!('is_off_ice' in insert)) insert.is_off_ice = false;

  const { data, error } = await supabaseAdmin
    .from('team_events')
    .insert(insert)
    .select('id')
    .single();

  if (error) {
    console.error('[team-programs POST] failed', error);
    return NextResponse.json({ error: 'create_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data?.id }, { status: 201 });
}