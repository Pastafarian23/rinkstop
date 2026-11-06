import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { enrichEntitiesWithClaimTier, compareByTier } from '@/lib/listingTier';

// Rate limit: 60 requests per minute per IP for general rink queries
const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`rinks:${ip}`, RATE_LIMIT);
  maybeCleanup();

  if (!result.allowed) {
    const response = new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please slow down.' }),
      { status: 429 }
    );
    applyRateLimitHeaders(response, result);
    response.headers.set('Content-Type', 'application/json');
    return response;
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const slug = searchParams.get('slug');
  const country = searchParams.get('country');
  const city = searchParams.get('city');
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const sort = searchParams.get('sort') || 'name';
  const activeOnly = searchParams.get('activeOnly') !== 'false';

  // Explicit column list, not select('*') — see the note in /api/teams:
  // the contact-details hardening revoked table-level SELECT from anon on
  // `rinks`, so a star select is now a permission error.
  let query = supabase.from('rinks').select(
    'id, name, slug, city, province_state, country, address, latitude, longitude, ' +
      'capacity, ice_size, surface_type, website_url, logo_url, is_active, created_at, ' +
      'updated_at, notes, source, status, cover_photo_url, place_id, opening_hours_json, ' +
      'google_website, google_maps_url, static_map_url, league, timezone, ' +
      'cover_photo_verified_at, cover_photo_source, seo_h1, seo_title, qr_identifier, ' +
      'verification_tier, qr_revoked_at, notes_generated, meta_description, claimable',
  );

  if (id) {
    query = query.eq('id', id).limit(1);
  } else if (slug) {
    query = query.eq('slug', slug).limit(1);
  } else {
    if (country) query = query.eq('country', country);
    if (city) query = query.ilike('city', `%${city}%`);
    if (activeOnly) query = query.eq('is_active', true);
    if (search) query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%`);
    query = query.limit(limit);
  }

  // Support sort=recent to return newest entries first
  // Support sort=tier to put Pro/Verified owners at the top (closes the 'Above search results' promise)
  const orderCol = sort === 'recent' ? 'created_at' : 'name';
  const { data, error, count } = await query.order(orderCol, { ascending: sort === 'recent' ? false : true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // For list responses (no id/slug), enrich with the active claimer's tier so the
  // directory can show "Verified owner" and sort by tier.
  let enrichedData = (data || []) as unknown as Array<Record<string, unknown> & { name?: string }>;
  if (!id && !slug && data && data.length) {
    const tierMap = await enrichEntitiesWithClaimTier(supabaseAdmin, 'rink', data.map((d: any) => d.id));
    enrichedData = data.map((d: any) => {
      const claim = tierMap.get(d.id);
      return {
        ...d,
        claimed_by_tier: claim?.tier || null,
        // 2026-10-22: the organization track lives in a separate column
        // (profiles.org_tier). Expose it so the directory can judge
        // verification/featured state from the effective entitlement
        // (best of personal and org) rather than the personal column only.
        claimed_by_org_tier: claim?.org_tier || null,
        claimed_by_user_id: claim?.user_id || null,
      };
    });
    if (sort === 'tier') {
      enrichedData.sort(compareByTier);
    }
  }

  const response = NextResponse.json(id || slug ? (data?.[0] ?? null) : { count: count ?? enrichedData?.length ?? 0, data: enrichedData });
  // 2026-06-11: Vercel Hobby limit reduction — cache at CDN for 5min, allow stale 10x longer
  // This cuts function invocations on bot crawls from O(requests) to O(cache-misses).
  response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600');
  return applyRateLimitHeaders(response, result);
}