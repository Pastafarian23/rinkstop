import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/search/results?q=...
 *
 * Full search results for /directory?q=... (the page that the HomeSearch
 * fallback redirects to). Returns ALL matching rows (up to 50 per type)
 * plus per-type counts so the UI can render "Showing N of M rinks".
 *
 * Multi-word handling (audit fix 2026-08-11):
 *   When q = "patrick kane", split into words [patrick, kane] and require
 *   each word to match SOMEWHERE in the searchable fields. Chained .or()
 *   filters in PostgREST are AND'd together with OR within each. This
 *   matches "Patrick Kane", "Kane Patrick", and any row with "Patrick"
 *   in one field and "Kane" in another.
 *
 * Differs from /api/search/suggest:
 *   - suggest: top 8 results, no counts, fast autocomplete
 *   - results: all matching rows, per-type counts, for the full results page
 *
 * Both endpoints share the same multi-word ILIKE strategy. When we
 * migrate to Postgres FTS, only the underlying query changes — the
 * API contract is stable.
 *
 * Public endpoint (no auth). Rate-limited at 30/min/IP (lower than suggest
 * because it returns more data).
 */
const RATE_LIMIT = { maxRequests: 30, windowMs: 60 * 1000 };

async function getRateLimit() {
  const { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } = await import('@/lib/rateLimit');
  return { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup };
}

/**
 * Split the user query into individual words. Empty words (whitespace-
 * only splits) are dropped. Hyphens are kept as part of the word
 * ("new-york" stays a single token).
 */
function tokenize(q: string): string[] {
  return q
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

/**
 * Escape SQL LIKE wildcards (% and _) in user input. Prevents users
 * from accidentally (or intentionally) using LIKE metacharacters.
 */
function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, '\\$&');
}

/**
 * Apply a multi-word ILIKE filter to a Supabase query builder.
 * Each word in the query must match at least one of the listed fields.
 * Words are AND'd together; fields within a word are OR'd together.
 *
 * Implementation: chain multiple .or() calls on the builder. PostgREST
 * treats chained .or() filters as AND, while OR-ing the comma-separated
 * alternatives within each .or().
 */
function applyMultiWordSearch<T extends { or: (s: string) => T }>(
  builder: T,
  q: string,
  fields: string[]
): T {
  const words = tokenize(q);
  let cur = builder;
  for (const word of words) {
    const escaped = escapeLike(word);
    const alternatives = fields.map((f) => `${f}.ilike.%${escaped}%`).join(',');
    cur = cur.or(alternatives) as T;
  }
  return cur;
}

export type ResultItem = {
  type: 'rink' | 'team' | 'player' | 'league' | 'brand';
  id: string;
  name: string;
  slug: string;
  href: string;
  meta: string;
};

export type SearchResultsResponse = {
  q: string;
  totals: { rink: number; team: number; player: number; league: number; brand: number; all: number };
  results: Record<'rink' | 'team' | 'player' | 'league' | 'brand', ResultItem[]>;
};

const MAX_PER_TYPE = 50;

