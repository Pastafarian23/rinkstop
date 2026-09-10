// /api/admin/bookings/[id]/settlement
//
// POST: mark settlement as sent (or confirmed if already sent).
// Used by the admin detail page to record the offline wire/GCash/etc.
//
// State machine:
//   not_sent → sent       (admin records the wire + reference)
//   sent     → confirmed  (admin confirms the rink acknowledged receipt)
//
// Backwards: sent → not_sent allowed if admin made a mistake (clear the
// settlement log by setting status='not_sent' and clearing fields).
//
// Auth: requireAdmin()

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_METHODS = new Set(['offline', 'gcash', 'bank_transfer', 'stripe_connect', 'paymongo', 'paymaya']);

function err(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const admin = await requireAdmin().catch((): null => null);
  if (!admin) return err('admin_only', 401);

  const { id } = await params;

  let body: { method?: string; reference?: string | null; action?: 'sent' | 'confirmed' | 'clear' };
  try {
    body = await request.json();
  } catch {
    return err('invalid_json');
  }

  // Fetch current state
  const { data: booking, error: lookupErr } = await supabaseAdmin
    .from('admin_arranged_bookings')
    .select('id, status, payment_status, settlement_status')
    .eq('id', id)
    .maybeSingle();

  if (lookupErr || !booking) return err('booking_not_found', 404);

  // Refuse if booking is not in a state where settlement makes sense
  if (booking.status !== 'paid' && booking.status !== 'confirmed' && booking.status !== 'completed') {
    return err(`Cannot mark settlement on a booking in "${booking.status}" state. Booking must be paid, confirmed, or completed.`, 400);
  }

  const action = body.action || (booking.settlement_status === 'sent' ? 'confirmed' : 'sent');

  if (action === 'clear') {
    // Admin made a mistake, clear the log
    const { error: updateErr } = await supabaseAdmin
      .from('admin_arranged_bookings')
      .update({
        settlement_status: 'not_sent',
        settlement_method: null,
        settlement_sent_at: null,
        settlement_reference: null,
      })
      .eq('id', id);
    if (updateErr) return err('update_failed', 500);
    return NextResponse.json({ ok: true, settlement_status: 'not_sent' });
  }

  if (action === 'sent') {
    if (!body.method || !VALID_METHODS.has(body.method)) {
      return err(`method_required_and_must_be_one_of: ${Array.from(VALID_METHODS).join(', ')}`);
    }
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('admin_arranged_bookings')
      .update({
        settlement_status: 'sent',
        settlement_method: body.method,
        settlement_sent_at: new Date().toISOString(),
        settlement_reference: body.reference || null,
      })
      .eq('id', id)
      .select('settlement_status, settlement_method, settlement_sent_at, settlement_reference')
      .single();
    if (updateErr || !updated) return err('update_failed', 500);
    return NextResponse.json({ ok: true, settlement: updated });
  }

  if (action === 'confirmed') {
    if (booking.settlement_status !== 'sent') {
      return err('Can only confirm a settlement that is already in "sent" state.', 400);
    }
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('admin_arranged_bookings')
      .update({ settlement_status: 'confirmed' })
      .eq('id', id)
      .select('settlement_status')
      .single();
    if (updateErr || !updated) return err('update_failed', 500);
    return NextResponse.json({ ok: true, settlement_status: 'confirmed' });
  }

  return err(`invalid_action: ${action}`);
}