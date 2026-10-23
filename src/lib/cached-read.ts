// src/lib/cached-read.ts
//
// Helper for caching PUBLIC directory reads in pages that must stay dynamic.
//
// WHY THIS EXISTS (2026-10-23, Singapore traffic incident + perf audit)
//
// A Next.js page that reads `searchParams` is treated as DYNAMIC. Its
// `export const revalidate = 300` is then silently ignored — production serves
// `cache-control: private, no-cache, no-store` with `x-vercel-cache: MISS` on
// every request, so every hit re-renders the page and re-queries the database.
//
// This was measured on /directory/nhl/schedule: 74,971 bot requests in one
// day, each triggering a full server-side DB query (~270ms). The same shape
// affects the other public directory pages that filter via query params.
//
// ROUTE-LEVEL `revalidate` CANNOT FIX THIS. A dynamic route ignores it.
// What CAN be cached is the DATA READ — so we memoize the read itself with
// `unstable_cache`, keyed by the arguments that affect the result.
//
// SAFETY CONTRACT — read before using
//
// `cachedPublicRead` is ONLY for reads of PUBLIC, SHARED data:
//   - directory listings (rinks, teams, players, leagues)
//   - schedules, scores, standings
//   - anything any anonymous visitor can already see on the public site
//
// It must NOT be used for:
//   - anything user-specific (auth, session, per-user entitlements)
//   - anything that must be fresh within seconds (live scores, if you need
//     sub-second freshness — pick a shorter TTL)
//   - writes or anything with side effects
//
// The cache key MUST include every argument that changes the result. If you
// add a parameter to the underlying query, add it to the key too — a stale
// key is a silent wrong answer, which is the same failure family as the
// PostgREST `limit` cap.
//
// Default TTL: 5 minutes (300s), matching the `revalidate` value the affected
// pages already declare (and which was being ignored anyway).

import { unstable_cache } from 'next/cache';

/**
 * Memoize a public data read for `ttlSeconds`.
 *
 * @param fn        the actual read. Must return only public/shared data.
 * @param keyParts  every input that affects the result. These become the
 *                  cache key, so two calls with different args never collide.
 * @param ttlSeconds cache lifetime in seconds (default 300).
 * @param tags      optional cache tags for targeted invalidation.
 */
export function cachedPublicRead<T>(
  fn: () => Promise<T>,
  keyParts: Array<string | number | boolean | null | undefined>,
  ttlSeconds = 300,
  tags?: string[],
): Promise<T> {
  // Normalize the key so undefined/null collapse to a single stable value and
  // the key is deterministic regardless of argument order.
  //
  // The TYPE is included because `1` (number) and `'1'` (string) are different
  // query values: a limit of 1 and a country code of '1' must not share a
  // cache entry. Collapsing them would serve one filter's results for the
  // other — the same failure family as the PostgREST `limit` cap, where
  // something looks like it works and silently returns the wrong answer.
  const normalized = keyParts.map((p) => {
    if (p === null || p === undefined) return 'null';
    if (typeof p === 'boolean') return p ? 'b:1' : 'b:0';
    if (typeof p === 'number') return `n:${p}`;
    return `s:${p}`;
  });

  return unstable_cache(fn, ['public-read', ...normalized], {
    revalidate: ttlSeconds,
    ...(tags && tags.length > 0 ? { tags } : {}),
  })();
}

/**
 * Standard tags for the public directory reads.
 *
 * `directory` covers rink/team/player/league listings.
 * `schedule` covers fixtures, scores and standings.
 */
export const PUBLIC_READ_TAGS = {
  directory: ['public-directory'],
  schedule: ['public-schedule'],
} as const;
