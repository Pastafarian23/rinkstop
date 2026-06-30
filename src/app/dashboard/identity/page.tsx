/**
 * src/app/dashboard/identity/page.tsx
 *
 * /dashboard/identity — Phase 1 verification page
 *
 * UX (locked design, 2026-06-17):
 *   1. Show current verification status (never_verified / active / expired)
 *   2. For Roster Pro/Business Starter+ users not yet verified: show the iframe embed (Option B)
 *   3. For Free/Roster Starter users: show upgrade CTA
 *   4. For verified users: show "Identity verified" with date + expiration
 *   5. For expired: re-verify CTA
 *
 * Tier gate: Roster Pro (personal) or Business Starter+ (business) to start verification. Free/Roster Starter users see an upsell.
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserTier } from '@/lib/connections';
import { tierAtLeastSameTrack } from '@/lib/tier-gate';
import { OWNER_EMAILS } from '@/lib/admin-auth';
import IdentityClient from './IdentityClient';

export const dynamic = 'force-dynamic';

export default async function IdentityPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; return?: string }>;
}) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) redirect('/login');

  // Determine the canonical tier for this request. Clerk OAuth flows may have
  // created a separate Clerk user for the same person (account-linking off),
  // in which case the signed-in user_id may not own the premium profile row.
  // For owner emails, fall back to the canonical row by email so identity
  // verification unlocks regardless of which Clerk user_id owns the session.
  const primaryEmail = userEmail;
  let effectiveUserId = userId;
  let tier = await getUserTier(userId);
  if (OWNER_EMAILS.has(primaryEmail)) {
    const { data: byEmail } = await supabaseAdmin
      .from('profiles')
      .select('user_id, tier, role, is_founding_member, subscription_status, tier_expires_at')
      .ilike('email', primaryEmail)
      .neq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byEmail) {
      // Canonical row exists at a different user_id. Re-derive tier using
      // getUserTier's own expiry/subscription rules against the canonical row.
      effectiveUserId = byEmail.user_id;
      tier = await getUserTier(byEmail.user_id);
    }
  }
  // Roster Pro (personal track) OR Business Starter+ (business track) can verify
  // Using tierAtLeastSameTrack which enforces same-track comparison.
  const canVerify = tierAtLeastSameTrack(tier, 'roster_plus') || tierAtLeastSameTrack(tier, 'business_starter');

  // Fetch current identity status from the view (canonical user_id)
  const { data: status } = await supabaseAdmin
    .from('profile_identity_status')
    .select('status, identity_verified_at, identity_expires_at, days_until_expiry, identity_verification_method')
    .eq('user_id', effectiveUserId)
    .maybeSingle();

  // Fetch most recent session id (for the decision-poll back link)
  const { data: latestSession } = await supabaseAdmin
    .from('didit_sessions')
    .select('session_id, status, created_at')
    .eq('user_id', effectiveUserId)
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
      latestSessionId={latestSession?.session_id ?? null}
      returnFromDidit={sp?.return === '1'}
    />
  );
}
