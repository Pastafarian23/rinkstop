// src/app/api/manage/team/[id]/programs/[programId]/rsvps/[rsvpId]/route.ts
//
// WS38 - Club Starter team-registration-management.
//
// Owner API for a single RSVP row.
//
//   PATCH  /api/manage/team/[id]/programs/[programId]/rsvps/[rsvpId]
//     body: { response?: 'yes' | 'no' | 'maybe', attendance_status?:
//       'pending' | 'present' | 'absent', note?: string | null,
//       attendance_note?: string | null, marked_by?: string }
//     - Marks a single RSVP as approved/rejected/waitlist by setting
//       response (yes/no/maybe). We treat 'maybe' as waitlist and 'no' as
//       rejected.
//   DELETE /api/manage/team/[id]/programs/[programId]/rsvps/[rsvpId]
//     - Hard delete the row (manager removed the registrant).
//
// Auth: caller must have an approved team claim on the parent workspace
// AND the program must belong to that workspace AND the RSVP must belong
// to the program. Any mismatch → 403/404.
//
// We do NOT touch attendance_status on PATCH unless the caller explicitly
// sends it — leaving attendance alone on approval so the existing
// attendance workflow keeps working.

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RESPONSES = new Set(['yes', 'no', 'maybe']);
const ATTENDANCE = new Set(['pending', 'present', 'absent']);

async function authorize(userId: string, workspaceId: string, programId: string) {
  // Owner check: caller must have an approved claim on this team workspace.
  const { count } = await supabaseAdmin
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('claim_type', 'team')
    .eq('entity_id', workspaceId)
    .eq('status', 'approved');
  if (!count) return { ok: false as const, status: 403, error: 'forbidden' };

  // Program must belong to this workspace.
  const { data: program } = await supabaseAdmin
    .from('team_events')
    .select('id, team_id')
    .eq('id', programId)
    .eq('team_id', workspaceId)
    .maybeSingle();
  if (!program) return { ok: false as const, status: 404, error: 'program_not_found' };

  return { ok: true as const, program };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string; rsvpId: string }> },
) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id, programId, rsvpId } = await params;

  const authz = await authorize(userId, id, programId);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status });

  // Confirm RSVP belongs to the program.
  const { data: existing } = await supabaseAdmin
    .from('team_rsvps')
    .select('id, event_id')
    .eq('id', rsvpId)
    .eq('event_id', programId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'rsvp_not_found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if ('response' in body) {
    if (typeof body.response !== 'string' || !RESPONSES.has(body.response)) {
      return NextResponse.json(
        { error: 'invalid_response', allowed: [...RESPONSES] },
        { status: 400 },
      );
    }
    update.response = body.response;
  }

  if ('attendance_status' in body) {
    if (body.attendance_status !== null && (typeof body.attendance_status !== 'string' || !ATTENDANCE.has(body.attendance_status))) {
      return NextResponse.json(
        { error: 'invalid_attendance_status', allowed: [...ATTENDANCE] },
        { status: 400 },
      );
    }
    update.attendance_status = body.attendance_status;
  }

  if ('note' in body) {
    if (body.note !== null && typeof body.note !== 'string') {
      return NextResponse.json({ error: 'invalid_note' }, { status: 400 });
    }
    if (typeof body.note === 'string' && body.note.length > 2000) {
      return NextResponse.json({ error: 'note_too_long' }, { status: 400 });
    }
    update.note = body.note;
  }

  if ('attendance_note' in body) {
    if (body.attendance_note !== null && typeof body.attendance_note !== 'string') {
      return NextResponse.json({ error: 'invalid_attendance_note' }, { status: 400 });
    }
    if (typeof body.attendance_note === 'string' && body.attendance_note.length > 2000) {
      return NextResponse.json({ error: 'attendance_note_too_long' }, { status: 400 });
    }
    update.attendance_note = body.attendance_note;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
  }

  update.updated_at = new Date().toISOString();
  update.responded_at = new Date().toISOString();

  const { data: row2, error } = await supabaseAdmin
    .from('team_rsvps')
    .update(update)
    .eq('id', rsvpId)
    .select('*')
    .single();

  if (error) {
    console.error('[team-program-rsvp PATCH] failed', error);
    return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ rsvp: row2 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string; rsvpId: string }> },
) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id, programId, rsvpId } = await params;

  const authz = await authorize(userId, id, programId);
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status });

  // Confirm RSVP belongs to the program before deletion.
  const { data: existing } = await supabaseAdmin
    .from('team_rsvps')
    .select('id')
    .eq('id', rsvpId)
    .eq('event_id', programId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: 'rsvp_not_found' }, { status: 404 });

  const { error } = await supabaseAdmin.from('team_rsvps').delete().eq('id', rsvpId);
  if (error) {
    console.error('[team-program-rsvp DELETE] failed', error);
    return NextResponse.json({ error: 'delete_failed', message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}