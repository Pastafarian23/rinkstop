// src/app/api/owner/rinks/[id]/equipment/settings/route.ts
//
// Owner rink rental settings.
//   GET /api/owner/rinks/[id]/equipment/settings
//   PUT /api/owner/rinks/[id]/equipment/settings
//
// RLS-gated: signed-in user must own the rink.

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwnerForRental } from '@/lib/rental/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRinkOwnerForRental(request, params.id);
    const { data: settings, error } = await supabaseAdmin
      .from('rink_rental_settings')
      .select('*')
      .eq('rink_id', params.id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ settings: settings ?? null });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[equipment/settings GET]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

// PUT — upsert settings for this rink
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const owner = await requireRinkOwnerForRental(request, params.id);
    const body = await request.json();

    const payload: Record<string, unknown> = { rink_id: params.id };

    if (body.deposit_policy && ['none','required','optional'].includes(body.deposit_policy)) {
      payload.deposit_policy = body.deposit_policy;
    }
    if (typeof body.default_deposit_cents === 'number') {
      payload.default_deposit_cents = Math.trunc(body.default_deposit_cents);
    }
    if (body.currency && /^[A-Z]{3}$/.test(body.currency)) payload.currency = body.currency;

    if (body.billing_cycle && ['monthly','per_session'].includes(body.billing_cycle)) {
      payload.billing_cycle = body.billing_cycle;
    }
    if (typeof body.billing_day === 'number') {
      payload.billing_day = Math.min(28, Math.max(1, Math.trunc(body.billing_day)));
    }
    if (typeof body.late_fee_cents === 'number') payload.late_fee_cents = Math.trunc(body.late_fee_cents);

    if (body.agreement_template !== undefined) payload.agreement_template = body.agreement_template || null;
    if (body.rental_terms !== undefined) payload.rental_terms = body.rental_terms || null;

    const { data: settings, error } = await supabaseAdmin
      .from('rink_rental_settings')
      .upsert(payload, { onConflict: 'rink_id' })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ settings });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[equipment/settings PUT]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
