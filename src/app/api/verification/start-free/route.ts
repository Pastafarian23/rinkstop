import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { createSession } from '@/lib/didit';
import { trackEvent } from '@/lib/analytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * WS25 (2026-08-23): Free verification entry point.
 *
 * Replaces the old `Upgrade to Verify Identity $24.99/yr` flow with a free
 * Didit KYC/KYB path. Any logged-in user can verify their identity without
 * paying, regardless of tier. Verification is bundled into every paid
 * subscription at no extra cost (the tier price absorbs the Didit fee).
 *
 * Body: { profileType: 'player' | 'parent' | 'coach' | 'scout' | 'official'
 *                  | 'rink_owner' | 'team_manager' | 'league_admin' }
 *
 * Returns: { url, sessionId, kind } on success.
 *
 * Auth: required. Rate-limited to 5/10min/IP (matches /api/claims).
 */
const RATE_LIMIT = { maxRequests: 5, windowMs: 10 * 60 * 1000 };

const PROFILE_TYPES = new Set([
  'player', 'parent', 'coach', 'scout', 'official',
  'rink_owner', 'team_manager', 'league_admin',
]);

// Business profile types require KYB (kind='business') on Didit.
// Individual profile types use KYC (kind='user').
const BUSINESS_TYPES = new Set(['rink_owner', 'team_manager', 'league_admin']);

export async function POST(req: NextRequest) {
  const session = await auth();
  const cu = await currentUser();
  if (!session.userId || !cu) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const userEmail = cu.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);

  const ip = getClientIP(req);
  const result = await checkRateLimit(`verify-start-free:${ip}`, RATE_LIMIT);
  maybeCleanup();
  if (!result.allowed) {
    const res = NextResponse.json(
      { error: 'rate_limited', retryAfter: result.retryAfter },
      { status: 429 }
    );
    return applyRateLimitHeaders(res, result);
  }

  if (!process.env.DIDIT_API_KEY) {
    return NextResponse.json(
      { error: 'didit_not_configured', message: 'DIDIT_API_KEY not set in environment.' },
      { status: 503 }
    );
  }

  let body: { profileType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const profileType = typeof body.profileType === 'string' ? body.profileType : '';
  if (!PROFILE_TYPES.has(profileType)) {
    return NextResponse.json(
      { error: 'invalid_profile_type', allowed: Array.from(PROFILE_TYPES) },
      { status: 400 }
    );
  }

  // Idempotency: if user is already verified (and not expired), return early.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('identity_verified_at, identity_expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (profile?.identity_verified_at && profile?.identity_expires_at) {
    const expiresAt = new Date(profile.identity_expires_at);
    if (expiresAt > new Date()) {
      return NextResponse.json(
        { error: 'already_verified', expiresAt: profile.identity_expires_at },
        { status: 409 }
      );
    }
  }

  const kind = BUSINESS_TYPES.has(profileType) ? 'business' : 'user';

  const origin = req.nextUrl.origin;
  const callbackUrl = `${origin}/dashboard/identity?verified=1`;

  let diditSession;
  try {
    diditSession = await createSession(kind, {
      vendorData: userId,
      callbackUrl,
      metadata: { profile_type: profileType, free_verification: '1' },
    });
  } catch (err) {
    console.error('[verification/start-free] didit createSession failed', err);
    return NextResponse.json(
      { error: 'didit_create_failed', message: 'Could not create verification session.' },
      { status: 502 }
    );
  }

  await trackEvent({
    name: 'verification_started',
    userId,
    pathname: '/dashboard/identity',
    props: { profile_type: profileType, kind, session_id: diditSession.session_id },
  });

  const res = NextResponse.json({
    url: diditSession.url,
    sessionId: diditSession.session_id,
    kind,
    profileType,
  });
  return applyRateLimitHeaders(res, result);
}
