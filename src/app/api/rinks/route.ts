import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { enrichEntitiesWithClaimTier } from '@/lib/listingTier';
import { parsePageParams } from '@/lib/rinks-list';
import { fetchRinkListPage, RINK_LIST_COLUMNS } from '@/lib/rinks-query';

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

  // Single-record lookups (unchanged behaviour).
  if (id || slug) {
    // Explicit column list, not select('*') — see the note in /api/teams:
    // the contact-details hardening revoked table-level SELECT from anon on
    // `rinks`, so a star select is now a permission error.
    const base = supabase.from('rinks').select(RINK_LIST_COLUMNS);
    const { data, error } = id
      ? await base.eq('id', id).limit(1)
      : await base.eq('slug', slug as string).limit(1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const response = NextResponse.json(data?.[0] ?? null);
    response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600');
    return applyRateLimitHeaders(response, result);
  }

  // List mode: offset pagination, exact total, full-dataset search, server-side tier order.
  const country = searchParams.get('country');
  const city = searchParams.get('city');
  const search = searchParams.get('search');
  const sort = searchParams.get('sort') || 'name';
  const activeOnly = searchParams.get('activeOnly') !== 'false';
  const verifiedOnly = searchParams.get('verifiedOnly') === '1';
  const page = parsePageParams(searchParams.get('limit'), searchParams.get('offset'));

  let list;
  try {
    list = await fetchRinkListPage({ country, city, search, activeOnly, sort, verifiedOnly, page });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  const response = NextResponse.json(list);
  // 2026-06-11: Vercel Hobby limit reduction — cache at CDN for 5min, allow stale 10x longer
  // This cuts function invocations on bot crawls from O(requests) to O(cache-misses).
  response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600');
  return applyRateLimitHeaders(response, result);
}
