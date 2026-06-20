import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_ROLES = ['head_coach','assistant_coach','manager','president','vice_president','treasurer','secretary'];

/**
 * Bulk mark all unpaid records in a payment as paid.
 * Used by coaches right after a Sunday session to flip everyone who paid in person
 * (cash, GCash direct to coach's personal account) to "paid" status at once.
 *
 * Body:
 *   { paid_via?: string, reference_number?: string, notes?: string,
 *     only_unpaid?: boolean (default true) }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug, id: paymentId } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();
  const body = await request.json().catch(() => ({}));

  // Find team + payment
  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('id, amount_per_player, currency, team_id, title')
    .eq('id', paymentId)
    .eq('team_id', team.id)
    .maybeSingle();
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

  // Verify admin
  const { data: myMembership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  if (!myMembership || !ADMIN_ROLES.includes(myMembership.role)) {
    return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  }

  const onlyUnpaid = body.only_unpaid !== false; // default true
  const paidVia = body.paid_via || 'cash';
  const referenceNumber = body.reference_number || null;
  const notes = body.notes || null;

  // Build update filter
  let query = supabaseAdmin
    .from('payment_records')
    .update({
      status: 'paid',
      paid_via: paidVia,
      reference_number: referenceNumber,
      notes,
      amount_paid: payment.amount_per_player,
      paid_at: new Date().toISOString(),
      marked_by: userId,
    })
    .eq('payment_id', paymentId);
  if (onlyUnpaid) {
    query = query.in('status', ['unpaid', 'pending_verification']);
  }

  const { data: updated, error: updateErr } = await query.select('id, player_id, status');
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    marked_count: (updated || []).length,
    payment: { id: payment.id, title: payment.title },
  });
}