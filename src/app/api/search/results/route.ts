import { NextRequest, NextResponse } from 'next/server';
import { clampSearchPage, typeHasMore, SEARCH_PAGE_SIZE } from '@/lib/search-paging';
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
  // Present on paged responses: whether more rows exist for each type.
  page?: {
    type: 'rink' | 'team' | 'player' | 'league' | 'brand' | null;
    offset: number;
    limit: number;
    hasMore: Record<'rink' | 'team' | 'player' | 'league' | 'brand', boolean>;
  };
};

// Per-type page size. Each type pages independently via `type` + `offset`;
// totals are exact server counts, so no matching record is hidden by a cap.
const PAGE_SIZE = SEARCH_PAGE_SIZE;

type SearchType = 'rink' | 'team' | 'player' | 'league' | 'brand';
const SEARCH_TYPES: SearchType[] = ['rink', 'team', 'player', 'league', 'brand'];

interface TypeResult<T> {
  count: number;
  rows: T[];
}

function settled<T>(r: PromiseSettledResult<TypeResult<T>>): TypeResult<T> {
  return r.status === 'fulfilled' ? r.value : { count: 0, rows: [] };
}

export async function GET(req: NextRequest) {
  const { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } = await getRateLimit();
  const ip = getClientIP(req);
  const result = await checkRateLimit(`search-results:${ip}`, RATE_LIMIT);
  maybeCleanup();
  if (!result.allowed) {
    const res = NextResponse.json({ error: 'rate_limited', retryAfter: result.retryAfter }, { status: 429 });
    return applyRateLimitHeaders(res, result);
  }

  const sp = req.nextUrl.searchParams;
  const q = (sp.get('q') ?? '').trim();
  if (q.length < 2) {
    const empty: SearchResultsResponse = {
      q,
      totals: { rink: 0, team: 0, player: 0, league: 0, brand: 0, all: 0 },
      results: { rink: [], team: [], player: [], league: [], brand: [] },
    };
    return NextResponse.json(empty);
  }

  const typeParam = sp.get('type') as SearchType | null;
  const only: SearchType | null = typeParam && SEARCH_TYPES.includes(typeParam) ? typeParam : null;
  const { offset, limit } = clampSearchPage(sp.get('limit'), sp.get('offset'));
  const from = offset;
  const to = offset + limit - 1;
  const want = (t: SearchType) => !only || only === t;
  const none = Promise.resolve({ count: 0, rows: [] as never[] });

  // Each query returns the exact count plus one page. Ordering ends with id so
  // consecutive pages never repeat or skip a row that shares a sort key.
  const [rinkRes, teamRes, playerRes, leagueRes, brandRes] = await Promise.allSettled([
    want('rink')
      ? applyMultiWordSearch(
          supabaseAdmin
            .from('rinks')
            .select('id, name, slug, city, province_state, country', { count: 'exact' })
            .eq('is_active', true),
          q,
          ['name', 'city', 'province_state', 'country']
        )
          .order('name', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to)
          .then(({ data, count }) => ({
            count: count ?? 0,
            rows: (data ?? []).map((r) => ({
              type: 'rink' as const,
              id: r.id,
              name: r.name,
              slug: r.slug,
              href: `/directory/rinks/${r.slug}`,
              meta: [r.city, r.province_state, r.country].filter(Boolean).join(', '),
            })),
          }))
      : none,

    want('team')
      ? applyMultiWordSearch(
          supabaseAdmin
            .from('team_workspaces')
            .select('id, name, slug, home_city, home_country, leagues(name)', { count: 'exact' })
            .eq('is_active', true),
          q,
          ['name', 'home_city', 'home_country']
        )
          .order('name', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to)
          .then(({ data, count }) => ({
            count: count ?? 0,
            rows: (data ?? []).map((r) => {
              const leagues = r.leagues as { name: string } | { name: string }[] | null;
              const leagueName = Array.isArray(leagues) ? leagues[0]?.name : leagues?.name;
              return {
                type: 'team' as const,
                id: r.id,
                name: r.name,
                slug: r.slug,
                href: `/directory/teams/${r.slug}`,
                meta: [leagueName, r.home_city, r.home_country].filter(Boolean).join(' · '),
              };
            }),
          }))
      : none,

    want('player')
      ? applyMultiWordSearch(
          supabaseAdmin
            .from('players')
            .select('id, first_name, last_name, slug, position, team_workspaces(name)', { count: 'exact' })
            .eq('is_active', true),
          q,
          ['first_name', 'last_name']
        )
          .order('last_name', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to)
          .then(({ data, count }) => ({
            count: count ?? 0,
            rows: (data ?? []).map((r) => {
              const teams = r.team_workspaces as { name: string } | { name: string }[] | null;
              const teamName = Array.isArray(teams) ? teams[0]?.name : teams?.name;
              return {
                type: 'player' as const,
                id: r.id,
                name: `${r.first_name} ${r.last_name}`,
                slug: r.slug,
                href: `/directory/players/${r.slug}`,
                meta: [r.position, teamName].filter(Boolean).join(' · '),
              };
            }),
          }))
      : none,

    want('league')
      ? applyMultiWordSearch(
          supabaseAdmin
            .from('leagues')
            .select('id, name, slug, country, level', { count: 'exact' })
            .eq('is_active', true),
          q,
          ['name', 'country']
        )
          .order('name', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to)
          .then(({ data, count }) => ({
            count: count ?? 0,
            rows: (data ?? []).map((r) => ({
              type: 'league' as const,
              id: r.id,
              name: r.name,
              slug: r.slug,
              href: `/directory/leagues/${r.slug}`,
              meta: [r.level, r.country].filter(Boolean).join(' · '),
            })),
          }))
      : none,

    want('brand')
      ? applyMultiWordSearch(
          supabaseAdmin
            .from('brands')
            .select('id, name, slug, category, country_of_origin', { count: 'exact' }),
          q,
          ['name', 'country_of_origin']
        )
          .order('name', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to)
          .then(({ data, count }) => ({
            count: count ?? 0,
            rows: (data ?? []).map((r) => ({
              type: 'brand' as const,
              id: r.id,
              name: r.name,
              slug: r.slug,
              href: `/directory/brands/${r.slug}`,
              meta: [r.category, r.country_of_origin].filter(Boolean).join(' · '),
            })),
          }))
      : none,
  ]);

  // Failures show as zero results for that type rather than a 500.
  const rink = settled(rinkRes);
  const team = settled(teamRes);
  const player = settled(playerRes);
  const league = settled(leagueRes);
  const brand = settled(brandRes);

  const hasMoreFor = (t: TypeResult<unknown>) => typeHasMore(offset, t.rows.length, t.count);

  const response = {
    q,
    totals: {
      rink: rink.count,
      team: team.count,
      player: player.count,
      league: league.count,
      brand: brand.count,
      all: rink.count + team.count + player.count + league.count + brand.count,
    },
    results: {
      rink: rink.rows,
      team: team.rows,
      player: player.rows,
      league: league.rows,
      brand: brand.rows,
    },
    // Paging: request the next slice of one type with ?type=<type>&offset=<next>.
    page: {
      type: only,
      offset,
      limit,
      hasMore: {
        rink: hasMoreFor(rink),
        team: hasMoreFor(team),
        player: hasMoreFor(player),
        league: hasMoreFor(league),
        brand: hasMoreFor(brand),
      },
    },
  };

  return NextResponse.json(response);
}
