// src/app/api/owner/rinks/[id]/equipment/rentals/[rentalId]/payments/route.ts
//
// Owner: list + record payments for a rental.
//   GET  /api/owner/rinks/[id]/equipment/rentals/{rentalId}/payments
//   POST /api/owner/rinks/[id]/equipment/rentals/{rentalId}/payments
//
// Use cases:
//   - Record a manual payment (cash, bank transfer, GCash, etc.)
//   - List payment history
//   - Mark a payment as refunded (kind=refund)

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwnerForRental } from '@/lib/rental/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PAYMENT_KINDS = ['deposit','monthly','late_fee','damage','replacement','refund'];
const PAYMENT_STATUSES = ['pending','succeeded','failed','refunded'];
const PROVIDERS = ['stripe','paymongo','manual'];

// GET
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; rentalId: string } },
) {
  try {
    await requireRinkOwnerForRental(request, params.id);

    const { data: payments, error } = await supabaseAdmin
      .from('rental_payments')
      .select('*')
      .eq('rental_id', params.rentalId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ payments: payments ?? [] });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[equipment/rental payments GET]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

// POST
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; rentalId: string } },
) {
  try {
    await requireRinkOwnerForRental(request, params.id);
    const body = await request.json();

    // Validate
    const kind = body.kind && PAYMENT_KINDS.includes(body.kind) ? body.kind : 'monthly';
    const status = body.status && PAYMENT_STATUSES.includes(body.status) ? body.status : 'succeeded';
    const provider = body.provider && PROVIDERS.includes(body.provider) ? body.provider : 'manual';

    if (typeof body.amount_cents !== 'number' || body.amount_cents === 0) {
      return NextResponse.json({ error: 'amount_cents is required.' }, { status: 400 });
    }

    // Verify rental belongs to this rink
    const { data: rental, error: rentalErr } = await supabaseAdmin
      .from('equipment_rentals')
      .select('id, rink_id, deposit_required_cents, deposit_paid_cents, currency')
      .eq('id', params.rentalId)
      .eq('rink_id', params.id)
      .maybeSingle();

    if (rentalErr || !rental) {
      return NextResponse.json({ error: 'Rental not found.' }, { status: 404 });
    }

    const payload: Record<string, unknown> = {
      rental_id: params.rentalId,
      rink_id: params.id,
      kind,
      amount_cents: Math.trunc(body.amount_cents),
      currency: String(body.currency || rental.currency),
      status,
      provider,
      provider_payment_id: body.provider_payment_id || null,
      period_start: body.period_start || null,
      period_end: body.period_end || null,
      paid_at: status === 'succeeded' ? new Date().toISOString() : null,
    };

    const { data: payment, error } = await supabaseAdmin
      .from('rental_payments')
      .insert(payload)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update deposit_paid_cents if this was a successful deposit payment
    if (kind === 'deposit' && status === 'succeeded') {
      const newDepositPaid = Math.min(
        rental.deposit_required_cents,
        rental.deposit_paid_cents + Math.abs(Math.trunc(body.amount_cents)),
      );
      await supabaseAdmin
        .from('equipment_rentals')
        .update({ deposit_paid_cents: newDepositPaid })
        .eq('id', params.rentalId);
    }

    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[equipment/rental payments POST]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
