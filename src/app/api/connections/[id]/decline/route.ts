import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId, getConnectionForUser, type Connection } from '@/lib/connections';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RL = { maxRequests: 10, windowMs: 60 * 1000 };

// POST /api/connections/[id]/decline
// Declines a pending connection request. Only the recipient can decline.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ip = getClientIP(request);
  const result = await checkRateLimit(`decline:${ip}`, RL);
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
  const { connection, isRecipient } = lookup;

  if (!isRecipient) {
    return NextResponse.json(
      { error: 'Only the recipient of a pending request can decline it.' },
      { status: 403 }
    );
  }
  if (connection.status !== 'pending') {
    return NextResponse.json({ error: `Cannot decline a ${connection.status} connection.` }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('connections')
    .update({ status: 'declined' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('[connections decline] update failed', error);
    return NextResponse.json({ error: 'Failed to decline.' }, { status: 500 });
  }

  const res = NextResponse.json({ connection: data as Connection });
  return applyRateLimitHeaders(res, result);
}
