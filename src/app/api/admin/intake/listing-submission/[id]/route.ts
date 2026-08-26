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

  const { data, error } = await supabaseAdmin
    .from('listing_submissions')
    .update({
      status: body.status,
      notes: body.notes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      updated_at: new Date().toISOString(),
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
    params: { intent: (data as any)?.intent || null, notes: body.notes || null },
  });

  return NextResponse.json({ ok: true, submission: data });
}
