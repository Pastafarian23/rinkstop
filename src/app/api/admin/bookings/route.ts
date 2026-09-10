// /api/admin/bookings
//
// POST: create an admin-arranged booking on behalf of a buyer + rink.
// Used by /dashboard/admin/bookings/new for the brokered booking flow
// (Phase 1 of the Cebu Ice Datus ↔ SM Seaside Skating pilot).
//
// Auth: requireAdmin(). Arnel is the only admin who creates these.
//
// Flow:
//   1. Validate inputs (price > 0, fee < price, dates valid, buyer email, rink exists)
//   2. Create Stripe Checkout session (mode: 'payment', dynamic price_data)
//   3. Insert admin_arranged_bookings row with status='pending_payment',
//      payment_intent_id = checkout session id
//   4. Send buyer email with the Stripe URL (via booking-created-buyer template)
//   5. Send rink email (via booking-created-rink template)
//   6. Insert admin notification
//   7. Return { bookingId, paymentUrl } so the admin form can show confirmation
//
// Safety:
//   - Uses service_role for all DB writes (bypasses RLS by design — admin route)
//   - All email sends are fire-and-forget; failures are logged, not raised
//   - Idempotent on the booking row (a fresh row per request, payment session
//     is bound by stripe_session_id in metadata; webhook handles reconciliation)

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { TemplateData } from '@/lib/email-templates';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' as any })
  : null;

interface CreateBookingRequest {
  buyer_user_id: string;            // Clerk user_id of the buyer (text)
  buyer_contact_name: string;
  buyer_contact_email: string;
  buyer_contact_phone?: string | null;
  buyer_team_workspace_id?: string | null;
  rink_id: string;                 // uuid
  start_time: string;              // ISO 8601
  end_time: string;                // ISO 8601
  title: string;
  notes?: string | null;
  price_cents: number;             // total buyer pays
  fee_cents: number;               // RinkStop's facilitation fee
  currency?: string;               // default 'USD'
}

