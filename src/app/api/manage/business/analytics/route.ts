// src/app/api/manage/business/analytics/route.ts
//
// Business Plus feature: Enhanced Analytics API.
//
//   GET /api/manage/business/analytics?listing_id=<uuid>&days=30
//     - Returns per-day rollup + 30-day summary for the listing.
//     - Only the listing owner can read.
//
// Auth: RLS on business_analytics_daily enforces ownership via the
// linked listings table.

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await auth();
  const cu = await currentUser();
  if (!session.userId || !cu) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = cu.id;

  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get('listing_id');
  const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10), 1), 365);
  if (!listingId) return NextResponse.json({ error: 'listing_id required' }, { status: 400 });

  // Verify ownership first (more informative than RLS deny).
  const { data: listing, error: lErr } = await supabaseAdmin
    .from('listings')
    .select('id, owner_user_id, business_name, listing_type, is_published, is_featured')
    .eq('id', listingId)
    .maybeSingle();
  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  if (listing.owner_user_id !== userId) {
    return NextResponse.json({ error: 'Not the listing owner' }, { status: 403 });
  }

  // 30-day summary via view
  const { data: summary, error: sErr } = await supabaseAdmin
    .from('business_analytics_summary')
    .select('*')
    .eq('listing_id', listingId)
    .maybeSingle();
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  // Per-day detail for the chart
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: daily, error: dErr } = await supabaseAdmin
    .from('business_analytics_daily')
    .select('date, page_views, unique_visitors, lead_form_submissions, favorite_count, review_count, phone_clicks, website_clicks, email_clicks, booking_inquiries')
    .eq('listing_id', listingId)
    .gte('date', since)
    .order('date', { ascending: true });
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

  return NextResponse.json({
    listing: {
      id: listing.id,
      business_name: listing.business_name,
      listing_type: listing.listing_type,
      is_published: listing.is_published,
      is_featured: listing.is_featured,
    },
    summary: summary || null,
    daily: daily || [],
  });
}
