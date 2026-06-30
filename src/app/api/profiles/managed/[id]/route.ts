import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId } from '@/lib/connections';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RL = { maxRequests: 10, windowMs: 60 * 1000 };

// DELETE /api/profiles/managed/[id]
// Manager can remove their own managed profile link.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ip = getClientIP(request);
  const result = await checkRateLimit(`[id]:${ip}`, RL);
  maybeCleanup();

  const userId = await resolveCanonicalUserId(
    await requireUserId(),
    (await currentUser())?.emailAddresses?.[0]?.emailAddress || ''
  );
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, result);
  }

  const { data: row, error: fetchErr } = await supabaseAdmin
    .from('managed_profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }
  if ((row as any).manager_user_id !== userId) {
    return NextResponse.json({ error: 'You can only remove your own managed profiles.' }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from('managed_profiles')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('[managed_profiles DELETE] failed', error);
    return NextResponse.json({ error: 'Failed to remove.' }, { status: 500 });
  }

  const res = NextResponse.json({ success: true });
  return applyRateLimitHeaders(res, result);
}