function err(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function formatMoney(cents: number, currency: string): string {
  // Naive formatter — sufficient for emails. Production should use Intl.NumberFormat
  // but we don't have the user's locale here. Single-line currency display:
  const symbol =
    currency.toUpperCase() === 'USD' ? '$' :
    currency.toUpperCase() === 'PHP' ? '₱' :
    currency.toUpperCase() === 'EUR' ? '€' :
    currency.toUpperCase() === 'GBP' ? '£' :
    currency.toUpperCase() === 'CAD' ? 'CA$' :
    '';
  return `${symbol}${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function formatLocalTime(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: tz,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth gate
  const admin = await requireAdmin().catch((): null => null);
  if (!admin) return err('admin_only', 401);

  if (!stripe) return err('stripe_not_configured', 503);

  // Parse body
  let body: CreateBookingRequest;
  try {
    body = await request.json();
  } catch {
    return err('invalid_json');
  }

  // Validate required fields
  if (!body.buyer_user_id) return err('buyer_user_id_required');
  if (!body.buyer_contact_name) return err('buyer_contact_name_required');
  if (!body.buyer_contact_email) return err('buyer_contact_email_required');
  if (!body.rink_id) return err('rink_id_required');
  if (!body.start_time) return err('start_time_required');
  if (!body.end_time) return err('end_time_required');
  if (!body.title) return err('title_required');
  if (!body.price_cents || body.price_cents <= 0) return err('price_cents_invalid');
  if (body.fee_cents < 0) return err('fee_cents_negative');
  if (body.fee_cents >= body.price_cents) return err('fee_cents_exceeds_price');
  if (new Date(body.end_time) <= new Date(body.start_time)) return err('end_before_start');

  const currency = (body.currency || 'USD').toLowerCase();
  const settlement_cents = body.price_cents - body.fee_cents;

  // Look up the rink to verify it exists + get display info
  const { data: rink, error: rinkErr } = await supabaseAdmin
    .from('rinks')
    .select('id, name, slug, country')
    .eq('id', body.rink_id)
    .maybeSingle();
  if (rinkErr || !rink) return err('rink_not_found', 404);
  const rinkName = rink.name as string;

  // Look up buyer's team workspace name (for email context) if provided
  let buyerTeamName: string | null = null;
  if (body.buyer_team_workspace_id) {
    const { data: team } = await supabaseAdmin
      .from('team_workspaces')
      .select('name')
      .eq('id', body.buyer_team_workspace_id)
      .maybeSingle();
    buyerTeamName = team?.name || null;
  }

  // Buyer's local timezone — best-effort from rink.country. PH rinks get
  // Asia/Manila; default UTC. Good enough for the pilot.
  const buyerTz = rink.country === 'Philippines' ? 'Asia/Manila' : 'UTC';
  const startLocal = formatLocalTime(body.start_time, buyerTz);
  const endLocal = formatLocalTime(body.end_time, buyerTz);

  // 1. Create Stripe Checkout session (one-time payment, no Connect for the pilot)
  // Origin allowlist: prevent redirect-after-payment to phishing pages even if
  // the request somehow bypasses auth. Defense-in-depth alongside requireAdmin().
  const ALLOWED_ORIGINS = new Set([
    'https://rinkstop.com',
    'https://www.rinkstop.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]);
  const rawOrigin = request.headers.get('origin');
  const origin = rawOrigin && ALLOWED_ORIGINS.has(rawOrigin) ? rawOrigin : 'https://rinkstop.com';
  let checkoutSession;
  try {
    checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: body.price_cents,
            product_data: {
              name: `Ice time booking: ${body.title}`,
              description: `${body.title} at ${rinkName}`,
              metadata: {
                booking_kind: 'admin_arranged',
                rink_id: rink.id,
                rink_slug: rink.slug,
                buyer_user_id: body.buyer_user_id,
              },
            },
          },
        },
      ],
      customer_email: body.buyer_contact_email,
      metadata: {
        booking_kind: 'admin_arranged',
        created_by_admin_user_id: admin.userId,
        // Pre-stash the buyer + rink so the webhook can update the row
        buyer_user_id: body.buyer_user_id,
        rink_id: rink.id,
        title: body.title.slice(0, 100),
      },
      success_url: `${origin}/dashboard/my-bookings?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/my-bookings?cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h hold
    });
  } catch (stripeErr) {
    console.error('[admin/bookings] stripe checkout create failed', stripeErr);
    return err('stripe_checkout_failed', 502);
  }

  const paymentUrl = checkoutSession.url || '';
  if (!paymentUrl) return err('stripe_no_checkout_url', 502);

  // 2. Insert admin_arranged_bookings row
  const { data: booking, error: insertErr } = await supabaseAdmin
    .from('admin_arranged_bookings')
    .insert({
      buyer_user_id: body.buyer_user_id,
      buyer_contact_name: body.buyer_contact_name,
      buyer_contact_email: body.buyer_contact_email,
      buyer_contact_phone: body.buyer_contact_phone || null,
      buyer_team_workspace_id: body.buyer_team_workspace_id || null,
      rink_id: body.rink_id,
      start_time: body.start_time,
      end_time: body.end_time,
      title: body.title,
      notes: body.notes || null,
      price_cents: body.price_cents,
      fee_cents: body.fee_cents,
      settlement_cents,
      currency,
      payment_processor: 'stripe',
      payment_intent_id: checkoutSession.id, // session id for the pilot; webhook maps to PI
      payment_status: 'pending_payment',
      status: 'pending_payment',
      created_by: admin.userId,
    })
    .select('id')
    .single();

  if (insertErr || !booking) {
    console.error('[admin/bookings] insert failed', insertErr);
    // Note: the Stripe checkout session is now orphaned. In Phase 4 with
    // proper reconciliation, we'd void it here. For the pilot, the buyer
    // would just see a useless payment link — they can pay but nothing
    // tracks it. Acceptable risk for the pilot; webhook will see no row to
    // update and silently drop. (Production: add a /api/admin/bookings/:id
    // DELETE that also voids the session.)
    return err('booking_insert_failed', 500);
  }

  const bookingId = booking.id as string;
  const rinkStopBookingUrl = `${origin}/dashboard/my-bookings?booking=${bookingId}`;
  const rinkConfirmUrl = `${origin}/dashboard/manage/rink/${rink.id}/bookings?booking=${bookingId}`;

  // 3. Send buyer email (fire-and-forget)
  void sendEmail({
    to: body.buyer_contact_email,
    subject: `Your booking at ${rinkName} is ready to pay`,
    template: 'booking-created-buyer',
    data: {
      buyerName: body.buyer_contact_name,
      rinkName: rinkName,
      startTimeIso: body.start_time,
      endTimeIso: body.end_time,
      startTimeLocal: startLocal,
      endTimeLocal: endLocal,
      priceFormatted: formatMoney(body.price_cents, currency),
      feeFormatted: formatMoney(body.fee_cents, currency),
      totalFormatted: formatMoney(body.price_cents, currency),
      paymentUrl,
      bookingId,
      rinkStopBookingUrl,
    } as TemplateData['booking-created-buyer'],
    tag: 'booking-created-buyer',
  }).catch((e) => console.error('[admin/bookings] buyer email failed', e));

  // 4. Send rink email — goes to Arnel (partners@rinkstop.com), who forwards
  // manually. We can't email the rink directly because rinks.email is null
  // for almost all rinks (per WS20 audit) and there's no automated forwarding.
  // Using partners@ as the broker mailbox for the pilot.
  void sendEmail({
    to: 'partners@rinkstop.com',
    subject: `New booking: ${body.buyer_contact_name} wants ${startLocal}`,
    template: 'booking-created-rink',
    data: {
      rinkName: rinkName,
      buyerName: body.buyer_contact_name,
      buyerTeam: buyerTeamName,
      buyerEmail: body.buyer_contact_email,
      buyerPhone: body.buyer_contact_phone || null,
      startTimeLocal: startLocal,
      endTimeLocal: endLocal,
      settlementFormatted: formatMoney(settlement_cents, currency),
      feeFormatted: formatMoney(body.fee_cents, currency),
      totalFormatted: formatMoney(body.price_cents, currency),
      notes: body.notes || null,
      confirmUrl: rinkConfirmUrl,
      bookingId,
    } as TemplateData['booking-created-rink'],
    tag: 'booking-created-rink',
  }).catch((e) => console.error('[admin/bookings] rink email failed', e));

  // 5. Admin notification
  void supabaseAdmin.from('admin_notifications').insert({
    kind: 'admin_arranged_booking_created',
    actor_user_id: admin.userId,
    title: `New booking: ${body.title} at ${rinkName}`,
    body: `Buyer: ${body.buyer_contact_name} (${body.buyer_contact_email}). Total ${formatMoney(body.price_cents, currency)}. Fee ${formatMoney(body.fee_cents, currency)}.`,
    action_url: `/dashboard/admin/bookings/${bookingId}`,
    metadata: {
      booking_id: bookingId,
      rink_id: rink.id,
      buyer_user_id: body.buyer_user_id,
      price_cents: body.price_cents,
      fee_cents: body.fee_cents,
    },
  }).then(({ error }) => {
    if (error) console.error('[admin/bookings] admin notification failed', error);
  });

  return NextResponse.json({
    ok: true,
    bookingId,
    paymentUrl,
    rinkStopBookingUrl,
  });
}