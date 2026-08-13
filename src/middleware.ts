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