export async function GET(req: NextRequest) {
  const { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } = await getRateLimit();
  const ip = getClientIP(req);
  const result = await checkRateLimit(`search-results:${ip}`, RATE_LIMIT);
  maybeCleanup();
  if (!result.allowed) {
    const res = NextResponse.json({ error: 'rate_limited', retryAfter: result.retryAfter }, { status: 429 });
    return applyRateLimitHeaders(res, result);
  }

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    const empty: SearchResultsResponse = {
      q,
      totals: { rink: 0, team: 0, player: 0, league: 0, brand: 0, all: 0 },
      results: { rink: [], team: [], player: [], league: [], brand: [] },
    };
    return NextResponse.json(empty);
  }

  // Run 5 parallel queries. Each returns a typed result.
  const [rinkRes, teamRes, playerRes, leagueRes, brandRes] = await Promise.allSettled([
    applyMultiWordSearch(
      supabaseAdmin
        .from('rinks')
        .select('id, name, slug, city, province_state, country')
        .eq('is_active', true),
      q,
      ['name', 'city', 'province_state', 'country']
    )
      .order('name', { ascending: true })
      .limit(MAX_PER_TYPE)
      .then(({ data }) =>
        (data ?? []).map((r) => ({
          type: 'rink' as const,
          id: r.id,
          name: r.name,
          slug: r.slug,
          href: `/directory/rinks/${r.slug}`,
          meta: [r.city, r.province_state, r.country].filter(Boolean).join(', '),
        }))
      ),

    applyMultiWordSearch(
      supabaseAdmin
        .from('teams')
        .select('id, name, slug, city, country, leagues(name)')
        .eq('is_active', true),
      q,
      ['name', 'city', 'country']
    )
      .order('name', { ascending: true })
      .limit(MAX_PER_TYPE)
      .then(({ data }) =>
        (data ?? []).map((r) => {
          const leagues = r.leagues as { name: string } | { name: string }[] | null;
          const leagueName = Array.isArray(leagues) ? leagues[0]?.name : leagues?.name;
          return {
            type: 'team' as const,
            id: r.id,
            name: r.name,
            slug: r.slug,
            href: `/directory/teams/${r.slug}`,
            meta: [leagueName, r.city, r.country].filter(Boolean).join(' · '),
          };
        })
      ),

    applyMultiWordSearch(
      supabaseAdmin
        .from('players')
        .select('id, first_name, last_name, slug, position, teams(name)')
        .eq('is_active', true),
      q,
      ['first_name', 'last_name']
    )
      .order('last_name', { ascending: true })
      .limit(MAX_PER_TYPE)
      .then(({ data }) =>
        (data ?? []).map((r) => {
          const teams = r.teams as { name: string } | { name: string }[] | null;
          const teamName = Array.isArray(teams) ? teams[0]?.name : teams?.name;
          return {
            type: 'player' as const,
            id: r.id,
            name: `${r.first_name} ${r.last_name}`,
            slug: r.slug,
            href: `/directory/players/${r.slug}`,
            meta: [r.position, teamName].filter(Boolean).join(' · '),
          };
        })
      ),

    applyMultiWordSearch(
      supabaseAdmin
        .from('leagues')
        .select('id, name, slug, country, level')
        .eq('is_active', true),
      q,
      ['name', 'country']
    )
      .order('name', { ascending: true })
      .limit(MAX_PER_TYPE)
      .then(({ data }) =>
        (data ?? []).map((r) => ({
          type: 'league' as const,
          id: r.id,
          name: r.name,
          slug: r.slug,
          href: `/directory/leagues/${r.slug}`,
          meta: [r.level, r.country].filter(Boolean).join(' · '),
        }))
      ),

    applyMultiWordSearch(
      supabaseAdmin
        .from('brands')
        .select('id, name, slug, category, country_of_origin'),
      q,
      ['name', 'country_of_origin']
    )
      .order('name', { ascending: true })
      .limit(MAX_PER_TYPE)
      .then(({ data }) =>
        (data ?? []).map((r) => ({
          type: 'brand' as const,
          id: r.id,
          name: r.name,
          slug: r.slug,
          href: `/directory/brands/${r.slug}`,
          meta: [r.category, r.country_of_origin].filter(Boolean).join(' · '),
        }))
      ),
  ]);

  // Failures default to empty arrays. The UI gracefully shows "0 results"
  // for that type rather than 500-ing.
  const rinks = rinkRes.status === 'fulfilled' ? rinkRes.value : [];
  const teams = teamRes.status === 'fulfilled' ? teamRes.value : [];
  const players = playerRes.status === 'fulfilled' ? playerRes.value : [];
  const leagues = leagueRes.status === 'fulfilled' ? leagueRes.value : [];
  const brands = brandRes.status === 'fulfilled' ? brandRes.value : [];

  const response: SearchResultsResponse = {
    q,
    totals: {
      rink: rinks.length,
      team: teams.length,
      player: players.length,
      league: leagues.length,
      brand: brands.length,
      all: rinks.length + teams.length + players.length + leagues.length + brands.length,
    },
    results: {
      rink: rinks,
      team: teams,
      player: players,
      league: leagues,
      brand: brands,
    },
  };

  return NextResponse.json(response);
}