import { NextRequest, NextResponse } from 'next/server';

// Admin API key for sync endpoints (set in Vercel env vars)
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

// Protected sync endpoints - require API key header
const PROTECTED_PATHS = [
  '/api/highantly/sync',
  '/api/highantly/sync-all',
  '/api/highantly/sync-matches',
  '/api/highantly/sync-teams',
  '/api/highantly/sync-teams-target',
  '/api/highantly/sync-batch',
];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(p => pathname.startsWith(p));
}

export function verifyApiKey(request: NextRequest): boolean {
  if (!ADMIN_API_KEY) {
    // No key configured = endpoint is LOCKED DOWN (fail closed for security)
    console.warn('[Auth] ADMIN_API_KEY not set - blocking request');
    return false;
  }

  const providedKey = request.headers.get('x-api-key');
  if (!providedKey) return false;

  // Timing-safe comparison
  const keyBuffer = Buffer.from(ADMIN_API_KEY);
  const providedBuffer = Buffer.from(providedKey);
  
  if (keyBuffer.length !== providedBuffer.length) return false;
  
  let result = 0;
  for (let i = 0; i < keyBuffer.length; i++) {
    result |= keyBuffer[i] ^ providedBuffer[i];
  }
  
  return result === 0;
}

export function apiKeyAuthResponse(): NextResponse {
  return new NextResponse(JSON.stringify({ error: 'Unauthorized. Valid API key required.' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}