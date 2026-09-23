/**
 * Internal API auth — shared secret for /api/internal/* and admin one-time routes
 *
 * Why this exists:
 *   The /api/internal/* routes previously relied ONLY on a feature flag check
 *   (isPassportInternalApiEnabled). Feature flags are NOT auth — they're just
 *   on/off toggles. Anon users hitting those endpoints could:
 *     - Issue passports for arbitrary internalUserIds
 *     - Resolve identity references
 *     - Lookup passports
 *     - Add entity links to passports
 *     - Append events to passport history
 *
 *   This helper enforces a shared-secret check via x-internal-key header.
 *   Service-role scripts set INTERNAL_API_KEY in env, then send the header.
 *   No browser flow uses these endpoints.
 *
 * Usage in route.ts:
 *   import { requireInternalAuth } from '@/lib/internal-auth';
 *
 *   export async function POST(req: NextRequest) {
 *     const auth = requireInternalAuth(req);
 *     if (auth instanceof NextResponse) return auth;  // failed
 *     // auth.who === 'internal-key' | 'service-role-bypass'
 *     // ... rest of handler
 *   }
 *
 * Env var: INTERNAL_API_KEY
 *   - Set in Vercel env vars (production)
 *   - Set in .env.local for dev
 *   - Generate with: openssl rand -hex 32
 *
 * Client-side usage:
 *   fetch('/api/internal/passport/issue', {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *       'x-internal-key': process.env.INTERNAL_API_KEY,
 *     },
 *     body: JSON.stringify({...})
 *   })
 */
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

const KEY_ENV = 'INTERNAL_API_KEY';

function getKey(): string | null {
  const k = process.env[KEY_ENV];
  return k && k.length > 0 ? k : null;
}

/**
 * Returns either a NextResponse (auth failed, return this from the route)
 * or a success object identifying how the caller authenticated.
 */
export function requireInternalAuth(request: NextRequest):
  | NextResponse
  | { who: 'internal-key' | 'service-role-bypass' } {
  // Allow requests that already came in with service-role Supabase auth.
  // PostgREST forwards the apikey header — if it matches the service_role
  // key, the request was made by a service-role script (no human involved).
  const apikey = request.headers.get('apikey') || '';
  const sr = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (sr && apikey && apikey === sr) {
    return { who: 'service-role-bypass' };
  }

  const key = getKey();
  if (!key) {
    // Fail closed — if no key configured, reject everything. Operator must set
    // INTERNAL_API_KEY before deploying any /api/internal/* route.
    return NextResponse.json(
      { error: 'internal_api_key_not_configured' },
      { status: 500 }
    );
  }

  const provided = request.headers.get('x-internal-key');
  if (!provided) {
    return NextResponse.json(
      { error: 'missing x-internal-key header' },
      { status: 401 }
    );
  }

  // Constant-time compare to prevent timing attacks
  const providedBuf = Buffer.from(provided);
  const keyBuf = Buffer.from(key);
  if (providedBuf.length !== keyBuf.length || !timingSafeEqual(providedBuf, keyBuf)) {
    return NextResponse.json(
      { error: 'invalid internal key' },
      { status: 403 }
    );
  }

  return { who: 'internal-key' };
}
