// src/app/api/manage/team/[id]/programs/[programId]/route.ts
//
// WS38 - Club Starter team-registration-management.
//
// Owner API for a single team program row.
//
//   GET    /api/manage/team/[id]/programs/[programId]
//   PATCH  /api/manage/team/[id]/programs/[programId]
//   DELETE /api/manage/team/[id]/programs/[programId]
//
// Field allowlist mirrors the rink/team management API to prevent mass-assign
// holes — only whitelisted fields are accepted on PATCH.

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

async function authorize(userId: string, workspaceId: string, programId: string) {
  const { count } = await supabaseAdmin
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('claim_type', 'team')
    .eq('entity_id', workspaceId)
    .eq('status', 'approved');
  if (!count) return { ok: false as const, status: 403, error: 'forbidden' };

  const { data: program } = await supabaseAdmin
    .from('team_events')
    .select('id, team_id')
    .eq('id', programId)
    .eq('team_id', workspaceId)
    .maybeSingle();
  if (!program) return { ok: false as const, status: 404, error: 'program_not_found' };

  return { ok: true as const, program };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string }> },
) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id, programId } = await params;

  const authz = await authorize(userId, id, programId);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status });

  const { data, error } = await supabaseAdmin
    .from('team_events')
    .select('*')
    .eq('id', programId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'not_found', message: error?.message }, { status: 404 });
  }
  return NextResponse.json({ program: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string }> },
) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id, programId } = await params;

  const authz = await authorize(userId, id, programId);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad('invalid_json');
  }

  const update: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(body)) {
    if (!ALLOWED_FIELDS.has(field)) return bad('field_not_allowed', field);
    const err = validateField(field, value);
    if (err) return bad(err, field);
    update[field] = value;
  }
  if (Object.keys(update).length === 0) return bad('no_fields_to_update');
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('team_events')
    .update(update)
    .eq('id', programId)
    .eq('team_id', id)
    .select('*')
    .single();

  if (error) {
    console.error('[team-program PATCH] failed', error);
    return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ program: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string }> },
) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id, programId } = await params;

  const authz = await authorize(userId, id, programId);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status });

  // Delete cascades RSVPs via ON DELETE CASCADE if the FK has it; otherwise
  // we leave them and the operator can clean up separately. We don't try
  // to be clever here.
  const { error } = await supabaseAdmin
    .from('team_events')
    .delete()
    .eq('id', programId)
    .eq('team_id', id);

  if (error) {
    console.error('[team-program DELETE] failed', error);
    return NextResponse.json({ error: 'delete_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}