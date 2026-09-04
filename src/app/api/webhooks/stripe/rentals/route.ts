// src/app/api/webhooks/stripe/rentals/route.ts
//
// Stripe webhook handler for rental subscription events.
// Separate from /api/webhooks/stripe (which handles membership tiers) so
// rental logic stays isolated and testable.
//
// Events handled:
//   - checkout.session.completed (mode=subscription) -> activate rental, record deposit payment
//   - invoice.paid -> record monthly rental payment
//   - invoice.payment_failed -> mark payment failed
//   - customer.subscription.deleted -> cancel rental
//
// Configure in Stripe dashboard:
//   URL: https://rinkstop.com/api/webhooks/stripe/rentals
//   Events: checkout.session.completed, invoice.paid, invoice.payment_failed,
//           customer.subscription.deleted

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { constructWebhookEvent } from '@/lib/stripe-connect';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase env vars');
    _supabase = createClient(url, key);
  }
  return _supabase;
}

function nextBillingDate(fromDate: Date): string {
  const next = new Date(fromDate);
  next.setMonth(next.getMonth() + 1);
  return next.toISOString().split('T')[0];
}

async function recordPayment(opts: {
  rentalId: string;
  rinkId: string;
  kind: 'deposit' | 'monthly' | 'late_fee';
  amountCents: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  providerPaymentId?: string;
  periodStart?: Date;
  periodEnd?: Date;
}) {
  const supabase = getSupabase() as any;
  const { error } = await supabase.from('rental_payments').insert({
    rental_id: opts.rentalId,
    rink_id: opts.rinkId,
    kind: opts.kind,
    amount_cents: opts.amountCents,
    currency: opts.currency,
    status: opts.status,
    provider: 'stripe',
    provider_payment_id: opts.providerPaymentId || null,
    period_start: opts.periodStart ? opts.periodStart.toISOString().split('T')[0] : null,
    period_end: opts.periodEnd ? opts.periodEnd.toISOString().split('T')[0] : null,
    paid_at: opts.status === 'succeeded' ? new Date().toISOString() : null,
  });
  if (error) {
    console.error('[rental webhook] Failed to record payment', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event;
  try {
    event = constructWebhookEvent(body, signature);
  } catch (err) {
    console.error('[rental webhook] Signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  const supabase = getSupabase() as any;

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        if (session.metadata?.kind !== 'rental') break; // not our event
        const rentalId = session.metadata.rental_id;
        const rinkId = session.metadata.rink_id;

        // Get the subscription to extract the Stripe subscription ID
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

        // Load rental to know deposit + monthly amounts
        const { data: rental } = await supabase
          .from('equipment_rentals')
          .select('*')
          .eq('id', rentalId)
          .maybeSingle();

        if (!rental) {
          console.error('[rental webhook] Rental not found:', rentalId);
          break;
        }

        // Record deposit payment (one-time setup)
        if (rental.deposit_required_cents > rental.deposit_paid_cents) {
          await recordPayment({
            rentalId,
            rinkId,
            kind: 'deposit',
            amountCents: rental.deposit_required_cents - rental.deposit_paid_cents,
            currency: rental.currency,
            status: 'succeeded',
            providerPaymentId: customerId,
          });
        }

        // Activate the rental
        await supabase
          .from('equipment_rentals')
          .update({
            status: 'active',
            deposit_paid_cents: rental.deposit_required_cents,
            stripe_subscription_id: subscriptionId,
            approved_at: new Date().toISOString(),
          })
          .eq('id', rentalId);

        console.log('[rental webhook] Activated rental', rentalId, 'subscription:', subscriptionId);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any;
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
        if (!subscriptionId) break;

        // Find rental by stripe_subscription_id
        const { data: rental } = await supabase
          .from('equipment_rentals')
          .select('*')
          .eq('stripe_subscription_id', subscriptionId)
          .maybeSingle();

        if (!rental) break;

        // Skip the first invoice — that's the setup/deposit invoice already recorded on checkout.session.completed
        if (invoice.billing_reason === 'subscription_create') break;

        const periodStart = invoice.lines?.data?.[0]?.period?.start ? new Date(invoice.lines.data[0].period.start * 1000) : undefined;
        const periodEnd = invoice.lines?.data?.[0]?.period?.end ? new Date(invoice.lines.data[0].period.end * 1000) : undefined;

        await recordPayment({
          rentalId: rental.id,
          rinkId: rental.rink_id,
          kind: 'monthly',
          amountCents: invoice.amount_paid,
          currency: (invoice.currency || 'php').toUpperCase(),
          status: 'succeeded',
          providerPaymentId: invoice.id,
          periodStart,
          periodEnd,
        });

        // Update next_bill_at to the end of this period
        if (periodEnd) {
          await supabase
            .from('equipment_rentals')
            .update({ next_bill_at: nextBillingDate(periodEnd) })
            .eq('id', rental.id);
        }

        console.log('[rental webhook] Recorded monthly payment for rental', rental.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
        if (!subscriptionId) break;

        const { data: rental } = await supabase
          .from('equipment_rentals')
          .select('*')
          .eq('stripe_subscription_id', subscriptionId)
          .maybeSingle();

        if (!rental) break;

        await recordPayment({
          rentalId: rental.id,
          rinkId: rental.rink_id,
          kind: 'monthly',
          amountCents: invoice.amount_due,
          currency: (invoice.currency || 'php').toUpperCase(),
          status: 'failed',
          providerPaymentId: invoice.id,
        });

        // Mark rental as overdue (still active for the kid but in collections state)
        await supabase
          .from('equipment_rentals')
          .update({ status: 'overdue' })
          .eq('id', rental.id);

        console.log('[rental webhook] Marked rental overdue:', rental.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const { data: rental } = await supabase
          .from('equipment_rentals')
          .select('*')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle();

        if (!rental) break;

        // Only auto-cancel if status is already overdue (i.e. parent didn't pay after retry).
        // Otherwise the parent is just ending the rental normally; let them.
        if (rental.status === 'overdue') {
          await supabase
            .from('equipment_rentals')
            .update({ status: 'cancelled' })
            .eq('id', rental.id);
          console.log('[rental webhook] Auto-cancelled overdue rental:', rental.id);
        }
        break;
      }

      default:
        // ignore other event types
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[rental webhook] Handler error', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
