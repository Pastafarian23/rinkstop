// src/app/api/manage/business/promotions/route.ts
//
// Organization Pro feature: Promotions API.
//
//   GET  /api/manage/business/promotions?listing_id=<uuid>
//     - List all promotions for the authenticated user's listing.
//   POST /api/manage/business/promotions
//     - Create a new promotion. Body: { listing_id, code, description,
//       discount_type, discount_value, starts_at, ends_at, max_redemptions }
//
// Auth: caller must own the listing AND have an Organization Pro tier
// (or higher). RLS already enforces listing ownership; tier check is
// a server-side guard for clarity in error messages.

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { tierAtLeast } from '@/lib/tier';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';



export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get('listing_id');
  if (!listingId) return NextResponse.json({ error: 'listing_id required' }, { status: 400 });

  // RLS will filter to the caller's listings.
  const { data, error } = await supabaseAdmin
    .from('business_promotions')
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ promotions: data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const cu = await currentUser();
  if (!session.userId || !cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = cu.id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const {
    listing_id,
    code,
    description,
    discount_type,
    discount_value,
    starts_at,
    ends_at,
    max_redemptions,
  } = body ?? {};

  if (!listing_id || !code || !discount_type || discount_value == null || !ends_at) {
    return NextResponse.json(
      { error: 'listing_id, code, discount_type, discount_value, ends_at are required' },
      { status: 400 }
    );
  }
  if (!['percent', 'fixed'].includes(discount_type)) {
    return NextResponse.json({ error: 'discount_type must be percent or fixed' }, { status: 400 });
  }
  if (typeof discount_value !== 'number' || discount_value <= 0) {
    return NextResponse.json({ error: 'discount_value must be a positive number' }, { status: 400 });
  }
  const codeNorm = String(code).trim().toUpperCase();
  if (codeNorm.length < 3 || codeNorm.length > 20 || !/^[A-Z0-9_-]+$/.test(codeNorm)) {
    return NextResponse.json(
      { error: 'code must be 3-20 chars, A-Z, 0-9, _, or -' },
      { status: 400 }
    );
  }
  const startsAt = starts_at ? new Date(starts_at) : new Date();
  const endsAt = new Date(ends_at);
  if (Number.isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: 'ends_at is not a valid date' }, { status: 400 });
  }
  if (endsAt <= startsAt) {
    return NextResponse.json({ error: 'ends_at must be after starts_at' }, { status: 400 });
  }

  // Verify caller owns the listing.
  const { data: listing, error: lErr } = await supabaseAdmin
    .from('listings')
    .select('id, owner_user_id')
    .eq('id', listing_id)
    .maybeSingle();
  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  if (listing.owner_user_id !== userId) {
    return NextResponse.json({ error: 'Not the listing owner' }, { status: 403 });
  }

  // Tier check: must be Organization Pro or higher.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('org_tier')
    .eq('user_id', userId)
    .maybeSingle();
  const tier = profile?.org_tier || 'org_free';
  if (!tierAtLeast(tier, 'org_pro')) {
    return NextResponse.json(
      { error: 'Promotions require an Organization Pro subscription', required_tier: 'org_pro', current_tier: tier },
      { status: 402 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('business_promotions')
    .insert({
      listing_id,
      owner_user_id: userId,
      code: codeNorm,
      description: description || null,
      discount_type,
      discount_value,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      max_redemptions: max_redemptions ?? null,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A promotion with that code already exists for this listing' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ promotion: data });
}
