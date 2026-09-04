// src/app/api/owner/rinks/[id]/equipment/rentals/[rentalId]/route.ts
//
// Single rental: read, update (return/overdue), delete.
//   GET    /api/owner/rinks/[id]/equipment/rentals/{rentalId}
//   PATCH  /api/owner/rinks/[id]/equipment/rentals/{rentalId}
//   DELETE /api/owner/rinks/[id]/equipment/rentals/{rentalId}

import { NextRequest, NextResponse } from 'next/server';
import { requireRinkOwnerForRental } from '@/lib/rental/owner-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RENTAL_STATUSES = ['pending','active','overdue','returned','cancelled'];

// GET
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rentalId: string }> },
) {
  try {
    await requireRinkOwnerForRental(request, ((await params).id));
    const { data: rental, error } = await supabaseAdmin
      .from('equipment_rentals')
      .select('*')
      .eq('id', ((await params).rentalId))
      .eq('rink_id', ((await params).id))
      .maybeSingle();

    if (error || !rental) {
      return NextResponse.json({ error: 'Rental not found.' }, { status: 404 });
    }

    // Load linked assignments
    const { data: assignments } = await supabaseAdmin
      .from('equipment_assignments')
      .select('*')
      .eq('equipment_id', rental.item_id)
      .order('starts_at', { ascending: false });

    // Load payments
    const { data: payments } = await supabaseAdmin
      .from('rental_payments')
      .select('*')
      .eq('rental_id', rental.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      rental,
      assignments: assignments ?? [],
      payments: payments ?? [],
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[equipment/rental GET]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

// PATCH — return / cancel / approve / adjust pricing
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rentalId: string }> },
) {
  try {
    await requireRinkOwnerForRental(request, ((await params).id));
    const body = await request.json();

    const updatePayload: Record<string, unknown> = {};
    if (body.status && RENTAL_STATUSES.includes(body.status)) updatePayload.status = body.status;
    if (body.ends_at) updatePayload.ends_at = String(body.ends_at);
    if (body.notes !== undefined) updatePayload.notes = body.notes;
    if (typeof body.monthly_rate_cents === 'number') updatePayload.monthly_rate_cents = Math.trunc(body.monthly_rate_cents);
    if (typeof body.deposit_required_cents === 'number') updatePayload.deposit_required_cents = Math.trunc(body.deposit_required_cents);
    if (typeof body.deposit_paid_cents === 'number') updatePayload.deposit_paid_cents = Math.trunc(body.deposit_paid_cents);
    if (body.next_bill_at) updatePayload.next_bill_at = String(body.next_bill_at);
    if (body.stripe_subscription_id !== undefined) updatePayload.stripe_subscription_id = body.stripe_subscription_id;
    if (body.approved_at === 'now') updatePayload.approved_at = new Date().toISOString();
    if (body.approved_by_user_id) updatePayload.approved_by_user_id = body.approved_by_user_id;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    // Return flow: close the assignment too
    if (body.status === 'returned') {
      const { data: rental } = await supabaseAdmin
        .from('equipment_rentals')
        .select('item_id')
        .eq('id', ((await params).rentalId))
        .maybeSingle();

      if (rental) {
        await supabaseAdmin
          .from('equipment_assignments')
          .update({ returned_at: new Date().toISOString() })
          .eq('equipment_id', rental.item_id)
          .is('returned_at', null);

        await supabaseAdmin.from('equipment_items').update({ status: 'active' }).eq('id', rental.item_id);
      }
    }

    const { data: updatedRental, error } = await supabaseAdmin
      .from('equipment_rentals')
      .update(updatePayload)
      .eq('id', ((await params).rentalId))
      .eq('rink_id', ((await params).id))
      .select('*')
      .single();

    if (error || !updatedRental) {
      return NextResponse.json({ error: error?.message ?? 'Rental not found.' }, { status: 404 });
    }

    return NextResponse.json({ rental: updatedRental });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[equipment/rental PATCH]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}

// DELETE — cancel the rental
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; rentalId: string }> },
) {
  try {
    await requireRinkOwnerForRental(request, ((await params).id));

    const { data: rental, error: fetchErr } = await supabaseAdmin
      .from('equipment_rentals')
      .select('id, item_id, status')
      .eq('id', ((await params).rentalId))
      .eq('rink_id', ((await params).id))
      .maybeSingle();

    if (fetchErr || !rental) {
      return NextResponse.json({ error: 'Rental not found.' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('equipment_rentals')
      .update({ status: 'cancelled' })
      .eq('id', ((await params).rentalId));

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // If the item was lent out, reset it
    if (rental.status === 'active' || rental.status === 'overdue') {
      await supabaseAdmin.from('equipment_items').update({ status: 'active' }).eq('id', rental.item_id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'UNAUTHENTICATED') return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    if (msg === 'RINK_NOT_FOUND') return NextResponse.json({ error: 'Rink not found.' }, { status: 404 });
    if (msg === 'FORBIDDEN') return NextResponse.json({ error: 'You do not own this rink.' }, { status: 403 });
    console.error('[equipment/rental DELETE]', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
