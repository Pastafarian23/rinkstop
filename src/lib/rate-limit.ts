import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limit store (per-instance, resets on cold start)
// For production with multiple instances, use Vercel KV or similar
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 100; // requests per window per IP

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || entry.resetAt < now) {
    // New or expired window
    rateLimitStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  if (entry.count >= MAX_REQUESTS) {
    return true;
  }

  entry.count++;
  return false;
}

export function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') || // Cloudflare
    'unknown'
  );
}

export function rateLimitResponse(ip: string): NextResponse {
  const entry = rateLimitStore.get(ip);
  const retryAfter = entry ? Math.ceil((entry.resetAt - Date.now()) / 1000) : 60;
  
  return new NextResponse(JSON.stringify({ error: 'Rate limit exceeded. Try again later.', retryAfter }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfter),
      'X-RateLimit-Limit': String(MAX_REQUESTS),
      'X-RateLimit-Remaining': '0',
    },
  });
}