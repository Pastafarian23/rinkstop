import { NextResponse } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';
import { foldSlugToAscii, hasNonAscii } from './lib/ascii-slug';

// Per docs/CLEAN-POST-SLUGS-SPEC.md §6: post-slug redirect lookup runs at
// the top of the middleware chain, before rate limiting or auth. Slug
// redirects are nearly immutable (only change when a backfill runs), so
// we cache aggressively. Fail open: if Supabase errors, we serve the page
// (might 404) rather than break the site.
const SLUG_REDIRECT_TTL_SECONDS = 3600;
const SLUG_REDIRECT_SWR_SECONDS = 86400;

// Edge-runtime-safe supabase client. Uses the service role key to bypass
// RLS. The middleware runs in Vercel Edge, so we need the URL fetch
// pattern (not the realtime client). No SDK in the bundle — we hit the
// REST API directly with fetch.
async function lookupSlugRedirect(slug: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const endpoint = `${url}/rest/v1/post_slug_redirects?from_slug=eq.${encodeURIComponent(slug)}&select=to_slug&limit=1`;
    const res = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      // Edge runtime uses AbortSignal.timeout, not the options.timeout
      signal: AbortSignal.timeout(500),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ to_slug: string }>;
    if (rows.length === 0) return null;
    return rows[0].to_slug;
  } catch (e) {
    // Fail open. Log to console (Vercel Edge logs).
    console.error('[middleware] slug redirect lookup failed:', e);
    return null;
  }
}

async function lookupEntitySlugByUuid(
  table: 'players' | 'leagues' | 'team_workspaces' | 'rinks',
  uuid: string,
): Promise<string | null> {
  // 2026-09-04 BUG-PLAYER-UUID: UUID-based player URLs were returning
  // 200 with 'Player Not Found' due to an unresolved server-side issue
  // in the page render. Redirecting UUIDs to their canonical slug URL
  // was added as a structural fix.
  //
  // 2026-09-07: Same bug class discovered for leagues/teams/rinks — UUID
  // URLs were indexable in Google (522 impr / 0% CTR on a single OHL
  // UUID URL was the smoking gun). Generalized this helper to cover all
  // 4 entity tables. Each page handler accepts the URL segment as either
  // a UUID or a slug; the canonical form is always the slug, so we
  // redirect here at the middleware layer so crawlers + users always land
  // on the slug URL.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const endpoint = `${url}/rest/v1/${table}?select=slug&id=eq.${encodeURIComponent(uuid)}&limit=1`;
    const res = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(500),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ slug: string | null }>;
    if (rows.length === 0 || !rows[0].slug) return null;
    return rows[0].slug;
  } catch (e) {
    console.error(`[middleware] ${table} uuid lookup failed:`, e);
    return null;
  }
}

// Team slug redirect: handles renames of user-created teams.
// Affects both the team hub (/dashboard/team/[slug]) and the public
// profile (/directory/teams/[slug]). Public SELECT RLS means anyone can
// read redirects, so this works for unauthenticated requests too.
async function lookupTeamSlugRedirect(slug: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const endpoint = `${url}/rest/v1/team_slug_redirects?from_slug=eq.${encodeURIComponent(slug)}&select=to_slug&limit=1`;
    const res = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(500),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ to_slug: string }>;
    if (rows.length === 0) return null;
    return rows[0].to_slug;
  } catch (e) {
    console.error('[middleware] team slug redirect lookup failed:', e);
    return null;
  }
}

