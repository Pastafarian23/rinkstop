import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { OWNER_EMAILS } from '@/lib/admin-auth';

// POST /api/account-type
// Body: { types: string[], primary: string }
// Returns: { ok: true, types: string[], primary: string }
// Replaces the user's full set of account types. Idempotent.

const ALLOWED = new Set([
  'player',
  'parent',
  'coach',
  'scout',
  'referee',
  'rink_operator',
  'league_admin',
  'team_admin',
  'business',
  'fan',
]);

function isAllowed(v: unknown): v is string {
  return typeof v === 'string' && ALLOWED.has(v);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Owner-email canonical-user-id fallback (same pattern as identity page
  // 4700eee, dashboard layout 8fb9823, subscription page 1b45415, dashboard
  // page 0a8909f). profile_account_types has a FK to profiles.user_id with
  // CASCADE delete, so an INSERT for an orphan Clerk user_id (which has no
  // profiles row) fails the FK constraint and returns 500 — the picker
  // silently catches it and the user sees 'nothing saved'. Resolving to the
  // canonical user_id before delete+insert makes the save land on the row
  // the dashboard nav reads from.
  let effectiveUserId = userId;
  try {
    const cu = await currentUser();
    const ownerEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
    if (OWNER_EMAILS.has(ownerEmail)) {
      const { data: byEmail } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .ilike('email', ownerEmail)
        .neq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (byEmail) effectiveUserId = byEmail.user_id;
    }
  } catch { /* fall through to auth().userId */ }

  let body: { types?: unknown; primary?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!Array.isArray(body.types)) {
    return NextResponse.json({ error: 'types_must_be_array' }, { status: 400 });
  }
  // De-dupe + filter
  const types = Array.from(new Set(body.types.filter(isAllowed)));
  if (types.length === 0) {
    return NextResponse.json({ error: 'at_least_one_type_required' }, { status: 400 });
  }
  const primary = isAllowed(body.primary) && types.includes(body.primary) ? body.primary : types[0];

  // Replace the user's full set atomically: delete-all-then-insert.
  // Cheaper than diffing, and this endpoint is low-traffic (only on profile-type save).
  const { error: delErr } = await supabaseAdmin
    .from('profile_account_types')
    .delete()
    .eq('user_id', effectiveUserId);
  if (delErr) {
    console.error('[account-type] delete failed', delErr);
    return NextResponse.json({ error: 'update_failed', message: delErr.message }, { status: 500 });
  }

  const rows = types.map((t) => ({
    user_id: effectiveUserId,
    account_type: t,
    is_primary: t === primary,
  }));
  const { error: insErr } = await supabaseAdmin
    .from('profile_account_types')
    .insert(rows);
  if (insErr) {
    console.error('[account-type] insert failed', insErr);
    return NextResponse.json({ error: 'update_failed', message: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, types, primary });
}

export async function GET(req: NextRequest) {
  const { userId: authedUserId } = await auth();
  if (!authedUserId) return NextResponse.json({ types: [], primary: null });

  // Allow reading any user's public types (used by /u/[userId] profile page).
  // The RLS policy on profile_account_types is SELECT USING (true), so this is safe.
  let targetUserId = req.nextUrl.searchParams.get('userId') || authedUserId;

  // Owner-email canonical lookup (read path). Same pattern as POST below:
  // if the authed Clerk user_id is the orphan and the email is in
  // OWNER_EMAILS, read the canonical row's account types instead so the
  // picker pre-loads the user's existing selection.
  if (targetUserId === authedUserId) {
    try {
      const cu = await currentUser();
      const ownerEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
      if (OWNER_EMAILS.has(ownerEmail)) {
        const { data: byEmail } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .ilike('email', ownerEmail)
          .neq('user_id', authedUserId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (byEmail) targetUserId = byEmail.user_id;
      }
    } catch { /* fall through */ }
  }

  const { data, error } = await supabaseAdmin
    .from('profile_account_types')
    .select('account_type, is_primary')
    .eq('user_id', targetUserId);

  if (error) {
    console.error('[account-type] select failed', error);
    return NextResponse.json({ types: [], primary: null });
  }

  const types = (data || []).map((r: { account_type: string }) => r.account_type);
  const primaryRow = (data || []).find((r: { is_primary: boolean }) => r.is_primary);
  const primary = primaryRow?.account_type || types[0] || null;

  return NextResponse.json({ types, primary });
}
