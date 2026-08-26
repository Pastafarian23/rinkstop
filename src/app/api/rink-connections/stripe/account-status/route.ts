export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAccountStatus } from '@/lib/stripe-connect';

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rinkId = searchParams.get('rinkId');

  if (!rinkId) {
    return NextResponse.json({ error: 'rinkId is required.' }, { status: 400 });
  }

  const { data: claim } = await supabaseAdmin
    .from('claims')
    .select('id')
    .eq('entity_id', rinkId)
    .eq('claim_type', 'rink')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .maybeSingle();

  if (!claim) {
    return NextResponse.json({ error: 'Not authorized for this rink.' }, { status: 403 });
  }

  const { data: rinkOwner, error } = await supabaseAdmin
    .from('rink_owners')
    .select('stripe_account_id, stripe_onboarding_complete')
    .eq('rink_id', rinkId)
    .maybeSingle();

  if (error || !rinkOwner?.stripe_account_id) {
    return NextResponse.json({
      status: 'not_started',
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    });
  }

  // Security audit 2026-08-26 fix #4 (MEDIUM): always re-fetch live account
  // status from Stripe. We trust the stored `stripe_account_id` (server
  // already set it in /onboard), but verify onboarding completion against
  // Stripe's live state instead of trusting a DB flag that was never updated.
  //
  // The DB flag is set to true here on transition: if Stripe confirms
  // charges_enabled + payouts_enabled + details_submitted, and the flag is
  // currently false, persist it. Once true, never set back to false here
  // (Stripe account.updated webhook would be the right path for revocation,
  // but that's out of scope for this fix).
  const status = await getAccountStatus(rinkOwner.stripe_account_id);

  const stripeConfirmsComplete = Boolean(
    status?.chargesEnabled && status?.payoutsEnabled && status?.detailsSubmitted,
  );

  if (stripeConfirmsComplete && !rinkOwner.stripe_onboarding_complete) {
    const { error: updateErr } = await supabaseAdmin
      .from('rink_owners')
      .update({
        stripe_onboarding_complete: true,
        stripe_onboarding_completed_at: new Date().toISOString(),
      })
      .eq('rink_id', rinkId);
    if (updateErr) {
      console.error('[stripe/account-status] failed to persist onboarding_complete', updateErr);
      // Non-fatal — return the live status so the client can render correctly.
    } else {
      console.log(`[stripe/account-status] marked rink ${rinkId} as onboarded (account ${rinkOwner.stripe_account_id})`);
    }
  }

  return NextResponse.json({
    status: 'connected',
    accountId: rinkOwner.stripe_account_id,
    onboardingComplete: stripeConfirmsComplete || rinkOwner.stripe_onboarding_complete,
    ...status,
  });
}