// ASCII-fold fallback (2026-10-23, per Arnel). When the exact-slug lookup
// misses, fold the incoming slug to pure ASCII and look for a team whose
// slug folds to the same value — that catches `3l-riviere-du-loup` →
// `3l-rivière-du-loup`, `kromeriz` → `kroměříž`, `amals` → `åmåls`, and
// every other diacritic-only spelling difference.
//
// The 2026-10-23 migration pre-seeds 196 of these into team_slug_redirects,
// which is the fast path. This live lookup is the safety net so a team
// created with an accented slug after the migration still resolves without
// waiting for the next alias regeneration.
//
// Runs last in the chain, after the exact lookup has already missed, so it
// costs one extra query only on URLs that would otherwise 404.
async function lookupTeamSlugByFoldedSlug(slug: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  // Fold the incoming slug so mixed-case and diacritic spellings collapse to
  // the same key. Note this must NOT bail when folded === slug: the incoming
  // slug may be uppercase ("AMALS") while every stored slug is lowercase, so
  // the fold still opens a path the case-sensitive exact lookup could not.
  const folded = foldSlugToAscii(slug);
  if (!folded) return null;
  // Only ASCII inputs can be the product of a fold — an accented slug in the
  // URL is a real slug, handled by the exact lookup and the page handler.
  if (hasNonAscii(slug)) return null;
  try {
    // PostgREST caps a single response at 1000 rows no matter what `limit`
    // says (verified: limit=3000 returns content-range 0-999/2639), so a
    // single request silently misses ~62% of active teams. Page explicitly,
    // bounded by MAX_PAGES so a mis-set cap can never spin.
    const PAGE = 1000;
    const MAX_PAGES = 12;
    const headers = { apikey: key, Authorization: `Bearer ${key}` };
    for (let page = 0; page < MAX_PAGES; page++) {
      const endpoint =
        `${url}/rest/v1/team_workspaces` +
        `?select=slug&is_active=eq.true&limit=${PAGE}&offset=${page * PAGE}` +
        `&order=slug.asc`;
      const res = await fetch(endpoint, {
        headers,
        signal: AbortSignal.timeout(800),
      });
      if (!res.ok) return null;
      const rows = (await res.json()) as Array<{ slug: string | null }>;
      for (const row of rows) {
        if (row.slug && foldSlugToAscii(row.slug) === folded) return row.slug;
      }
      if (rows.length < PAGE) break;
    }
    return null;
  } catch (e) {
    console.error('[middleware] folded team slug lookup failed:', e);
    return null;
  }
}

// Simple in-memory rate limiter for edge runtime
// Keyed by IP, uses sliding window (1-minute windows).
//
// 2026-10-15 (Piece C, Arnel 10:54): two-tier limiter.  Normal
// clients get 100 req/min per IP.  Requests with a well-known
// crawler User-Agent (Googlebot, bingbot, Slurp, DuckDuckBot,
// Baiduspider, YandexBot, Applebot) get a separate, higher
// bucket of 1000 req/min per IP.  Why not unlimited?  UA can be
// spoofed, and we have scraping traffic.  A real Googlebot crawl
// on our busiest directory pages is well under 1000 req/min/IP
// (Google's own published per-IP rate is "a few per second")
// so the higher cap doesn't help spammers, but it does cap a
// flooder who is impersonating a bot UA.
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const trustedRateLimitMap = new Map<string, { count: number; windowStart: number }>();
// 2026-10-15 (Piece E, Task 3.3): Set of IPs we've already logged
// as 'first seen' for crawler requests.  Cleared every cleanup
// cycle (every 100 requests) so the set doesn't grow unbounded.
const firstSeenIPs = new Set<string>();

