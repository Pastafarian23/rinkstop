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

  const status = await getAccountStatus(rinkOwner.stripe_account_id);

  return NextResponse.json({
    status: 'connected',
    accountId: rinkOwner.stripe_account_id,
    onboardingComplete: rinkOwner.stripe_onboarding_complete,
    ...status,
  });
}
