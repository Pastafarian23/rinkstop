import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RL = { maxRequests: 60, windowMs: 60 * 1000 };

// GET /api/profiles/[userId]
// Returns a user's public profile (display_name, avatar, bio, tier).
// Tier details (stripe_customer_id, subscription_status) are NEVER returned to non-self callers.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const ip = getClientIP(request);
  const result = checkRateLimit(ip, RL);
  maybeCleanup();

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId required.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('user_id, display_name, bio, avatar_url, location, tier, tier_expires_at, is_founding_member, created_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[profiles GET] failed', error);
    return NextResponse.json({ error: 'Failed to load profile.' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  }

  const res = NextResponse.json({ profile: data });
  return applyRateLimitHeaders(res, result);
}
