// src/app/api/owner/rinks/[id]/event-submissions/[submissionId]/route.ts
//
// Owner: approve, reject, or update a single submission.
//   GET    /api/owner/rinks/[id]/event-submissions/{submissionId}
//   PATCH  /api/owner/rinks/[id]/event-submissions/{submissionId}
//   DELETE /api/owner/rinks/[id]/event-submissions/{submissionId}  (mark spam)
//
// On APPROVE: also creates a rink_events row with status='pending'.
// The rink owner can then publish it from the regular events dashboard.

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwnerForRental } from '@/lib/rental/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { uniqueSlug } from '@/lib/slug';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUSES = ['pending','approved','rejected','spam','duplicate'];

// GET
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> },
) {
  try {
    const { id, submissionId } = await params;
    await requireRinkOwnerForRental(request, id);

    const { data: submission, error } = await supabaseAdmin
      .from('event_submissions')
      .select('*')
      .eq('id', submissionId)
      .eq('rink_id', id)
      .maybeSingle();

    if (error || !submission) {
      return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    }
    return NextResponse.json({ submission });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[event-submission GET]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

// PATCH
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> },
) {
  try {
    const { id, submissionId } = await params;
    const owner = await requireRinkOwnerForRental(request, id);
    const body = await request.json();

    // Load submission
    const { data: submission, error: fetchErr } = await supabaseAdmin
      .from('event_submissions')
      .select('*')
      .eq('id', submissionId)
      .eq('rink_id', id)
      .maybeSingle();

    if (fetchErr || !submission) {
      return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    }

    const updatePayload: Record<string, unknown> = {};
    if (body.status && STATUSES.includes(body.status)) {
      updatePayload.status = body.status;
      if (body.status !== 'pending') {
        updatePayload.reviewed_at = new Date().toISOString();
        updatePayload.reviewed_by = owner.userId;
      }
    }
    if (body.rejection_reason !== undefined) {
      updatePayload.rejection_reason = body.rejection_reason;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    // If approving: also create a rink_events row
    let createdEventId: string | null = null;
    if (body.status === 'approved' && submission.status !== 'approved') {
      const slug = await uniqueSlug(
        submission.title,
        async (s: string) => {
          const { data } = await supabaseAdmin
            .from('rink_events')
            .select('id')
            .eq('rink_id', id)
            .eq('slug', s)
            .maybeSingle();
          return !!data;
        },
      );

      const { data: newEvent, error: eventErr } = await supabaseAdmin
        .from('rink_events')
        .insert({
          rink_id: id,
          slug,
          title: submission.title,
          description: submission.description,
          event_type: submission.event_type,
          starts_at: submission.starts_at,
          ends_at: submission.ends_at,
          timezone: (submission.raw_payload as any)?.submitted_timezone || 'America/New_York',
          address: (submission.raw_payload as any)?.submitted_address || null,
          source_url: submission.source_url,
          registration_url: submission.source_url,
          registration_method: submission.source_url ? 'external' : 'walk_in',
          status: 'draft', // owner reviews + publishes from the events dashboard
          visibility: 'public',
        })
        .select('id')
        .single();

      if (eventErr) {
        console.error('[event-submission PATCH] create rink_events error:', eventErr);
        // Continue with submission update — owner can re-create manually
      } else {
        createdEventId = newEvent.id;
        updatePayload.created_event_id = newEvent.id;
      }
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('event_submissions')
      .update(updatePayload)
      .eq('id', submissionId)
      .select('*')
      .single();

    if (updateErr || !updated) {
      return NextResponse.json({ error: updateErr?.message ?? 'Update failed.' }, { status: 500 });
    }

    return NextResponse.json({ submission: updated, created_event_id: createdEventId });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[event-submission PATCH]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

// DELETE — mark as spam (soft delete; row stays for audit)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> },
) {
  try {
    const { id, submissionId } = await params;
    const owner = await requireRinkOwnerForRental(request, id);

    const { error } = await supabaseAdmin
      .from('event_submissions')
      .update({
        status: 'spam',
        reviewed_at: new Date().toISOString(),
        reviewed_by: owner.userId,
      })
      .eq('id', submissionId)
      .eq('rink_id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[event-submission DELETE]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
