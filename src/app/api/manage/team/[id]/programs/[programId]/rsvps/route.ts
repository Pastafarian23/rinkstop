// src/app/api/manage/team/[id]/programs/[programId]/rsvps/route.ts
//
// WS38 - Organization Plus team-registration-management.
//
// Owner API for a program's RSVPs.
//
//   GET   /api/manage/team/[id]/programs/[programId]/rsvps
//     - List RSVPs (with optional response= filter)
//   PATCH /api/manage/team/[id]/programs/[programId]/rsvps
//     - Bulk update. body: { rsvp_ids: string[], response:
//       'yes' | 'no' | 'maybe' | 'pending', note?: string }
//     - All ids must belong to this program.
//
// Auth: caller must have an approved team claim on the parent workspace
// AND the program must belong to that workspace.

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RESPONSES = new Set(['yes', 'no', 'maybe']);

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

  const url = new URL(_req.url);
  const responseFilter = url.searchParams.get('response');

  let q = supabaseAdmin
    .from('team_rsvps')
    .select('id, event_id, user_id, response, note, responded_at, updated_at, attendance_status, attendance_at, attendance_note, marked_by')
    .eq('event_id', programId)
    .order('responded_at', { ascending: false });

  if (responseFilter && RESPONSES.has(responseFilter)) {
    q = q.eq('response', responseFilter);
  }

  const { data, error } = await q;
  if (error) {
    console.error('[team-program-rsvps GET] failed', error);
    return NextResponse.json({ error: 'load_failed', message: error.message }, { status: 500 });
  }

  // Counts grouped by response.
  const counts: Record<string, number> = { yes: 0, no: 0, maybe: 0 };
  for (const r of data || []) {
    const k = (r as { response?: string }).response || '';
    if (k in counts) counts[k]++;
  }

  return NextResponse.json({ rsvps: data || [], counts });
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
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const rsvpIds = body.rsvp_ids;
  if (!Array.isArray(rsvpIds) || rsvpIds.length === 0) {
    return NextResponse.json({ error: 'rsvp_ids_required' }, { status: 400 });
  }
  if (rsvpIds.length > 500) {
    return NextResponse.json({ error: 'too_many_ids', max: 500 }, { status: 400 });
  }
  if (!rsvpIds.every((x) => typeof x === 'string' && x.length > 0)) {
    return NextResponse.json({ error: 'invalid_ids' }, { status: 400 });
  }

  const responseValue = body.response;
  if (responseValue !== undefined && (typeof responseValue !== 'string' || !RESPONSES.has(responseValue))) {
    return NextResponse.json(
      { error: 'invalid_response', allowed: [...RESPONSES] },
      { status: 400 },
    );
  }

  if (responseValue === undefined) {
    return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {
    response: responseValue,
    updated_at: new Date().toISOString(),
    responded_at: new Date().toISOString(),
  };
  if (typeof body.note === 'string') {
    if (body.note.length > 2000) {
      return NextResponse.json({ error: 'note_too_long' }, { status: 400 });
    }
    updatePayload.note = body.note;
  }

  // Update only rows that match this program to prevent any chance of cross-tenant write.
  const { data, error } = await supabaseAdmin
    .from('team_rsvps')
    .update(updatePayload)
    .eq('event_id', programId)
    .in('id', rsvpIds)
    .select('id, response');

  if (error) {
    console.error('[team-program-rsvps PATCH] failed', error);
    return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: data?.length || 0, rsvps: data });
}