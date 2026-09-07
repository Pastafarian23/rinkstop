import { NextResponse } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';

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

// Simple in-memory rate limiter for edge runtime
// Keyed by IP, uses sliding window (1-minute windows)
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // requests per window per IP (generous for normal users)

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    // Start new window
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return true; // blocked
  }

  record.count++;
  return false;
}

// Clean up old entries periodically (runs on every request, cleanup every 100 requests)
let cleanupCounter = 0;
function cleanupOldEntries() {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(ip);
    }
  }
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

// Team slug redirect: /dashboard/team/{old} and /directory/teams/{old}
  // → same paths with the new slug. Handles workspace renames.
  // Runs BEFORE the dashboard auth check so the auth redirect target is
  // the canonical (new) URL, not the old one.
  const TEAM_SLUG_PREFIXES = ['/dashboard/team/', '/directory/teams/'];
  for (const prefix of TEAM_SLUG_PREFIXES) {
    if (path.startsWith(prefix) && path.length > prefix.length) {
      const slug = path.slice(prefix.length).split('/')[0];
      if (slug && !slug.includes('.')) {
        const toSlug = await lookupTeamSlugRedirect(slug);
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

  if (!isStatic) {
    // Get client IP (handle proxies)
    const ip = (request as any).ip ||
               request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown';

    if (isRateLimited(ip)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Date.now() + RATE_LIMIT_WINDOW_MS),
        },
      });
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
