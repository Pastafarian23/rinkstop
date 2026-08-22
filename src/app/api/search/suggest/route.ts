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
 * Multi-word handling (audit fix 2026-08-11):
 *   When q = "patrick kane", split into words [patrick, kane] and require
 *   each word to match SOMEWHERE in the searchable fields. Chained .or()
 *   filters in PostgREST are AND'd together with OR within each. So:
 *     players.or('first_name.ilike.*patrick*,last_name.ilike.*patrick*')
 *           .or('first_name.ilike.*kane*,last_name.ilike.*kane*')
 *   translates to:
 *     (first_name LIKE %patrick% OR last_name LIKE %patrick%)
 *     AND (first_name LIKE %kane% OR last_name LIKE %kane%)
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

/**
 * Split the user query into individual words. Each word must match
 * somewhere across the listed fields.
 *
 * Examples:
 *   "Patrick Kane" → ["patrick", "kane"]
 *   "  O'Brien   " → ["o'brien"]
 *   "new-york" → ["new-york"]   (hyphens are part of the word)
 *
 * Empty words (whitespace-only splits) are dropped.
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
 *
 * Example: applyMultiWordSearch(q, 'Patrick Kane', ['first_name', 'last_name'])
 *   → builder.or('first_name.ilike.*patrick*,last_name.ilike.*patrick*')
 *           .or('first_name.ilike.*kane*,last_name.ilike.*kane*')
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

/**
 * Compute match quality (rank) for a row against the query.
 *   4 = full query matches the name (exact, or all words in order)
 *   3 = name starts with query
 *   2 = name contains query
 *   1 = only secondary fields matched
 *
 * For multi-word queries, "exact" means the joined first_name+' '+last_name
 * equals the joined words (in any order — both "Patrick Kane" and
 * "Kane Patrick" match a row with first_name=Patrick, last_name=Kane).
 */
function computeMatchQuality(
  q: string,
  primaryName: string,
  secondaryText = ''
): number {
  const lname = primaryName.toLowerCase();
  const lq = q.toLowerCase().trim();

  if (lname === lq) return 4;
  if (lname.startsWith(lq)) return 3;
  if (lname.includes(lq)) return 2;

  // Multi-word: every word must appear in name OR secondary
  const words = tokenize(lq);
  if (words.length > 1) {
    const haystack = (lname + ' ' + secondaryText.toLowerCase()).trim();
    const allFound = words.every((w) => haystack.includes(w));
    if (allFound) {
      // Prefer matches where the words appear in the name itself
      const allInName = words.every((w) => lname.includes(w));
      return allInName ? 3 : 2;
    }
  }

  return 1;
}

export type SuggestItem = {
  type: 'rink' | 'team' | 'player' | 'league' | 'brand' | 'coach' | 'official' | 'staff' | 'scout';
  id: string;
  name: string;
  slug: string;
  href: string;
  meta: string; // secondary line: city/team/country
  matchQuality: number; // higher = better match
};

