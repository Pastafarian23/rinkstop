import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Database-backed sliding window rate limiter.
 *
 * Why DB-backed: Vercel's serverless runtime gives each invocation its own
 * memory space, so a `Map` is reset on every cold start. A determined attacker
 * can either wait for a cold start or spread requests across instances. The
 * `rate_limit_hits` table is the source of truth — same window math, persistent
 * across cold starts, free (uses existing Supabase, no Upstash needed).
 *
 * Cost: one Supabase count + one insert per request, ~10-30ms latency. Fine for
 * form submits and write endpoints. If we ever need this on a high-RPS read
 * endpoint, move to Upstash Redis.
 *
 * Caller pattern:
 *   const result = await checkRateLimit(key, { maxRequests: 60, windowMs: 60_000 });
 *   if (!result.allowed) { ... return 429 ... }
 */

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining: number;
  limit: number;
}

/**
 * Check (and atomically record) a hit against the rate limit window.
 *
 * On DB error, fails OPEN (allows the request) and logs. Reason: a transient
 * Supabase outage should not lock users out of form submissions.
 */
export async function checkRateLimit(
  key: string,
  options: { maxRequests: number; windowMs: number }
): Promise<RateLimitResult> {
  const { maxRequests, windowMs } = options;
  const now = Date.now();
  const windowStartISO = new Date(now - windowMs).toISOString();

  // 1. Count hits in the current window.
  const { count, error: countErr } = await supabaseAdmin
    .from('rate_limit_hits')
    .select('*', { count: 'exact', head: true })
    .eq('key', key)
    .gte('hit_at', windowStartISO);

  if (countErr) {
    console.error('[rateLimit] DB count failed, failing open', countErr);
    return { allowed: true, remaining: maxRequests, limit: maxRequests };
  }

  const currentCount = count ?? 0;
  if (currentCount >= maxRequests) {
    // Find the oldest hit in the window to compute when one slot frees up.
    const { data: oldest } = await supabaseAdmin
      .from('rate_limit_hits')
      .select('hit_at')
      .eq('key', key)
      .gte('hit_at', windowStartISO)
      .order('hit_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    const oldestTime = oldest ? new Date(oldest.hit_at).getTime() : now;
    const retryAfter = Math.max(1, Math.ceil((oldestTime + windowMs - now) / 1000));
    return { allowed: false, retryAfter, remaining: 0, limit: maxRequests };
  }

  // 2. Record this hit. Insert in parallel with returning the result — if the
  // insert fails (e.g. unique violation on race), we still allow the request
  // because we counted under the limit.
  supabaseAdmin
    .from('rate_limit_hits')
    .insert({ key, hit_at: new Date(now).toISOString() })
    .then(({ error: insertErr }) => {
      if (insertErr && insertErr.code !== '23505') {
        console.error('[rateLimit] insert failed (non-fatal)', insertErr);
      }
    });

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - currentCount - 1),
    limit: maxRequests,
  };
}

/**
 * Get client IP from Next.js headers.
 */
export function getClientIP(request: Request | NextRequest): string {
  const req = request as Request;
  const ip = (req as any).ip ??
             req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
             req.headers.get('x-real-ip') ??
             'unknown';
  return ip;
}

/**
 * Apply rate limit headers to a NextResponse.
 */
export function applyRateLimitHeaders(
  response: NextResponse,
  result: { remaining: number; limit: number; retryAfter?: number }
): NextResponse {
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  if (result.retryAfter) {
    response.headers.set('Retry-After', String(result.retryAfter));
  }
  return response;
}

/**
 * No-op placeholder kept for backwards compatibility with any callers we
 * might have missed in the refactor. The DB-backed `checkRateLimit` doesn't
 * need periodic cleanup (rows naturally age out of the window).
 */
export async function maybeCleanup(): Promise<void> {
  // no-op
}
