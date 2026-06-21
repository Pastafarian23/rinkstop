import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getPaymentProvider, phpToCentavos } from '@/lib/payments';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/team/[slug]/payments/[id]/records/[recordId]/create-checkout
 *
 * Admin (or the player themselves) creates a hosted checkout session for
 * a single payment record. Returns the URL the player gets redirected to.
 *
 * Currently returns 503 if no payment provider is configured (env vars missing).
 * Once PAYMONGO_SECRET_KEY or MAYA_SECRET_KEY is set + provider is implemented,
 * this returns a real checkout URL.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string; recordId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug, id: paymentId, recordId } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('id, title, amount_per_player, currency, team_id, convenience_fee_pct')
    .eq('id', paymentId)
    .eq('team_id', team.id)
    .maybeSingle();
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

  const { data: record } = await supabaseAdmin
    .from('payment_records')
    .select('id, player_id, amount_due, status')
    .eq('id', recordId)
    .eq('payment_id', paymentId)
    .maybeSingle();
  if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

  // Either admin of the team OR the player themselves
  const isPlayer = record.player_id === userId;
  if (!isPlayer) {
    const { data: myMembership } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('team_id', team.id)
      .eq('user_id', userId)
      .is('left_at', null)
      .maybeSingle();
    const ADMIN_ROLES = ['head_coach','assistant_coach','manager','treasurer','president','vice_president','secretary'];
    if (!myMembership || !ADMIN_ROLES.includes(myMembership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (record.status === 'paid') {
    return NextResponse.json({ error: 'Record is already paid' }, { status: 400 });
  }

  const provider = getPaymentProvider();
  if (!provider.configured) {
    return NextResponse.json({
      ok: false,
      error: 'payments_not_configured',
      message: 'No payment provider is configured yet. See docs/paymongo-setup.md or docs/maya-business-setup.md.',
    }, { status: 503 });
  }

  // Build line items: session fee + RinkStop service fee
  const sessionAmountCentavos = phpToCentavos(String(payment.amount_per_player));
  const feePct = Number(payment.convenience_fee_pct ?? 5);
  const rinkstopFeeCentavos = Math.round(sessionAmountCentavos * (feePct / 100));
  const totalCentavos = sessionAmountCentavos + rinkstopFeeCentavos;

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';

  const result = await provider.createCheckout({
    referenceNumber: `rinkstop-${recordId}`,
    description: `${payment.title} - RinkStop payment`,
    lineItems: [
      { name: payment.title, amount: sessionAmountCentavos, currency: 'PHP', quantity: 1 },
      { name: `RinkStop service fee (${feePct}%)`, amount: rinkstopFeeCentavos, currency: 'PHP', quantity: 1 },
    ],
    successUrl: `${origin}/dashboard/payments?paid=${recordId}`,
    cancelUrl: `${origin}/dashboard/payments?cancelled=${recordId}`,
    customerEmail: undefined, // resolved below
    metadata: {
      record_id: recordId,
      payment_id: paymentId,
      team_id: team.id,
      player_id: record.player_id,
      rinkstop_fee_centavos: String(rinkstopFeeCentavos),
    },
  });

  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      error: result.error,
      code: result.code,
    }, { status: result.code === 'not_configured' ? 503 : 500 });
  }
  const success = result;

  return NextResponse.json({
    ok: true,
    checkoutId: success.checkoutId,
    url: success.url,
    expiresAt: success.expiresAt,
    breakdown: {
      session: sessionAmountCentavos,
      rinkstopFee: rinkstopFeeCentavos,
      total: totalCentavos,
      currency: 'PHP',
    },
  });
}