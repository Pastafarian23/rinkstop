import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId, getConnectionForUser } from '@/lib/connections';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RL = { maxRequests: 10, windowMs: 60 * 1000 };

// DELETE /api/connections/[id]
// Removes a connection entirely. Either participant can delete.
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

  const lookup = await getConnectionForUser(id, userId);
  if (!lookup) {
    return NextResponse.json({ error: 'Connection not found.' }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from('connections')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[connections DELETE] failed', error);
    return NextResponse.json({ error: 'Failed to delete.' }, { status: 500 });
  }

  const res = NextResponse.json({ success: true });
  return applyRateLimitHeaders(res, result);
}
