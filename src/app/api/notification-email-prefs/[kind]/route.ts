/**
 * PATCH /api/notification-email-prefs/[kind]
 *
 * Body: { muted: boolean }
 *
 * Upsert the (user_id, kind) row in notification_email_prefs. Idempotent.
 * profile_first_visitor is accepted in the body but the API documents
 * it as a no-op (we never email for that kind regardless of pref).
 *
 * Auth: caller must be authenticated. RLS handles the rest.
 *
 * Cache: invalidates the `email-mute:${userId}` tag so the next read
 * sees the new value. The notifications/emitter (PR2a) and the
 * preferences page (PR2b) share the same cache key.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { revalidateTag } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import type { OnboardingKind } from '@/lib/notifications/emit';

const RATE_LIMIT = { maxRequests: 30, windowMs: 60 * 1000 };

const VALID_KINDS: ReadonlySet<OnboardingKind> = new Set<OnboardingKind>([
  'signup_welcome',
  'identity_verify_recommended',
  'wizard_incomplete',
  'claim_paid_tier_unlocked',
  'profile_first_visitor',
]);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`notif-email-pref:${ip}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { kind } = await params;
  if (!VALID_KINDS.has(kind as OnboardingKind)) {
    return badRequest(`kind must be one of: ${[...VALID_KINDS].join(', ')}`);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }
  if (typeof body?.muted !== 'boolean') {
    return badRequest('muted must be a boolean.');
  }

  // profile_first_visitor is in-app only; accept the toggle but store
  // muted=true so the UI surface is honest (we never email regardless).
  const effectiveMuted = kind === 'profile_first_visitor' ? true : body.muted;

  const { data, error } = await supabaseAdmin
    .from('notification_email_prefs')
    .upsert(
      {
        user_id: userId,
        kind,
        muted: effectiveMuted,
      },
      { onConflict: 'user_id,kind' }
    )
    .select('kind, muted')
    .single();

  if (error) {
    console.error('[notif-email-pref] upsert failed:', error);
    return NextResponse.json({ error: 'Failed to save preference.' }, { status: 500 });
  }

  // Invalidate the cached mute check so the next emit sees the new value.
  revalidateTag(`email-mute:${userId}`);

  return NextResponse.json({ ok: true, kind: data.kind, muted: data.muted });
}
