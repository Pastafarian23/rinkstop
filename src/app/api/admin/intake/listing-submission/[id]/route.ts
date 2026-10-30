// PATCH /api/admin/intake/listing-submission/[id]
// Approve or reject a directory submission (rink/team/league add).
//
// Body: { status: 'approved' | 'rejected', notes?: string }
//
// On approve, this only flips the status — it does NOT create the actual
// rink/team/league record. The submitter flow assumes a human (Arnel) will
// create the directory entry from the approved submission. We store the
// submission's intent so the human can click into the relevant page.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { logAdminEvent } from '@/lib/admin-audit';
import {
  createListingFromSubmission,
  parseLinkedListingId,
} from '@/lib/listing-submission-to-listing';
import { notifySubmitterOfDecision } from '@/lib/listing-submission-notify';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAdminFromRequest(request, 'admin_intake_listing-submission');
  if ('response' in auth) return auth.response;

  const { id } = await params;
  let body: { status?: 'approved' | 'rejected'; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.status || !['approved', 'rejected'].includes(body.status)) {
    return NextResponse.json({ error: 'status must be approved | rejected' }, { status: 400 });
  }

  // Get current user from Clerk for the reviewed_by audit field
  const { currentUser } = await import('@clerk/nextjs/server');
  const user = await currentUser();
  const reviewedBy = user?.emailAddresses[0]?.emailAddress || user?.id || 'unknown';

  // ─────────────────────────────────────────────────────────────────────────
  // APPROVE: create the actual directory listing.
  //
  // 2026-10-29 (Arnel's revenue audit): approving used to ONLY flip the
  // status — the endpoint's own comment said "it does NOT create the actual
  // rink/team/league record". Every approved submission then needed a
  // SECOND manual step in /admin/rinks/new. That two-step gap is why both
  // real leads sat unapproved for 8 and 27 days. The friction was the bug.
  //
  // Now approval creates the listing in one step, and records the result
  // (created / matched an existing listing / skipped) back onto the
  // submission so /admin/intake can show it.
  //
  // NOT pushy: the created listing is `claimable: true` and
  // `verification_tier: 'unverified'` — we publish the listing, we do not
  // take control of it on the submitter's behalf.
  // ─────────────────────────────────────────────────────────────────────────
  let listingResult: {
    outcome: 'created' | 'matched';
    entity: string | null;
    listingId: string | null;
    listingUrl: string | null;
    skipReason?: string;
    error?: string;
  } | null = null;

  if (body.status === 'approved') {
    const { data: existingRow } = await supabaseAdmin
      .from('listing_submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (existingRow) {
      const result = await createListingFromSubmission(existingRow as any);
      listingResult = {
        outcome: result.outcome,
        entity: result.entity,
        listingId: result.listingId,
        listingUrl: result.listingUrl,
        skipReason: result.skipReason,
        error: result.error,
      };

      // Append the listing reference to notes so the audit trail and the
      // admin UI both show where the submission ended up.
      const linkNote = result.listingId
        ? `Listing created from this submission: ${result.entity}s/${result.listingId}${
            result.listingUrl ? ` — ${result.listingUrl}` : ''
          }.`
        : result.skipReason || 'Listing creation skipped.';
      const priorNotes = (existingRow as any)?.notes || body.notes || '';
      body.notes = priorNotes ? `${priorNotes}\n${linkNote}` : linkNote;
    }
  }

  const { data, error } = await supabaseAdmin
    .from('listing_submissions')
    .update({
      status: body.status,
      notes: body.notes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      updated_at: new Date().toISOString(),
      // 2026-10-30: persist the linked listing id in its own column.
      // Previously the link only existed inside the free-text `notes`
      // string, which meant the public status page could not resolve the
      // live URL without re-parsing prose. `listing_id` is the column for
      // exactly this. `parseLinkedListingId` handles the legacy
      // notes-only rows, so this does not break anything already approved.
      listing_id: listingResult?.listingId || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log: also log what was in the submission for context (intent
  // type + name). Helps reconstruct the decision later.
  await logAdminEvent({
    admin: auth.admin,
    request,
    action: `listing_submission_${body.status}`,
    entityType: 'listing_submission',
    entityId: id,
    entityName: (data as any)?.name || null,
    params: {
      intent: (data as any)?.intent || null,
      notes: body.notes || null,
      listing: listingResult,
    },
  });

  // 2026-10-30: email the submitter about the decision.
  //
  // WHY: before this, NOTHING was emailed when a submission was approved or
  // rejected. Slough Satans submitted on 2026-10-02, heard nothing, and only
  // found out their listing was live because we chased them 27 days later.
  // The silence was half of why the relationship felt broken.
  //
  // Fire-and-forget: never block an admin action on an email send.
  void notifySubmitterOfDecision({
    submission: data as any,
    status: body.status,
    listingUrl: listingResult?.listingUrl || null,
    listingId: listingResult?.listingId || null,
  });

  // If the listing could not be created, surface it — do NOT silently mark
  // the submission approved with no listing. That is the exact failure mode
  // this change exists to eliminate.
  if (listingResult?.error) {
    return NextResponse.json(
      {
        ok: false,
        error: `Listing creation failed: ${listingResult.error}`,
        submission: data,
        listing: listingResult,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, submission: data, listing: listingResult });
}
