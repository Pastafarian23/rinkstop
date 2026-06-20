import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_ROLES = ['head_coach','assistant_coach','manager','president','vice_president','treasurer','secretary'];

function addInterval(date: Date, recurrence: string): Date {
  const next = new Date(date);
  if (recurrence === 'weekly') next.setDate(next.getDate() + 7);
  else if (recurrence === 'biweekly') next.setDate(next.getDate() + 14);
  else if (recurrence === 'monthly') next.setMonth(next.getMonth() + 1);
  return next;
}

/**
 * Generate the next instance of a recurring payment.
 * - Reads the source payment's recurrence + due_date + amount + convenience fee
 * - Creates a new payment with due_date shifted by the interval
 * - Auto-creates payment_records for current team members
 * - Returns the new payment id
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug, id: paymentId } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  const { data: source } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .eq('team_id', team.id)
    .maybeSingle();
  if (!source) return NextResponse.json({ error: 'Source payment not found' }, { status: 404 });

  if (!source.recurrence) {
    return NextResponse.json({ error: 'Source payment is not recurring' }, { status: 400 });
  }

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

  // Compute next due date — based on the LATEST existing instance (handles missed weeks)
  const { data: latest } = await supabaseAdmin
    .from('payments')
    .select('id, due_date, sequence_number')
    .or(`id.eq.${source.id},parent_payment_id.eq.${source.id}`)
    .order('sequence_number', { ascending: false, nullsFirst: false })
    .limit(1);

  const baseDate = (latest && latest[0]?.due_date)
    ? new Date(latest[0].due_date as string)
    : (source.due_date ? new Date(source.due_date) : new Date());
  const nextDate = addInterval(baseDate, source.recurrence);
  const nextSequence = ((latest && latest[0]?.sequence_number) || 1) + 1;

  // Create new payment
  const { data: newPayment, error: createErr } = await supabaseAdmin
    .from('payments')
    .insert({
      team_id: source.team_id,
      created_by: userId,
      title: source.title,
      description: source.description,
      amount_per_player: source.amount_per_player,
      currency: source.currency,
      convenience_fee_pct: source.convenience_fee_pct,
      due_date: nextDate.toISOString().slice(0, 10),
      status: 'open',
      recurrence: source.recurrence,
      parent_payment_id: source.id,
      sequence_number: nextSequence,
    })
    .select('id, due_date, sequence_number')
    .single();
  if (createErr || !newPayment) {
    return NextResponse.json({ error: createErr?.message || 'Insert failed' }, { status: 500 });
  }

  // Auto-create per-player records
  const { data: members } = await supabaseAdmin
    .from('team_members')
    .select('user_id')
    .eq('team_id', team.id)
    .is('left_at', null);

  if (members && members.length > 0) {
    const records = members.map(m => ({
      payment_id: newPayment.id,
      player_id: m.user_id,
      amount_due: source.amount_per_player,
      amount_paid: 0,
      status: 'unpaid',
    }));
    await supabaseAdmin.from('payment_records').insert(records);
  }

  return NextResponse.json({
    ok: true,
    payment: newPayment,
    next_due_date: nextDate.toISOString().slice(0, 10),
    sequence_number: nextSequence,
  });
}