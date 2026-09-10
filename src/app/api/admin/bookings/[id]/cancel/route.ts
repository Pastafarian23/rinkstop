// /api/admin/bookings/[id]/cancel
//
// POST: admin cancels a booking. Reason required.
//
// State machine:
//   pending_payment | paid | confirmed → cancelled
//   completed | already cancelled | refunded → 400 (no transitions allowed)
//
// Side effects:
//   - Updates admin_arranged_bookings.status = 'cancelled' + cancelled_reason + cancelled_by_user_id
//   - Inserts an admin notification
//   - Does NOT auto-refund — admin must issue Stripe refund manually
//     (Phase 4 will automate via Stripe API). For the pilot this is fine
//     because there's only 1 admin and the flow is low-volume.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function err(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const admin = await requireAdmin().catch((): null => null);
  if (!admin) return err('admin_only', 401);

  const { id } = await params;

  let body: { reason?: string };
  try {
    body = await request.json();
  } catch {
    return err('invalid_json');
  }

  if (!body.reason || !body.reason.trim()) return err('reason_required');

  const { data: booking, error: lookupErr } = await supabaseAdmin
    .from('admin_arranged_bookings')
    .select('id, status')
    .eq('id', id)
    .maybeSingle();

  if (lookupErr || !booking) return err('booking_not_found', 404);

  if (booking.status === 'cancelled' || booking.status === 'completed' || booking.status === 'refunded') {
    return err(`Cannot cancel a booking already in "${booking.status}" state.`, 400);
  }

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('admin_arranged_bookings')
    .update({
      status: 'cancelled',
      cancelled_reason: body.reason.trim(),
      cancelled_by_user_id: admin.userId,
    })
    .eq('id', id)
    .select('id, status, cancelled_reason')
    .single();

  if (updateErr || !updated) return err('update_failed', 500);

  // Fire-and-forget admin notification
  void supabaseAdmin.from('admin_notifications').insert({
    kind: 'admin_booking_cancelled',
    actor_user_id: admin.userId,
    title: `Booking cancelled: ${id.slice(0, 8)}`,
    body: `Reason: ${body.reason.trim()}`,
    action_url: `/admin/bookings/${id}`,
    metadata: { booking_id: id, reason: body.reason.trim() },
  }).then(({ error }) => {
    if (error) console.error('[admin/bookings/cancel] notification failed', error);
  });

  return NextResponse.json({ ok: true, booking: updated });
}