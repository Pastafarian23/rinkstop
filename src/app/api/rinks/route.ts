import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { enrichEntitiesWithClaimTier, compareByTier } from '@/lib/listingTier';

// Rate limit: 60 requests per minute per IP for general rink queries
const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const result = checkRateLimit(ip, RATE_LIMIT);
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

  let query = supabase.from('rinks').select('*');

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
  let enrichedData = data;
  if (!id && !slug && data && data.length) {
    const tierMap = await enrichEntitiesWithClaimTier(supabaseAdmin, 'rink', data.map((d: any) => d.id));
    enrichedData = data.map((d: any) => {
      const claim = tierMap.get(d.id);
      return {
        ...d,
        claimed_by_tier: claim?.tier || null,
        claimed_by_user_id: claim?.user_id || null,
      };
    });
    if (sort === 'tier') {
      enrichedData.sort(compareByTier);
    }
  }

  const response = NextResponse.json(id || slug ? (data?.[0] ?? null) : { count: count ?? enrichedData?.length ?? 0, data: enrichedData });
  return applyRateLimitHeaders(response, result);
}