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
  const [rinksH, rinksGeo, rinksWithCap, teamsH, playersH, leaguesH, citiesH, countriesH] = await Promise.all([
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
    // 2026-11-06: cities/countries now count the same canonical source as
    // get_directory_stats (the legacy `teams` table) so every marketing
    // surface shows the same number. Previously this unioned rinks + teams
    // and returned 837 cities / 82 countries while the RPC said 687 / 85.
    supabase.from('teams').select('city').eq('is_active', true).not('city', 'is', null),
    supabase.from('teams').select('country').eq('is_active', true).not('country', 'is', null),
  ]);

  const citySet = new Set<string>();
  for (const r of citiesH.data || []) if (r.city) citySet.add(r.city.trim().toLowerCase());
  const countrySet = new Set<string>();
  for (const r of countriesH.data || []) if (r.country) countrySet.add(r.country);

  const data = {
    rinks: rinksH.count || 0,
    rinksWithGeo: rinksGeo.count || 0,
    rinksWithCapacity: rinksWithCap.count || 0,
    teams: teamsH.count || 0,
    players: playersH.count || 0,
    leagues: leaguesH.count || 0,
    cities: citySet.size,
    countries: countrySet.size,
    asOf: new Date().toISOString(),
  };

  cache = { ts: Date.now(), data };
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' },
  });
}