// 2026-10-23 (Singapore traffic incident): GLOBAL per-path limiter.
//
// The existing limiter is keyed by IP only. A scraper running an IP pool
// (proxy / botnet / cloud fleet) therefore bypasses it completely — 75,000
// requests spread over N IPs each sit under the per-IP cap. That is exactly
// what GA4 measured: 74,971 Singapore users on /directory/nhl/schedule in a
// single day (2026-10-22), on top of a normal traffic base.
//
// This limiter counts requests per PATH across ALL clients, so distributing
// across IPs no longer helps. It is applied only to paths that are
// (a) expensive to serve and (b) not meaningfully useful to crawl in bulk.
// It deliberately does NOT apply to /news/*, /directory/rinks/*, /learn/*
// or the sitemap — those are the pages we WANT indexed.
//
// The cap is generous (600/min across the whole site for a given path).
// A real Googlebot crawl of one path is far below that; a human browsing
// is 1-2/min. A flooder gets cut off at the edge instead of driving
// thousands of server-side DB queries.
const globalPathRateLimitMap = new Map<string, { count: number; windowStart: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100;            // normal clients per window per IP
const TRUSTED_RATE_LIMIT_MAX = 1000;   // UA-claimed crawlers per window per IP

// Paths subject to the global per-path cap. Deliberately narrow: only
// pages that were measured as expensive AND that a scraper has an
// incentive to hammer. See the comment block above.
const GLOBAL_PATH_LIMIT_PREFIXES = [
  '/directory/nhl/schedule',
  '/directory/games',
  '/sign-up',
  '/login',
  '/claim-your-listing',
  '/ice-rinks-near-me',
];
const GLOBAL_PATH_LIMIT_MAX = 600; // requests/min for the whole site on one path

// 2026-10-22 (Arnel, after the Singapore traffic review): tighter bucket for
// bulk public-data reads.
//
// GA4 showed ~41k sessions from Singapore in one period (vs 1,215 US), and
// ~11,800 rows are reachable through PostgREST with the public anon key and
// no limit: players 6,352 / teams 3,244 / rinks 1,919 / leagues 298.
//
// These are legitimate PUBLIC directory pages in the UI — the browser fetch
// API data the same way. But no human ever needs 100 requests/minute to a
// JSON row endpoint, so we can cap those far below the page rate.
//
// Why this does NOT affect SEO or AI discoverability:
//   - Crawlers (Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User) fetch
//     HTML pages and sitemaps. They do not query PostgREST for content.
//   - The 1000/min trusted-crawler tier still applies, so any genuine
//     crawler is unaffected even if it does touch these paths.
//   - Human browsing a team page makes a handful of these calls, not 100.
//   This is a traffic-control measure, not a crawler block. Nothing in
// robots.txt changes and no UA is denied.
const DATA_RATE_LIMIT_MAX = 30; // anon bulk-data reads per window per IP

type RateLimitResult = { blocked: boolean; limit: number; remaining: number; resetMs: number };

function checkRateLimit(
  ip: string,
  map: Map<string, { count: number; windowStart: number }>,
  max: number,
): RateLimitResult {
  const now = Date.now();
  const record = map.get(ip);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    map.set(ip, { count: 1, windowStart: now });
    return { blocked: false, limit: max, remaining: max - 1, resetMs: now + RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= max) {
    return { blocked: true, limit: max, remaining: 0, resetMs: record.windowStart + RATE_LIMIT_WINDOW_MS };
  }

  record.count++;
  return { blocked: false, limit: max, remaining: max - record.count, resetMs: record.windowStart + RATE_LIMIT_WINDOW_MS };
}

// Clean up old entries periodically (runs on every request, cleanup every 100 requests)
let cleanupCounter = 0;
function cleanupOldEntries() {
  const now = Date.now();
  for (const m of [rateLimitMap, trustedRateLimitMap]) {
    for (const [ip, record] of m.entries()) {
      if (now - record.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
        m.delete(ip);
      }
    }
  }
  // Same cleanup for the global per-path map (2026-10-23).
  for (const [key, record] of globalPathRateLimitMap.entries()) {
    if (now - record.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      globalPathRateLimitMap.delete(key);
    }
  }
  // Also clear the 'first seen' IP set.  After cleanup, the next
  // crawler request from any IP will be logged again (and the IP
  // will be re-added to the set).  This is intentional: after
  // the rate limit windows expire, we want to log 'new visitor'
  // again.
  firstSeenIPs.clear();
}

// Bulk public-data endpoints worth capping harder than normal page routes.
// These serve the directory JSON that the anon key can already reach.
const BULK_DATA_PATH_PREFIXES = [
  '/api/rinks',
  '/api/teams',
  '/api/players',
  '/api/leagues',
  '/rest/v1/',        // direct PostgREST calls, if proxied through us
  '/api/directory',
  // 2026-10-23: the bulk dataset export is ~5.5MB per request and was
  // uncapped — it sits outside every other prefix above. Not the source
  // of the Singapore burst (GA4 shows that traffic landing on HTML
  // pages), but it is the single most expensive endpoint we expose and
  // should not be fetchable without a limit.
  '/api/data',
];

function isBulkDataPath(path: string): boolean {
  return BULK_DATA_PATH_PREFIXES.some((p) => path === p || path.startsWith(p + '/') || path.startsWith(p));
}

// Returns the path prefix this request should be globally capped on, or null.
function getGlobalLimitedPath(path: string): string | null {
  for (const p of GLOBAL_PATH_LIMIT_PREFIXES) {
    if (path === p || path.startsWith(p + '/') || path.startsWith(p)) return p;
  }
  return null;
}

// Global (all-IP) per-path limiter. Separate map from the per-IP one so a
// distributed scraper cannot spread its requests thin enough to stay under
// the per-IP cap.
function checkGlobalPathRateLimit(path: string): RateLimitResult {
  const key = getGlobalLimitedPath(path)!;
  const now = Date.now();
  const record = globalPathRateLimitMap.get(key);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    globalPathRateLimitMap.set(key, { count: 1, windowStart: now });
    return { blocked: false, limit: GLOBAL_PATH_LIMIT_MAX, remaining: GLOBAL_PATH_LIMIT_MAX - 1, resetMs: now + RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= GLOBAL_PATH_LIMIT_MAX) {
    return { blocked: true, limit: GLOBAL_PATH_LIMIT_MAX, remaining: 0, resetMs: record.windowStart + RATE_LIMIT_WINDOW_MS };
  }

  record.count++;
  return { blocked: false, limit: GLOBAL_PATH_LIMIT_MAX, remaining: GLOBAL_PATH_LIMIT_MAX - record.count, resetMs: record.windowStart + RATE_LIMIT_WINDOW_MS };
}

export default clerkMiddleware(async (auth, request) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Slug redirect: /news/{old-slug} → /news/{new-slug}
  // Per docs/CLEAN-POST-SLUGS-SPEC.md §6. Runs before everything else.
  // Only handles /news/[slug]; legacy /blog/[slug] is a separate redirect
  // and doesn't need this layer.
  if (path.startsWith('/news/') && path.length > '/news/'.length) {
    const slug = path.slice('/news/'.length).split('/')[0]; // first segment only
    if (slug && !slug.includes('.')) {
      const toSlug = await lookupSlugRedirect(slug);
      if (toSlug && toSlug !== slug) {
        const dest = new URL(`/news/${toSlug}`, request.url);
        return NextResponse.redirect(dest, 308);
      }
    }
  }

// UUID → slug redirect for all 4 directory entity types. /directory/<entity>/<uuid>
// would otherwise be indexable by Google with 0% CTR (users don't recognize
// UUIDs in URLs). Slug URLs are canonical; we 308 here so crawlers + users
// always end up on the slug URL. Player UUIDs had this since 2026-09-04;
// leagues, teams, rinks added 2026-09-07 (per GSC audit: OHL league UUID
// URL alone had 522 impr at 0% CTR).
//
// Note: rinks already redirect inside their page handler (see
// src/app/directory/rinks/[slug]/page.tsx redirect()). Doing it here too
// is a no-op for rinks (the path never reaches the page handler because
// we return a Response object), but it saves a DB roundtrip and is
// defensive — if a future refactor of the page handler drops the redirect,
// this middleware catches it.
const UUID_SEGMENT_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 2026-09-17: deprecated league slugs → canonical slug. Hardcoded
// map (not a DB lookup) because the set is small and stable. When the
// source-of-truth row is set to is_active=false, this redirect catches
// any inbound Google traffic pointing at the old URL and sends it to
// the canonical slug with a 308 (permanent) — preserves PageRank and
// avoids the duplicate-content penalty.
//
// Add new entries here when deprecating a league slug. Pairs are derived
// from scripts/_audit_dup_leagues.cjs (only safe pairs, with 0 refs on
// the deprecated side).
const LEAGUE_SLUG_REDIRECTS: Record<string, string> = {
  'shl-sweden': 'shl',
  'del-germany': 'del',
  'sm-liiga': 'liiga',
  'asia-league': 'asia-league-ice-hockey',
  'asia-league-ice-hockey-world': 'asia-league-ice-hockey',
  'echl-usa': 'echl',
  'khl-russia': 'khl',
  'liiga-finland': 'liiga',
};

const ENTITY_UUID_PREFIXES: Array<{
  prefix: string;
  table: 'players' | 'leagues' | 'team_workspaces' | 'rinks';
}> = [
  { prefix: '/directory/players/', table: 'players' },
  { prefix: '/directory/leagues/', table: 'leagues' },
  { prefix: '/directory/teams/', table: 'team_workspaces' },
  { prefix: '/directory/rinks/', table: 'rinks' },
];
for (const { prefix, table } of ENTITY_UUID_PREFIXES) {
  if (path.startsWith(prefix) && path.length > prefix.length) {
    const idSegment = path.slice(prefix.length).split('/')[0];
    if (idSegment && !idSegment.includes('.') && UUID_SEGMENT_RE.test(idSegment)) {
      const toSlug = await lookupEntitySlugByUuid(table, idSegment);
      if (toSlug && toSlug !== idSegment) {
        const dest = new URL(`${prefix}${toSlug}${path.slice(prefix.length + idSegment.length)}`, request.url);
        return NextResponse.redirect(dest, 308);
      }
    }
  }
}

// Deprecated league slug → canonical slug redirect. Runs after UUID
// redirects so any UUID pointing at the deprecated row still resolves
// to the canonical slug (UUID lookup hits the DB and would otherwise
// 404 once we deprecate the row).
if (path.startsWith('/directory/leagues/') && path.length > '/directory/leagues/'.length) {
  const slug = path.slice('/directory/leagues/'.length).split('/')[0];
  if (slug && !slug.includes('.') && LEAGUE_SLUG_REDIRECTS[slug]) {
    const dest = new URL(`/directory/leagues/${LEAGUE_SLUG_REDIRECTS[slug]}`, request.url);
    return NextResponse.redirect(dest, 308);
  }
}

// Team slug redirect: /dashboard/team/{old} and /directory/teams/{old}
  // → same paths with the new slug. Handles workspace renames.
  // Runs BEFORE the dashboard auth check so the auth redirect target is
  // the canonical (new) URL, not the old one.
  const TEAM_SLUG_PREFIXES = ['/dashboard/team/', '/directory/teams/'];
  for (const prefix of TEAM_SLUG_PREFIXES) {
    if (path.startsWith(prefix) && path.length > prefix.length) {
      const slug = path.slice(prefix.length).split('/')[0];
      if (slug && !slug.includes('.')) {
        let toSlug = await lookupTeamSlugRedirect(slug);
        // Exact lookup missed. Fall back to ASCII-fold matching so a
        // diacritic-only spelling difference still resolves.
        if (!toSlug) toSlug = await lookupTeamSlugByFoldedSlug(slug);
        if (toSlug && toSlug !== slug) {
          const dest = new URL(prefix + toSlug + path.slice(prefix.length + slug.length), request.url);
          return NextResponse.redirect(dest, 308);
        }
      }
    }
  }

  // Auth URL redirects — common typos/variations
  const AUTH_REDIRECTS: Record<string, string> = {
    '/signin': '/login',
    '/signup': '/sign-up',
    '/register': '/sign-up',
    '/auth': '/login',
  };
  const authRedirect = AUTH_REDIRECTS[path];
  if (authRedirect) {
    const dest = new URL(authRedirect, request.url);
    return NextResponse.redirect(dest, 308);
  }

  // Route protection (Phase 4.2, 2026-06-16): /dashboard/* requires auth.
  // Previously the auth check was inside dashboard/layout.tsx (a server-side
  // `if (!userId) redirect('/login')`). This worked, but the redirect didn't
  // carry the original destination — so a user clicking a deep link like
  // /dashboard/manage/team/abc123 from an email landed on /login, then on
  // /dashboard (the hard-coded fallback), losing the original target.
  //
  // Fix: protect /dashboard/* at the middleware layer, where the URL is
  // available, and pass it as `?redirect_url=...` to the login page. The login
  // page reads that param and forwards it to Clerk's SignIn (so after auth,
  // the user lands on the original target, not /dashboard).
  //
  // Note: the in-layout auth check is kept as a defense-in-depth fallback.
  if (path.startsWith('/dashboard') || path.startsWith('/admin')) {
    const { userId } = await auth();
    if (!userId) {
      const loginUrl = new URL('/login', request.url);
      // Use the full pathname + query so deep links survive the round trip.
      // The login page validates this is a relative path before using it.
      const returnTo = path + (url.search || '');
      loginUrl.searchParams.set('redirect_url', returnTo);
      return NextResponse.redirect(loginUrl, 307);
    }
  }

  // Rate limiting - apply to all routes except static assets
  const isStatic = path.startsWith('/_next') ||
                   path.startsWith('/images') ||
                   path.startsWith('/favicon') ||
                   path.includes('.'); // file extensions = static files

  // 2026-10-15 (Piece C, Arnel 10:54): two-tier rate limit.
  //
  // Tier 1: normal clients (no recognized crawler UA) — 100 req/min/IP.
  // Tier 2: UA-claimed crawlers (Googlebot, bingbot, Slurp, DuckDuckBot,
  //   Baiduspider, YandexBot, Applebot) — 1000 req/min/IP.  Why a
  //   cap and not unlimited?  UA can be spoofed (we have scraping
  //   traffic), and 1000 req/min/IP is still well above any real
  //   crawler rate (Google's published per-IP rate is "a few per
  //   second").  Real crawlers stay under the cap; spammers get
  //   capped too.
  //
  // NOTE: UA alone is not a real verification.  This is an interim
  // fix until we can implement IP-range verification (see Task 1.2).
  // UA-claimed requests from IPs OUTSIDE the published crawler
  // ranges are logged for analysis (Task 1.3) but are still served
  // at the higher tier.
  const userAgent = request.headers.get('user-agent') || '';
  const isTrustedBot = /\bGooglebot\b|\bbingbot\b|\bSlurp\b|\bDuckDuckBot\b|\bBaiduspider\b|\bYandexBot\b|\bApplebot\b/i.test(userAgent);

  if (!isStatic) {
    // Get client IP (handle proxies)
    const ip = (request as any).ip ||
               request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const map = isTrustedBot ? trustedRateLimitMap : rateLimitMap;
    // Bulk-data reads get their own tighter bucket unless the caller is a
    // verified-by-UA crawler, which keeps the higher tier for real crawlers.
    const isBulkData = !isTrustedBot && isBulkDataPath(path);
    const max = isTrustedBot
      ? TRUSTED_RATE_LIMIT_MAX
      : (isBulkData ? DATA_RATE_LIMIT_MAX : RATE_LIMIT_MAX);
    const result = checkRateLimit(ip, map, max);

    // 2026-10-23: global per-path cap, applied to ALL callers regardless of
    // IP or UA. This is the layer that stops a distributed scraper, which
    // the per-IP limiter above cannot touch. Runs AFTER the per-IP check so
    // the more specific per-IP limit still reports first.
    const globalPath = getGlobalLimitedPath(path);
    if (globalPath) {
      const globalResult = checkGlobalPathRateLimit(path);
      if (globalResult.blocked) {
        console.warn('[middleware] global path cap exceeded', JSON.stringify({
          ip, ua: userAgent, path, limit: globalResult.limit, at: Date.now(),
        }));
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': String(globalResult.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(globalResult.resetMs),
          },
        });
      }
    }

    if (result.blocked) {
      // Always log the 429 (crawler cap exceeded).  This is the
      // high-signal event: a real crawler is hitting the cap (which
      // means we should investigate whether our rate limit is too
      // low for that engine) OR a flooder is impersonating a crawler.
      if (isTrustedBot) {
        console.warn('[middleware] crawler cap exceeded', JSON.stringify({
          ip, ua: userAgent, path, limit: result.limit, at: Date.now(),
        }));
      } else if (isBulkData) {
        // 2026-10-22: high-signal for bulk-data harvesting. A real user does
        // not need 30/min to a JSON row endpoint. Log IP + path so we can
        // identify harvest patterns without logging every normal request.
        console.warn('[middleware] bulk data cap exceeded', JSON.stringify({
          ip, ua: userAgent, path, limit: result.limit, at: Date.now(),
        }));
      }
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetMs),
        },
      });
    }

    // 2026-10-15 (Piece E, Arnel 13:55 Task 3.3): cut the crawler
    // logging.  Logging every request was 1 console.log per
    // crawler visit (cheap but noisy).  Replace with:
    //   - Always log when a NEW IP is first seen (so we have
    //     a record of every crawler that visited today).
    //   - Otherwise sample 1% (Math.random() < 0.01) for
    //     baseline traffic visibility.
    // This keeps the log volume manageable while still letting
    // Arnel see (a) every new IP claiming to be a bot and (b)
    // a 1% slice of total bot traffic.  Combined with the 429
    // log above, the only event we ALWAYS log is the cap
    // exceeded (the only "anomaly" we currently detect).
    if (isTrustedBot) {
      // Per-process set of IPs that have logged 'first seen'.
      // Cleared every cleanup cycle (every 100 requests).
      if (!firstSeenIPs.has(ip) || Math.random() < 0.01) {
        firstSeenIPs.add(ip);
        console.log('[middleware] crawler request', JSON.stringify({
          ip, ua: userAgent, path, at: Date.now(),
        }));
      }
    }

    // Periodic cleanup
    cleanupCounter++;
    if (cleanupCounter >= 100) {
      cleanupOldEntries();
      cleanupCounter = 0;
    }
  }

  return NextResponse.next({
    request: {
      headers: request.headers,
    },
    headers: {
      // Surface the request pathname to server components via headers().
      // Used by the root layout to gate AdSense script loading on
      // legal/auth/form pages (AdSense policy: no ads on those routes).
      'x-pathname': path,
    },
  });
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\..*).*)',
  ],
};
