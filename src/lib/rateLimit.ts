import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple in-memory rate limiter for API routes.
 * Works with Next.js Edge and Node.js runtimes.
 * 
 * For Vercel (serverless), this state resets per cold start.
 * For production at scale, consider Redis-backed rate limiting.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// Sliding window rate limiter per key (e.g., IP address)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean old entries periodically
let cleanupCounter = 0;

function cleanup() {
  const now = Date.now();
  const WINDOW_MS = 60 * 1000; // 1 minute window
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > WINDOW_MS * 2) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check if a key (e.g. IP) is rate limited.
 * Returns { allowed: true } if request should proceed.
 * Returns { allowed: false, retryAfter: seconds } if blocked.
 */
export function checkRateLimit(
  key: string,
  options: { maxRequests: number; windowMs: number } = { maxRequests: 60, windowMs: 60 * 1000 }
): { allowed: boolean; retryAfter?: number; remaining: number; limit: number } {
  const { maxRequests, windowMs } = options;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    // Start new window
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: maxRequests - 1, limit: maxRequests };
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfter, remaining: 0, limit: maxRequests };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, limit: maxRequests };
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

// Periodic cleanup every 100 requests
export function maybeCleanup() {
  cleanupCounter++;
  if (cleanupCounter >= 100) {
    cleanup();
    cleanupCounter = 0;
  }
}