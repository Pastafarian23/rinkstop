// src/app/api/parent/rentals/[rentalId]/checkout/route.ts
//
// Parent: create a Stripe checkout session for the rental deposit + monthly fees.
//   POST /api/parent/rentals/{rentalId}/checkout

import { NextRequest, NextResponse } from 'next/server';
import { getParentUserId } from '@/lib/rental/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { createRentalCheckoutSession } from '@/lib/rental/stripe-rental';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { rentalId: string } },
) {
  try {
    const userId = await getParentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }

    const origin = request.headers.get('origin') || `https://${request.headers.get('host')}`;
    const successUrl = `${origin}/dashboard/rentals?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/dashboard/rentals?checkout=cancelled`;

    // Load rental + item + parent email
    const { data: rental, error: rentalErr } = await supabaseAdmin
      .from('equipment_rentals')
      .select('*, equipment_items!inner(label)')
      .eq('id', params.rentalId)
      .eq('parent_user_id', userId)
      .maybeSingle();

    if (rentalErr || !rental) {
      return NextResponse.json({ error: 'Rental not found.' }, { status: 404 });
    }

    // Get parent email from profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('user_id', userId)
      .maybeSingle();

    // Get Stripe Connect account from rink_owners (NOT rinks - that's the bug we just fixed)
    // Multiple owners can exist per rink; pick the first with a stripe_account_id set.
    const { data: rinkOwner } = await supabaseAdmin
      .from('rink_owners')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('rink_id', rental.rink_id)
      .not('stripe_account_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const stripeAccountId = (rinkOwner?.stripe_onboarding_complete && rinkOwner?.stripe_account_id)
      ? rinkOwner.stripe_account_id
      : undefined;

    const { url, sessionId } = await createRentalCheckoutSession({
      rentalId: rental.id,
      rinkId: rental.rink_id,
      parentUserId: userId,
      parentEmail: profile?.email || '',
      itemLabel: (rental as any).equipment_items?.label || 'Equipment Rental',
      currency: rental.currency || 'PHP',
      depositCents: rental.deposit_required_cents - rental.deposit_paid_cents,
      monthlyRateCents: rental.monthly_rate_cents,
      successUrl,
      cancelUrl,
      stripeAccountId,
    });

    return NextResponse.json({ url, sessionId });
  } catch (err) {
    console.error('[parent/rentals/checkout POST]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
