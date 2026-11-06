import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Rate limit: 60 requests per minute per IP. Counts are cheap, but we still
// guard against the public endpoint being scraped.
const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };

/**
 * GET /api/counts
 * Returns directory-level counts (rinks, teams, players, leagues) for the
 * home page and other UI surfaces that need to show "X+ rinks" type stats.
 *
 * Counts are cached in-process for 60s to avoid hammering Supabase on every
 * page render. The home page renders on every visit, so this matters.
 */
const COUNTS_TTL_MS = 60_000;
let cache: { ts: number; data: any } | null = null;

export async function GET(_request: NextRequest) {
  const ip = getClientIP(_request);
  const result = await checkRateLimit(`counts:${ip}`, RATE_LIMIT);
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

  // Cache hit
  if (cache && Date.now() - cache.ts < COUNTS_TTL_MS) {
    return NextResponse.json(cache.data, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' },
    });
  }

  // Parallel count queries. Use count:'exact' head:true to avoid pulling rows.
  const [rinksH, rinksGeo, rinksWithCap, teamsH, playersH, leaguesH, statsRpc] = await Promise.all([
    supabase.from('rinks').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('rinks').select('id', { count: 'exact', head: true })
      .eq('is_active', true).not('latitude', 'is', null).not('longitude', 'is', null),
    supabase.from('rinks').select('id', { count: 'exact', head: true })
      .eq('is_active', true).not('capacity', 'is', null),
    // 2026-11-06: count active + public team_workspaces, matching
    // get_directory_stats and the public /directory/teams list. Previously
    // this query had no is_active filter and returned 3,253 total rows.
    supabase.from('team_workspaces').select('id', { count: 'exact', head: true })
      .eq('is_active', true).eq('visibility', 'public'),
    supabase.from('players').select('id', { count: 'exact', head: true }).eq('is_active', true),
    // 2026-11-06: filter to active leagues only. Previously returned 298
    // (all rows) while get_directory_stats and the export both serve 294.
    supabase.from('leagues').select('id', { count: 'exact', head: true }).eq('is_active', true),
    // 2026-11-06: cities + countries now come from get_directory_stats, the
    // canonical RPC. The previous implementation pulled `teams.city` /
    // `teams.country` rows and de-duplicated them in JS — but Supabase's
    // PostgREST caps a select() at 1,000 rows with no error, so the Sets
    // were built from a TRUNCATED pull and reported 837 cities / 81
    // countries instead of the true 687 / 85. Same bug class as the
    // team_workspaces vs teams two-table trap.
    supabase.rpc('get_directory_stats'),
  ]);

  const s = (statsRpc.data || {}) as {
    city_count?: number; country_count?: number;
  };

  const data = {
    rinks: rinksH.count || 0,
    rinksWithGeo: rinksGeo.count || 0,
    rinksWithCapacity: rinksWithCap.count || 0,
    teams: teamsH.count || 0,
    players: playersH.count || 0,
    leagues: leaguesH.count || 0,
    cities: s.city_count ?? 0,
    countries: s.country_count ?? 0,
    asOf: new Date().toISOString(),
  };

  cache = { ts: Date.now(), data };
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' },
  });
}
