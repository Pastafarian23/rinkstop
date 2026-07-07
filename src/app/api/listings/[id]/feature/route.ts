/**
 * /api/listings/[id]/feature
 *
 * Phase 1c-2 (Featured Placement).
 *
 * POST: { featured: boolean, duration_days?: number }
 *   - featured=true: set is_featured=true, featured_at=now, featured_until=now+duration_days
 *   - featured=false: clear is_featured and featured_at/until
 *
 * Tier-gated on Business Plus+ (matches the "Featured placement" promise
 * on /pricing for Business Plus).
 *
 * The owner of the listing (or an admin) can toggle. v1 has no payment
 * integration — the flag is self-service and free. v2 will gate behind
 * a payment flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId } from '@/lib/connections';
import { tierAtLeastSameTrack } from '@/lib/tier-gate';
import {
  checkRateLimit,
  getClientIP,
  applyRateLimitHeaders,
  maybeCleanup,
} from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function canFeature(tier: string | null | undefined): boolean {
  return tierAtLeastSameTrack(tier, 'business_listing');
}

const DEFAULT_DURATION_DAYS = 30;
const MAX_DURATION_DAYS = 90;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`listing-feature:${ip}`, { maxRequests: 20, windowMs: 60 * 1000 });
  maybeCleanup();

  const session = await auth();
  if (!session?.userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }
  const userId = await resolveCanonicalUserId(
    await requireUserId(),
    (await currentUser())?.emailAddresses?.[0]?.emailAddress || ''
  );
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  const { id: listingId } = await params;
  if (!listingId) {
    const res = NextResponse.json({ error: 'id_required' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine for a "drop featured" action
  }

  const featured = body?.featured === true;
  const durationDays = Math.min(
    Math.max(parseInt(String(body?.duration_days ?? DEFAULT_DURATION_DAYS), 10) || DEFAULT_DURATION_DAYS, 1),
    MAX_DURATION_DAYS
  );

  // Tier gate
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tier')
    .eq('user_id', userId)
    .maybeSingle();
  if (!canFeature((profile?.tier as string) ?? 'free')) {
    const res = NextResponse.json(
      { error: 'Featured placement requires Business Plus or higher.', code: 'tier_required' },
      { status: 403 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  // Verify ownership (admin override path is a v2 piece)
  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('id, owner_user_id')
    .eq('id', listingId)
    .maybeSingle();
  if (!listing) {
    const res = NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
    return applyRateLimitHeaders(res, rl);
  }
  if (listing.owner_user_id !== userId) {
    const res = NextResponse.json({ error: 'You do not own this listing.' }, { status: 403 });
    return applyRateLimitHeaders(res, rl);
  }

  // Build the update
  const now = new Date().toISOString();
  const update: Record<string, unknown> = featured
    ? {
        is_featured: true,
        featured_at: now,
        featured_until: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
        featured_by_user_id: userId,
        updated_at: now,
      }
    : {
        is_featured: false,
        featured_at: null,
        featured_until: null,
        featured_by_user_id: null,
        updated_at: now,
      };

  const { data: updated, error: updErr } = await supabaseAdmin
    .from('listings')
    .update(update)
    .eq('id', listingId)
    .select('id, is_featured, featured_at, featured_until, featured_by_user_id')
    .single();
  if (updErr || !updated) {
    console.error('[listing-feature] update failed:', updErr);
    const res = NextResponse.json({ error: updErr?.message || 'Update failed' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  const res = NextResponse.json({ ok: true, listing: updated });
  return applyRateLimitHeaders(res, rl);
}
