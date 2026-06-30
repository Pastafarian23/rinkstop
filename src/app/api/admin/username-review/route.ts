/**
 * src/app/api/admin/username-review/route.ts
 *
 * GET /api/admin/username-review
 *   List pending reviews (admin only). Reads from
 *   pending_username_review_queue view.
 *
 * POST /api/admin/username-review
 *   Approve or reject a pending review.
 *   Body: { review_id: string, action: 'approve' | 'reject', note?: string }
 *
 *   Approve:
 *     - Sets the user's profiles.username to requested_slug
 *     - Reserves the slug (or holds the previous one per cooldown rules)
 *     - Sets status='approved' on the review row
 *
 *   Reject:
 *     - Just sets status='rejected' on the review row
 *     - The user can pick a different username
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { setUsername } from '@/lib/username-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin emails — in real life, store on profiles.role='super_admin'
const ADMIN_EMAILS = new Set([
  'arnellarracas@gmail.com',
  'support@rinkstop.com',
]);

async function requireAdmin(): Promise<{ userId: string } | { error: NextResponse }> {
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
  // The role column check is the production-grade path. Fall back to
  // email check for the founder since role assignment isn't wired yet.
  if (!isSuper) {
    // Look up email via Clerk currentUser
    const user = await currentUser();
    const email = (user as any)?.emailAddresses?.[0]?.emailAddress;
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
    .from('pending_username_review_queue')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: 'read_failed', detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data, count: data?.length ?? 0 });
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
    .from('pending_username_review')
    .select('*')
    .eq('id', review_id)
    .maybeSingle();
  if (readErr || !review) {
    return NextResponse.json({ error: 'review_not_found' }, { status: 404 });
  }
  if (review.status !== 'pending') {
    return NextResponse.json(
      { error: 'already_reviewed', status: review.status },
      { status: 409 }
    );
  }

  if (action === 'reject') {
    const { error: updErr } = await supabaseAdmin
      .from('pending_username_review')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewer_user_id: adminUserId,
        review_note: note ?? null,
      })
      .eq('id', review_id);
    if (updErr) {
      return NextResponse.json({ error: 'update_failed', detail: updErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, action: 'rejected' });
  }

  // Approve: try to set the username
  const setResult = await setUsername(review.user_id, review.requested_slug);
  if (!setResult.ok) {
    const errMsg = (setResult as { error?: string }).error ?? 'unknown';
    return NextResponse.json(
      {
        error: 'set_failed',
        message: `Set username failed: ${errMsg}`,
        detail: setResult,
      },
      { status: 409 }
    );
  }

  // Mark the review approved
  const { error: updErr } = await supabaseAdmin
    .from('pending_username_review')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewer_user_id: adminUserId,
      review_note: note ?? null,
    })
    .eq('id', review_id);
  if (updErr) {
    // Username was set but review row update failed — log loudly.
    console.error('[admin/username-review] approved but review row update failed:', updErr);
  }
  return NextResponse.json({ ok: true, action: 'approved', username: setResult.username });
}
