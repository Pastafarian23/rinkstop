import { NextRequest, NextResponse } from 'next/server';
import { getPaymentProvider } from '@/lib/payments';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/webhooks/paymongo
 *
 * PayMongo sends payment.paid, payment.failed, etc. events here.
 * We verify the signature, parse the event, and update the payment_record
 * to 'paid' status.
 *
 * STUB: provider is not yet implemented. Returns 503.
 * Once PAYMONGO_SECRET_KEY + PAYMONGO_WEBHOOK_SECRET are set and the provider
 * is wired, this becomes the live webhook receiver.
 */
export async function POST(request: NextRequest) {
  const provider = getPaymentProvider();
  if (!provider.configured || provider.name !== 'paymongo') {
    return NextResponse.json({ error: 'PayMongo not configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

  const parsed = provider.parseWebhook(headers, rawBody);
  if (parsed.ok === false) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (parsed.event === 'payment.paid' && parsed.referenceNumber) {
    const recordId = parsed.referenceNumber.replace(/^rinkstop-/, '');
    const { error } = await supabaseAdmin
      .from('payment_records')
      .update({
        status: 'paid',
        amount_paid: parsed.amount ? parsed.amount / 100 : 0,
        paid_via: 'paymongo',
        paid_at: new Date(parsed.paidAt || Date.now()).toISOString(),
      })
      .eq('id', recordId);
    if (error) {
      console.error('[webhook paymongo] DB update failed:', error);
      return NextResponse.json({ error: 'db_update_failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, received: parsed.event });
}