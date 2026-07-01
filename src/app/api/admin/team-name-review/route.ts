/**
 * src/app/api/admin/team-name-review/route.ts
 *
 * GET /api/admin/team-name-review
 *   List pending team name change reviews (super_admin only).
 *
 * POST /api/admin/team-name-review
 *   Approve or reject a pending review.
 *   Body: { review_id: string, action: 'approve' | 'reject', note?: string }
 *
 *   Approve:
 *     - Applies pending_name + pending_short_name to live team fields
 *     - Clears pending_* columns
 *     - Marks review as approved
 *
 *   Reject:
 *     - Clears pending_* columns on team_workspaces
 *     - Marks review as rejected
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = new Set(['arnellarracas@gmail.com', 'support@rinkstop.com']);

async function requireAdmin() {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, _deprecated_account_type, user_id')
    .eq('user_id', userId)
    .maybeSingle();
  const isSuper = profile?.role === 'super_admin' || profile?._deprecated_account_type === 'super_admin';
  if (!isSuper) {
    const email = (cu as any)?.emailAddresses?.[0]?.emailAddress;
    if (!email || !ADMIN_EMAILS.has(email)) {
      return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
    }
  }
  return { userId };
}

export async function GET(req: NextRequest) {
  const authz = await requireAdmin();
  if ('error' in authz) return authz.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'pending';

  const { data, error } = await supabaseAdmin
    .from('team_name_review')
    .select('*, team:team_id(id, slug, name, short_name, timezone)')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: 'read_failed', detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [], count: data?.length ?? 0 });
}

export async function POST(req: NextRequest) {
  const authz = await requireAdmin();
  if ('error' in authz) return authz.error;
  const adminUserId = authz.userId;

  const body = await req.json();
  const { review_id, action, note } = body;

  if (!review_id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  // Read the review row
  const { data: review, error: readErr } = await supabaseAdmin
    .from('team_name_review')
    .select('*')
    .eq('id', review_id)
    .maybeSingle();
  if (readErr || !review) {
    return NextResponse.json({ error: 'review_not_found' }, { status: 404 });
  }
  if (review.status !== 'pending') {
    return NextResponse.json(
      { error: 'already_reviewed', status: review.status },
      { status: 409 },
    );
  }

  if (action === 'reject') {
    // Clear pending columns, mark rejected
    await supabaseAdmin
      .from('team_workspaces')
      .update({
        pending_name: null,
        pending_short_name: null,
        pending_submitted_at: null,
        pending_submitted_by: null,
      })
      .eq('id', review.team_id);

    await supabaseAdmin
      .from('team_name_review')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewer_user_id: adminUserId,
        review_note: note ?? null,
      })
      .eq('id', review_id);

    return NextResponse.json({ ok: true, action: 'rejected' });
  }

  // Approve: apply pending_* to live fields
  const { error: applyErr } = await supabaseAdmin
    .from('team_workspaces')
    .update({
      name: review.requested_name,
      short_name: review.requested_short_name,
      pending_name: null,
      pending_short_name: null,
      pending_submitted_at: null,
      pending_submitted_by: null,
    })
    .eq('id', review.team_id);

  if (applyErr) {
    return NextResponse.json(
      { error: 'apply_failed', detail: applyErr.message },
      { status: 500 },
    );
  }

  await supabaseAdmin
    .from('team_name_review')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewer_user_id: adminUserId,
      review_note: note ?? null,
    })
    .eq('id', review_id);

  return NextResponse.json({
    ok: true,
    action: 'approved',
    new_name: review.requested_name,
    new_short_name: review.requested_short_name,
  });
}
