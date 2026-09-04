// src/app/api/owner/rinks/[id]/equipment/assignments/[assignmentId]/route.ts
//
// Single assignment: return, update, delete.
//   GET    /api/owner/rinks/[id]/equipment/assignments/{assignmentId}
//   PATCH  /api/owner/rinks/[id]/equipment/assignments/{assignmentId}
//   DELETE /api/owner/rinks/[id]/equipment/assignments/{assignmentId}

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwnerForRental } from '@/lib/rental/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CONDITIONS = ['new','excellent','good','worn','damaged','needs_repair'];

// GET
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; assignmentId: string } },
) {
  try {
    await requireRinkOwnerForRental(request, params.id);
    const { data: assignment, error } = await supabaseAdmin
      .from('equipment_assignments')
      .select('*')
      .eq('id', params.assignmentId)
      .maybeSingle();

    if (error || !assignment) {
      return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
    }

    // Verify the item belongs to this rink
    const { data: item } = await supabaseAdmin
      .from('equipment_items')
      .select('owner_id')
      .eq('id', assignment.equipment_id)
      .maybeSingle();

    if (!item || item.owner_id !== params.id) {
      return NextResponse.json({ error: 'Assignment belongs to a different rink.' }, { status: 404 });
    }

    return NextResponse.json({ assignment });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[equipment/assignment GET]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

// PATCH
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; assignmentId: string } },
) {
  try {
    await requireRinkOwnerForRental(request, params.id);
    const body = await request.json();

    // Return flow: if returned_at is provided, close out the assignment
    const updatePayload: Record<string, unknown> = {};
    if (body.due_at) updatePayload.due_at = new Date(body.due_at).toISOString();
    if (body.notes !== undefined) updatePayload.notes = body.notes;
    if (body.return_condition && CONDITIONS.includes(body.return_condition)) {
      updatePayload.return_condition = body.return_condition;
    }
    if (body.returned_at === true || body.returned_at === 'now') {
      updatePayload.returned_at = new Date().toISOString();
    } else if (typeof body.returned_at === 'string') {
      updatePayload.returned_at = new Date(body.returned_at).toISOString();
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    const { data: assignment, error } = await supabaseAdmin
      .from('equipment_assignments')
      .update(updatePayload)
      .eq('id', params.assignmentId)
      .select('*')
      .single();

    if (error || !assignment) {
      return NextResponse.json({ error: error?.message ?? 'Assignment not found.' }, { status: 404 });
    }

    // If returned, reset the item to active
    if (assignment.returned_at) {
      await supabaseAdmin
        .from('equipment_items')
        .update({ status: 'active', condition: assignment.return_condition || 'good' })
        .eq('id', assignment.equipment_id);
    }

    return NextResponse.json({ assignment });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[equipment/assignment PATCH]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

// DELETE — hard delete an assignment (with due care)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; assignmentId: string } },
) {
  try {
    await requireRinkOwnerForRental(request, params.id);

    const { data: assignment, error: fetchErr } = await supabaseAdmin
      .from('equipment_assignments')
      .select('id, equipment_id')
      .eq('id', params.assignmentId)
      .maybeSingle();

    if (fetchErr || !assignment) {
      return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
    }

    const { error: deleteErr } = await supabaseAdmin
      .from('equipment_assignments')
      .delete()
      .eq('id', params.assignmentId);

    if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

    // If item was lent and no other open assignments, reset to active
    const { data: openAssignments } = await supabaseAdmin
      .from('equipment_assignments')
      .select('id')
      .eq('equipment_id', assignment.equipment_id)
      .is('returned_at', null)
      .limit(1);

    if (!openAssignments || openAssignments.length === 0) {
      await supabaseAdmin
        .from('equipment_items')
        .update({ status: 'active' })
        .eq('id', assignment.equipment_id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[equipment/assignment DELETE]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
