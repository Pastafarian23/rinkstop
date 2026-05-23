import { NextRequest, NextResponse } from 'next/server';
import { getClientIP, isRateLimited, rateLimitResponse } from '@/lib/rate-limit';
import { isProtectedPath, verifyApiKey, apiKeyAuthResponse } from '@/lib/api-auth';

// Paths that are NOT rate-limited (health checks, static assets)
const EXCLUDED_PATHS = [
  '/favicon.ico',
  '/sitemap.xml',
  '/robots.txt',
  '/_next',
  '/api/health',
];

// Public API endpoints that need rate limiting
const PUBLIC_API_PATHS = [
  '/api/rinks',
  '/api/teams',
  '/api/leagues',
  '/api/players',
  '/api/games',
  '/api/highantly',
  '/api/hockey',
  '/api/locations',
];

function shouldRateLimit(pathname: string): boolean {
  // Exclude non-API paths
  if (!pathname.startsWith('/api')) return false;
  
  // Exclude excluded paths
  if (EXCLUDED_PATHS.some(p => pathname.startsWith(p))) return false;
  
  // Check if it's a public API path
  return PUBLIC_API_PATHS.some(p => pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const ip = getClientIP(request);

  // 1. Rate limiting on public API endpoints
  if (shouldRateLimit(pathname)) {
    if (isRateLimited(ip)) {
      return rateLimitResponse(ip);
    }
  }

  // 2. API key check on protected sync endpoints
  if (isProtectedPath(pathname)) {
    if (!verifyApiKey(request)) {
      return apiKeyAuthResponse();
    }
  }

  // Continue request
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all API routes except static files and Next.js internals
    '/api/:path*',
    // Exclude health check from rate limiting
    '/api/health/:path*',
  ],
};