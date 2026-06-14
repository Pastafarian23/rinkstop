import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

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
    .eq('user_id', userId);
  if (delErr) {
    console.error('[account-type] delete failed', delErr);
    return NextResponse.json({ error: 'update_failed', message: delErr.message }, { status: 500 });
  }

  const rows = types.map((t) => ({
    user_id: userId,
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
  const targetUserId = req.nextUrl.searchParams.get('userId') || authedUserId;

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
