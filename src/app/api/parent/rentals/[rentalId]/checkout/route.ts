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
    const successUrl = `${origin}/account/rentals/${params.rentalId}?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/account/rentals/${params.rentalId}?checkout=cancelled`;

    // Load rental + item + parent email
    const { data: rental, error: rentalErr } = await supabaseAdmin
      .from('equipment_rentals')
      .select('*, equipment_items!inner(label), rinks!inner(stripe_account_id)')
      .eq('id', params.rentalId)
      .eq('parent_user_id', userId)
      .maybeSingle();

    if (rentalErr || !rental) {
      return NextResponse.json({ error: 'Rental not found.' }, { status: 404 });
    }

    // Get parent email from Clerk (we use a service-role call)
    // For now, fetch from profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('user_id', userId)
      .maybeSingle();

    const stripeAccountId = (rental as any).rinks?.stripe_account_id || undefined;

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
