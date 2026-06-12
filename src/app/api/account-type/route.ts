import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/account-type
// Body: { account_type: 'fan' | 'player' | 'coach' | 'scout' | 'business' | 'team' | 'league' | 'rink' }
// Returns: { ok: true, account_type }
// Sets the user's self-identified account type. Idempotent. Can be changed anytime.

const ALLOWED = new Set(['fan', 'player', 'coach', 'scout', 'business', 'team', 'league', 'rink']);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { account_type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const at = body.account_type;
  if (!at || !ALLOWED.has(at)) {
    return NextResponse.json(
      { error: 'invalid_account_type', allowed: Array.from(ALLOWED) },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ account_type: at })
    .eq('user_id', userId)
    .select('account_type')
    .maybeSingle();

  if (error) {
    console.error('[account-type] update failed', error);
    return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 500 });
  }

  if (!data) {
    // No profile yet — create one. Trigger from Clerk webhook normally creates it,
    // but handle the rare race here.
    const { error: insertErr } = await supabaseAdmin
      .from('profiles')
      .insert({ user_id: userId, account_type: at, role: 'user', tier: 'free', is_founding_member: false });
    if (insertErr) {
      console.error('[account-type] insert failed', insertErr);
      return NextResponse.json({ error: 'create_failed', message: insertErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, account_type: at });
}

export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ account_type: null });

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('account_type')
    .eq('user_id', userId)
    .maybeSingle();

  return NextResponse.json({ account_type: data?.account_type || null });
}
