import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId, getConnectionForUser, type Connection } from '@/lib/connections';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RL = { maxRequests: 10, windowMs: 60 * 1000 };

// POST /api/connections/[id]/block
// Blocks the other participant. Either side can block.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ip = getClientIP(request);
  const result = await checkRateLimit(ip, RL);
  maybeCleanup();

  const userId = await requireUserId();
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, result);
  }

  const lookup = await getConnectionForUser(id, userId);
  if (!lookup) {
    return NextResponse.json({ error: 'Connection not found.' }, { status: 404 });
  }
  const { connection } = lookup;

  const { data, error } = await supabaseAdmin
    .from('connections')
    .update({ status: 'blocked' })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('[connections block] update failed', error);
    return NextResponse.json({ error: 'Failed to block.' }, { status: 500 });
  }

  const res = NextResponse.json({ connection: data as Connection });
  return applyRateLimitHeaders(res, result);
}