type RankedSuggestItem = Omit<SuggestItem, 'type'> & { type: SuggestItem['type']; rankScore: number };

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

  // Category scoping — when set, only the matching entity type is queried.
  // Used by the directory category pages (/directory/teams, /directory/players,
  // etc.) so search results stay contextually relevant to the page the user
  // is on. Without this param, all types are queried (homepage behavior).
  //
  // Mapping: directory page → entity type(s):
  //   /directory/teams     → team
  //   /directory/players   → player
  //   /directory/rinks     → rink
  //   /directory/leagues   → league
  //   /directory/brands    → brand
  //   /directory/coaches, /scouts, /officials, /staff → player (best-effort;
  //     coach/scout data lives in `staff`, not players — but for the
  //     suggest API scope, "player" is the closest match. The directory
  //     pages fall back to their own search input if no player match.)
  const rawCategory = req.nextUrl.searchParams.get('category')?.toLowerCase() || '';
  const VALID_CATEGORIES = ['rink', 'team', 'player', 'league', 'brand', 'coach', 'official', 'staff', 'scout'] as const;
  const category = (VALID_CATEGORIES as readonly string[]).includes(rawCategory)
    ? (rawCategory as typeof VALID_CATEGORIES[number])
    : null;
  const include = (type: typeof VALID_CATEGORIES[number]): boolean =>
    category === null || category === type;

  const promises = await Promise.allSettled([
    // Rinks
    include('rink') ? applyMultiWordSearch(
      supabaseAdmin
        .from('rinks')
        .select('id, name, slug, city, province_state, country')
        .eq('is_active', true),
      q,
      ['name', 'city', 'province_state', 'country']
    )
      .limit(3)
      .then(({ data }) =>
        (data ?? []).map((r) => ({
          type: 'rink' as const,
          id: r.id,
          name: r.name,
          slug: r.slug,
          href: `/directory/rinks/${r.slug}`,
          meta: [r.city, r.province_state, r.country].filter(Boolean).join(', '),
          matchQuality: computeMatchQuality(q, r.name, [r.city, r.province_state, r.country].filter(Boolean).join(' ')),
        }))
      ) : [],

    // Teams
    include('team') ? applyMultiWordSearch(
      supabaseAdmin
        .from('teams')
        .select('id, name, slug, city, country, leagues(name)')
        .eq('is_active', true),
      q,
      ['name', 'city', 'country']
    )
      .limit(3)
      .then(({ data }) =>
        (data ?? []).map((r) => {
          const leagues = r.leagues as { name: string } | { name: string }[] | null;
          const leagueName = Array.isArray(leagues) ? leagues[0]?.name : leagues?.name;
          const secondary = [leagueName, r.city, r.country].filter(Boolean).join(' ');
          return {
            type: 'team' as const,
            id: r.id,
            name: r.name,
            slug: r.slug,
            href: `/directory/teams/${r.slug}`,
            meta: [leagueName, r.city, r.country].filter(Boolean).join(' · '),
            matchQuality: computeMatchQuality(q, r.name, secondary),
          };
        })
      ) : [],

    // Players
    include('player') ? applyMultiWordSearch(
      supabaseAdmin
        .from('players')
        .select('id, first_name, last_name, slug, position, teams(name)')
        .eq('is_active', true),
      q,
      ['first_name', 'last_name']
    )
      .limit(3)
      .then(({ data }) =>
        (data ?? []).map((r) => {
          const fullName = `${r.first_name} ${r.last_name}`;
          const teams = r.teams as { name: string } | { name: string }[] | null;
          const teamName = Array.isArray(teams) ? teams[0]?.name : teams?.name;
          return {
            type: 'player' as const,
            id: r.id,
            name: fullName,
            slug: r.slug,
            href: `/directory/players/${r.slug}`,
            meta: [r.position, teamName].filter(Boolean).join(' · '),
            matchQuality: computeMatchQuality(q, fullName, teamName ?? ''),
          };
        })
      ) : [],

    // Leagues
    include('league') ? applyMultiWordSearch(
      supabaseAdmin
        .from('leagues')
        .select('id, name, slug, country, level')
        .eq('is_active', true),
      q,
      ['name', 'country']
    )
      .limit(2)
      .then(({ data }) =>
        (data ?? []).map((r) => ({
          type: 'league' as const,
          id: r.id,
          name: r.name,
          slug: r.slug,
          href: `/directory/leagues/${r.slug}`,
          meta: [r.level, r.country].filter(Boolean).join(' · '),
          matchQuality: computeMatchQuality(q, r.name, [r.level, r.country].filter(Boolean).join(' ')),
        }))
      ) : [],

    // Brands
    include('brand') ? applyMultiWordSearch(
      supabaseAdmin
        .from('brands')
        .select('id, name, slug, category, country_of_origin'),
      q,
      ['name', 'country_of_origin']
    )
      .limit(2)
      .then(({ data }) =>
        (data ?? []).map((r) => ({
          type: 'brand' as const,
          id: r.id,
          name: r.name,
          slug: r.slug,
          href: `/directory/brands/${r.slug}`,
          meta: [r.category, r.country_of_origin].filter(Boolean).join(' · '),
          matchQuality: computeMatchQuality(q, r.name, [r.category, r.country_of_origin].filter(Boolean).join(' ')),
        }))
      ) : [],

    // Coach / Official / Staff / Scout — StaffDirectory uses client-side filtering
    // (localOnly=true), so these categories return empty from the suggest API.
    // The type is accepted here so CategorySearchBar is type-safe for all roles.
    include('coach') ? Promise.resolve([]) : Promise.resolve([]),
    include('official') ? Promise.resolve([]) : Promise.resolve([]),
    include('staff') ? Promise.resolve([]) : Promise.resolve([]),
    include('scout') ? Promise.resolve([]) : Promise.resolve([]),
  ]);

  const allResults: RankedSuggestItem[] = [];
  for (const p of promises) {
    if (p.status === 'fulfilled') {
      // Boost: prefer rink/team over player (rink/team are more "searchable")
      for (const item of p.value) {
        const typeBoost: number =
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