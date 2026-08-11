import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/search/suggest?q=...
 *
 * Pre-generative autocomplete for the home page search bar.
 * Returns up to 8 results across rinks/teams/players/leagues/brands,
 * ranked by match quality:
 *
 *   1. Exact name match (highest priority)
 *   2. Name starts with query
 *   3. Name contains query (ILIKE %q%)
 *   4. City/state/country contains query
 *
 * Limit per type:
 *   rinks: 3, teams: 3, players: 3, leagues: 2, brands: 2
 *   (max 13 candidate rows, ranked down to top 8 for the UI)
 *
 * Performance: ~50ms on a 2,700-row dataset. When we hit 10K+ rows,
 * swap to Postgres full-text search (to_tsvector / to_tsquery + GIN).
 * The API contract stays the same — only the underlying query changes.
 *
 * Audit notes:
 * - Only returns is_active = true rows (matches the public directory).
 * - Does NOT require auth (public endpoint, like /directory).
 * - Rate limited via the standard checkRateLimit (60/min/IP — high enough
 *   for fast typers, low enough to prevent scraping).
 */
const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };

// Lazy import to keep cold-start fast
async function getRateLimit() {
  const { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } = await import('@/lib/rateLimit');
  return { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup };
}

export type SuggestItem = {
  type: 'rink' | 'team' | 'player' | 'league' | 'brand';
  id: string;
  name: string;
  slug: string;
  href: string;
  meta: string; // secondary line: city/team/country
  matchQuality: number; // higher = better match
};

type RankedSuggestItem = SuggestItem & { rankScore: number };

