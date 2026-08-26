export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createConnectAccount, createOnboardingLink } from '@/lib/stripe-connect';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { rinkId } = body as { rinkId?: string };

  if (!rinkId || typeof rinkId !== 'string') {
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

  const { data: rink, error: rinkErr } = await supabaseAdmin
    .from('rinks')
    .select('name, country')
    .eq('id', rinkId)
    .single();

  if (rinkErr || !rink) {
    return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
  }

  const { data: existing } = await supabaseAdmin
    .from('rink_owners')
    .select('stripe_account_id, stripe_onboarding_complete')
    .eq('rink_id', rinkId)
    .maybeSingle();

  if (existing?.stripe_account_id && existing.stripe_onboarding_complete) {
    return NextResponse.json({
      status: 'already_onboarded',
      accountId: existing.stripe_account_id,
    });
  }

  const accountId = await createConnectAccount({
    email: `${userId}@rinkstop.user`,
    businessName: rink.name || 'Rink',
    country: rink.country || 'US',
  });

  const payload: Record<string, unknown> = {
    rink_id: rinkId,
    stripe_account_id: accountId,
    stripe_onboarding_started_at: new Date().toISOString(),
  };

  if (!existing) {
    payload.user_id = userId;
    payload.role = 'owner';
  }

  const { error: upsertErr } = await supabaseAdmin
    .from('rink_owners')
    .upsert(payload, { onConflict: existing ? 'rink_id' : undefined });

  if (upsertErr) {
    console.error('[stripe/onboard] rink_owners upsert failed', upsertErr);
    return NextResponse.json({ error: 'Failed to save Stripe account.' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rinkstop.com';
  const onboardingUrl = await createOnboardingLink(
    accountId,
    `${appUrl}/dashboard/manage/rink/${rinkId}/payments?setup=complete`,
    `${appUrl}/dashboard/manage/rink/${rinkId}/payments?setup=refresh`,
  );

  return NextResponse.json({
    status: 'created',
    accountId,
    onboardingUrl,
  });
}
