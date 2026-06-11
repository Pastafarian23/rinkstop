import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  requireUserId,
  getUserTier,
  tierAtLeast,
  normalizePair,
  getConnectionBetween,
  type Connection,
} from '@/lib/connections';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RL_REQUEST = { maxRequests: 5, windowMs: 10 * 60 * 1000 };  // 5/10min for connection requests (anti-spam)
const RL_READ    = { maxRequests: 30, windowMs: 60 * 1000 };     // 30/min for reads

// POST /api/connections
// Body: { recipientId: string }
// Creates a pending connection request. Caller must be Verified+.
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(ip, RL_REQUEST);
  maybeCleanup();

  const userId = await requireUserId();
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in to send connection requests.' }, { status: 401 });
    return applyRateLimitHeaders(res, result);
  }

  let body: { recipientId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!body.recipientId || typeof body.recipientId !== 'string') {
    return NextResponse.json({ error: 'recipientId required.' }, { status: 400 });
  }
  if (body.recipientId === userId) {
    return NextResponse.json({ error: 'Cannot connect with yourself.' }, { status: 400 });
  }

  // Tier check: caller must be Verified+ to send connection requests (so DMs are gated).
  const tier = await getUserTier(userId);
  if (!tierAtLeast(tier, 'verified')) {
    return NextResponse.json(
      { error: 'Verified or Pro membership required to send connection requests.', currentTier: tier },
      { status: 403 }
    );
  }

  // Verify recipient exists in profiles.
  const { data: recipient } = await supabaseAdmin
    .from('profiles')
    .select('user_id, tier')
    .eq('user_id', body.recipientId)
    .maybeSingle();
  if (!recipient) {
    return NextResponse.json({ error: 'Recipient not found.' }, { status: 404 });
  }

  // If a connection already exists, return it (idempotent).
  const existing = await getConnectionBetween(userId, body.recipientId);
  if (existing) {
    const res = NextResponse.json({ connection: existing, alreadyExisted: true });
    return applyRateLimitHeaders(res, result);
  }

  // Create the pending connection row, normalized.
  const { user_low, user_high } = normalizePair(userId, body.recipientId);
  const { data: created, error } = await supabaseAdmin
    .from('connections')
    .insert({
      user_low,
      user_high,
      initiated_by: userId,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) {
    // Race condition: another request created the row between our check and insert.
    if (error.code === '23505') {
      const conn = await getConnectionBetween(userId, body.recipientId);
      const res = NextResponse.json({ connection: conn, alreadyExisted: true });
      return applyRateLimitHeaders(res, result);
    }
    console.error('[connections POST] insert failed', error);
    return NextResponse.json({ error: 'Failed to send request.' }, { status: 500 });
  }

  const res = NextResponse.json({ connection: created as Connection });
  return applyRateLimitHeaders(res, result);
}

// GET /api/connections?status=pending|accepted|blocked|declined
// Lists the caller's connections, optionally filtered by status.
// Returns the other party's profile (display_name, avatar, tier) for UI rendering.
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(ip, RL_READ);
  maybeCleanup();

  const userId = await requireUserId();
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in to view connections.' }, { status: 401 });
    return applyRateLimitHeaders(res, result);
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status');

  let q = supabaseAdmin
    .from('connections')
    .select('*')
    .or(`user_low.eq.${userId},user_high.eq.${userId}`);
  if (status) {
    q = q.eq('status', status);
  }
  const { data: connections, error } = await q.order('created_at', { ascending: false });
  if (error) {
    console.error('[connections GET] failed', error);
    return NextResponse.json({ error: 'Failed to load connections.' }, { status: 500 });
  }

  // Hydrate with the other party's profile.
  const otherUserIds = (connections || []).map((c: Connection) =>
    c.user_low === userId ? c.user_high : c.user_low
  );

  let profiles: Record<string, { user_id: string; display_name: string | null; avatar_url: string | null; tier: string }> = {};
  if (otherUserIds.length > 0) {
    const { data: profileRows } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name, avatar_url, tier')
      .in('user_id', otherUserIds);
    for (const p of profileRows || []) {
      profiles[p.user_id] = p as any;
    }
  }

  const enriched = (connections || []).map((c: Connection) => {
    const otherId = c.user_low === userId ? c.user_high : c.user_low;
    return {
      ...c,
      otherUser: profiles[otherId] || { user_id: otherId, display_name: null, avatar_url: null, tier: 'free' },
      isInitiator: c.initiated_by === userId,
    };
  });

  const res = NextResponse.json({ connections: enriched });
  return applyRateLimitHeaders(res, result);
}