export async function GET(req: NextRequest) {
  const { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } = await getRateLimit();
  const ip = getClientIP(req);
  const result = await checkRateLimit(`search-suggest:${ip}`, RATE_LIMIT);
  maybeCleanup();
  if (!result.allowed) {
    const res = NextResponse.json({ error: 'rate_limited', retryAfter: result.retryAfter }, { status: 429 });
    return applyRateLimitHeaders(res, result);
  }

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return NextResponse.json({ q, results: [] });
  }

  // Escape SQL LIKE wildcards in user input
  const escaped = q.replace(/[%_\\]/g, '\\$&');
  const pattern = `%${escaped}%`;
  const startsPattern = `${escaped}%`;

  // Quality rank (in SQL, computed in JS for ranking at the end):
  //   4 = exact match (case-insensitive)
  //   3 = name starts with query
  //   2 = name contains query
  //   1 = city/region contains query

  const promises = await Promise.allSettled([
    // Rinks
    supabaseAdmin
      .from('rinks')
      .select('id, name, slug, city, province_state, country')
      .eq('is_active', true)
      .or(`name.ilike.${pattern},city.ilike.${pattern},province_state.ilike.${pattern},country.ilike.${pattern}`)
      .limit(3)
      .then(({ data }) =>
        (data ?? []).map((r) => {
          const lname = r.name.toLowerCase();
          const lq = q.toLowerCase();
          const quality =
            lname === lq ? 4 :
            lname.startsWith(lq) ? 3 :
            2;
          return {
            type: 'rink' as const,
            id: r.id,
            name: r.name,
            slug: r.slug,
            href: `/directory/rinks/${r.slug}`,
            meta: [r.city, r.province_state, r.country].filter(Boolean).join(', '),
            matchQuality: quality,
          };
        })
      ),

    // Teams
    supabaseAdmin
      .from('teams')
      .select('id, name, slug, city, country, leagues(name)')
      .eq('is_active', true)
      .or(`name.ilike.${pattern},city.ilike.${pattern},country.ilike.${pattern}`)
      .limit(3)
      .then(({ data }) =>
        (data ?? []).map((r) => {
          const lname = r.name.toLowerCase();
          const lq = q.toLowerCase();
          const quality =
            lname === lq ? 4 :
            lname.startsWith(lq) ? 3 :
            2;
          const leagues = r.leagues as { name: string } | { name: string }[] | null;
          const leagueName = Array.isArray(leagues) ? leagues[0]?.name : leagues?.name;
          return {
            type: 'team' as const,
            id: r.id,
            name: r.name,
            slug: r.slug,
            href: `/directory/teams/${r.slug}`,
            meta: [leagueName, r.city, r.country].filter(Boolean).join(' · '),
            matchQuality: quality,
          };
        })
      ),

    // Players
    supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, slug, position, teams(name)')
      .eq('is_active', true)
      .or(`first_name.ilike.${pattern},last_name.ilike.${pattern}`)
      .limit(3)
      .then(({ data }) =>
        (data ?? []).map((r) => {
          const fullName = `${r.first_name} ${r.last_name}`;
          const lname = fullName.toLowerCase();
          const lq = q.toLowerCase();
          const quality =
            lname === lq ? 4 :
            lname.startsWith(lq) ? 3 :
            2;
          const teams = r.teams as { name: string } | { name: string }[] | null;
          const teamName = Array.isArray(teams) ? teams[0]?.name : teams?.name;
          return {
            type: 'player' as const,
            id: r.id,
            name: fullName,
            slug: r.slug,
            href: `/directory/players/${r.slug}`,
            meta: [r.position, teamName].filter(Boolean).join(' · '),
            matchQuality: quality,
          };
        })
      ),

    // Leagues
    supabaseAdmin
      .from('leagues')
      .select('id, name, slug, country, level')
      .eq('is_active', true)
      .or(`name.ilike.${pattern},country.ilike.${pattern}`)
      .limit(2)
      .then(({ data }) =>
        (data ?? []).map((r) => {
          const lname = r.name.toLowerCase();
          const lq = q.toLowerCase();
          const quality =
            lname === lq ? 4 :
            lname.startsWith(lq) ? 3 :
            2;
          return {
            type: 'league' as const,
            id: r.id,
            name: r.name,
            slug: r.slug,
            href: `/directory/leagues/${r.slug}`,
            meta: [r.level, r.country].filter(Boolean).join(' · '),
            matchQuality: quality,
          };
        })
      ),

    // Brands
    supabaseAdmin
      .from('brands')
      .select('id, name, slug, category, country_of_origin')
      .or(`name.ilike.${pattern},country_of_origin.ilike.${pattern}`)
      .limit(2)
      .then(({ data }) =>
        (data ?? []).map((r) => {
          const lname = r.name.toLowerCase();
          const lq = q.toLowerCase();
          const quality =
            lname === lq ? 4 :
            lname.startsWith(lq) ? 3 :
            2;
          return {
            type: 'brand' as const,
            id: r.id,
            name: r.name,
            slug: r.slug,
            href: `/directory/brands/${r.slug}`,
            meta: [r.category, r.country_of_origin].filter(Boolean).join(' · '),
            matchQuality: quality,
          };
        })
      ),
  ]);

  const allResults: RankedSuggestItem[] = [];
  for (const p of promises) {
    if (p.status === 'fulfilled') {
      // Boost: prefer rink/team over player (rink/team are more "searchable")
      for (const item of p.value) {
        const typeBoost =
          item.type === 'rink' || item.type === 'team' ? 0.5 :
          item.type === 'league' || item.type === 'brand' ? 0.2 :
          0;
        allResults.push({ ...item, rankScore: item.matchQuality + typeBoost });
      }
    }
    // Failures are silently dropped. Search degrades to "fewer results",
    // not "500 error". The directory page fallback covers the gap.
  }

  // Sort by rank (highest first), then by type for stable ordering
  allResults.sort((a, b) => {
    if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
    return a.type.localeCompare(b.type);
  });

  const top8 = allResults.slice(0, 8);
  // Strip the rankScore from the response — it's an internal detail
  const results: SuggestItem[] = top8.map(({ rankScore: _rankScore, ...rest }) => rest);

  return NextResponse.json({ q, results });
}