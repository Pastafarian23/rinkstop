/**
 * src/app/dashboard/identity/page.tsx
 *
 * /dashboard/identity — Phase 1 verification page
 *
 * UX (locked design, 2026-06-17):
 *   1. Show current verification status (never_verified / active / expired)
 *   2. For Roster+/Starter+ users not yet verified: show the iframe embed (Option B)
 *   3. For Free/Roster users: show upgrade CTA
 *   4. For verified users: show "Identity verified" with date + expiration
 *   5. For expired: re-verify CTA
 *
 * Tier gate: Roster+ or Business Starter+ to start verification. Free/Roster users see an upsell.
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserTier, tierAtLeast } from '@/lib/connections';
import IdentityClient from './IdentityClient';

export const dynamic = 'force-dynamic';

export default async function IdentityPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; return?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/login');

  const tier = await getUserTier(userId);
  // Roster+ (personal track) OR Business Starter+ (business track) can verify
  const canVerify = tierAtLeast(tier, 'roster_plus') || tierAtLeast(tier, 'business_starter');

  // Fetch current identity status from the view
  const { data: status } = await supabaseAdmin
    .from('profile_identity_status')
    .select('status, identity_verified_at, identity_expires_at, days_until_expiry, identity_verification_method')
    .eq('user_id', userId)
    .maybeSingle();

  // Fetch most recent session id (for the decision-poll back link)
  const { data: session } = await supabaseAdmin
    .from('didit_sessions')
    .select('session_id, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sp = await searchParams;

  return (
    <IdentityClient
      canVerify={canVerify}
      tier={tier}
      status={status?.status ?? 'never_verified'}
      identityVerifiedAt={status?.identity_verified_at ?? null}
      identityExpiresAt={status?.identity_expires_at ?? null}
      daysUntilExpiry={status?.days_until_expiry ?? null}
      method={status?.identity_verification_method ?? null}
      latestSessionId={session?.session_id ?? null}
      returnFromDidit={sp?.return === '1'}
    />
  );
}
