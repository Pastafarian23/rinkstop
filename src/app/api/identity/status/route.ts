/**
 * src/app/api/identity/status/route.ts
 *
 * GET /api/identity/status
 *
 * Returns the caller's identity verification state from the
 * profile_identity_status view. The view is the single source of truth
 * for "never_verified | active | expired" + days_until_expiry.
 *
 * Used by:
 *   - /dashboard/identity (the page itself, on load)
 *   - /dashboard layout (to decide whether to show the "Verify" nav link)
 *   - /profile/[slug] (to show the IdentityVerified badge)
 *   - /dashboard/messages/[threadId] (to show sender's verification)
 *
 * Response: { status, identity_verified_at, identity_expires_at,
 *             days_until_expiry, method }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('profile_identity_status')
    .select('status, identity_verified_at, identity_expires_at, days_until_expiry, identity_verification_method')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[identity/status] view read failed:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Failed to load identity status' },
      { status: 500 }
    );
  }

  // No row in the view means the user has no profile — treat as never_verified.
  return NextResponse.json({
    status: data?.status ?? 'never_verified',
    identity_verified_at: data?.identity_verified_at ?? null,
    identity_expires_at: data?.identity_expires_at ?? null,
    days_until_expiry: data?.days_until_expiry ?? null,
    method: data?.identity_verification_method ?? null,
  });
}
