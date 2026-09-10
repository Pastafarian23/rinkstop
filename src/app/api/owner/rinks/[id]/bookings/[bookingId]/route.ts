// /api/owner/rinks/[id]/bookings/[bookingId]
//
// PATCH endpoint for the rink owner to update an admin_arranged_booking.
//
// Auth: caller must be an approved claimant of this rink (same pattern as
// /api/owner/rinks/[id]/booking-inquiries/[inquiryId]/route.ts and
// src/lib/owner-auth.ts). Service role + explicit claim check = belt-and-
// suspenders alongside the RLS policy that allows rink-owner SELECT/UPDATE.
//
// What the rink owner can change:
//   - status: confirmed | declined | completed
//   - cancelled_reason: required when status='declined'
//
// What the rink owner CANNOT change (admin-only fields, server rejects):
//   - price_cents, fee_cents, settlement_cents (math must hold)
//   - payment_status, paid_at (Stripe webhook sets these)
//   - settlement_status, settlement_method, settlement_reference (admin marks)
//
// State machine:
//   pending_payment → confirmed | declined
//   paid            → confirmed | declined
//   confirmed       → completed | declined
//   declined | cancelled | completed | refunded → no transitions allowed

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['confirmed', 'declined'],
  paid: ['confirmed', 'declined'],
  confirmed: ['completed', 'declined'],
};

function err(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bookingId: string }> },
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return err('Authentication required.', 401);
  }

  const { id: rinkId, bookingId } = await params;

  // Verify the caller is an approved claimant of this rink
  const { data: claim } = await supabaseAdmin
    .from('claims')
    .select('id')
    .eq('entity_id', rinkId)
    .eq('claim_type', 'rink')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .maybeSingle();

  if (!claim) {
    return err('You must be an approved rink claimant to update this booking.', 403);
  }

  // Verify the booking belongs to this rink (defense-in-depth — the API URL
  // already encodes it but the SQL should match)
  const { data: booking, error: lookupErr } = await supabaseAdmin
    .from('admin_arranged_bookings')
    .select('id, rink_id, status, settlement_status')
    .eq('id', bookingId)
    .eq('rink_id', rinkId)
    .maybeSingle();

  if (lookupErr || !booking) {
    return err('Booking not found for this rink.', 404);
  }

  // Parse + validate body
  let body: { status?: string; cancelled_reason?: string };
  try {
    body = await request.json();
  } catch {
    return err('invalid_json');
  }

  if (!body.status) return err('status_required');

  // Rink owner can only set these specific statuses
  const ALLOWED_BY_RINK = new Set(['confirmed', 'declined', 'completed']);
  if (!ALLOWED_BY_RINK.has(body.status)) {
    return err(`Rink owner can only set status to: ${Array.from(ALLOWED_BY_RINK).join(', ')}.`, 403);
  }

  // State-machine check
  const transitions = ALLOWED_TRANSITIONS[booking.status] || [];
  if (!transitions.includes(body.status)) {
    return err(`Cannot transition from "${booking.status}" to "${body.status}". Allowed transitions: ${transitions.join(', ') || '(none)'}.`, 400);
  }

  // Decline requires a reason
  const updates: Record<string, unknown> = { status: body.status };
  if (body.status === 'declined') {
    if (!body.cancelled_reason || !body.cancelled_reason.trim()) {
      return err('cancelled_reason_required_when_declining');
    }
    updates.cancelled_reason = body.cancelled_reason.trim();
    updates.cancelled_by_user_id = userId;
  }

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('admin_arranged_bookings')
    .update(updates)
    .eq('id', bookingId)
    .select('id, status, cancelled_reason, updated_at')
    .single();

  if (updateErr || !updated) {
    console.error('[owner/bookings] update failed', updateErr);
    return err('update_failed', 500);
  }

  // Fire-and-forget: notify Arnel about the status change so he can
  // track the broker flow. Uses existing rink-notifications pattern.
  try {
    await supabaseAdmin.from('admin_notifications').insert({
      kind: `rink_booking_${body.status}`,
      actor_user_id: userId,
      title: `Booking ${body.status}: ${bookingId.slice(0, 8)}`,
      body: `Rink owner ${body.status} the booking${body.cancelled_reason ? `. Reason: ${body.cancelled_reason}` : '.'}`,
      action_url: `/dashboard/admin/bookings/${bookingId}`,
      metadata: {
        booking_id: bookingId,
        rink_id: rinkId,
        new_status: body.status,
        ...(body.cancelled_reason ? { cancelled_reason: body.cancelled_reason } : {}),
      },
    });
  } catch (notifyErr) {
    console.error('[owner/bookings] admin notification failed (update still saved)', notifyErr);
  }

  return NextResponse.json({ ok: true, booking: updated });
}