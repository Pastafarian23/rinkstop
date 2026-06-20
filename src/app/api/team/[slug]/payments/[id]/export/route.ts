import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_ROLES = ['head_coach','assistant_coach','manager','president','vice_president','treasurer','secretary'];

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug, id: paymentId } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, name')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

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

  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('id, title, description, amount_per_player, currency, convenience_fee_pct, due_date, status, created_at')
    .eq('id', paymentId)
    .eq('team_id', team.id)
    .maybeSingle();
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

  const { data: records } = await supabaseAdmin
    .from('payment_records')
    .select('id, player_id, amount_due, amount_paid, status, paid_via, paid_at, reference_number, notes, marked_by, created_at')
    .eq('payment_id', paymentId)
    .order('created_at', { ascending: true });

  // Get player names
  const playerIds = [...new Set((records || []).map(r => r.player_id))];
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('user_id, display_name, username')
    .in('user_id', playerIds);
  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

  // Build CSV
  const header = [
    'Player Name',
    'Player Username',
    'Player ID',
    'Amount Due',
    'Amount Paid',
    'Currency',
    'Status',
    'Paid Via',
    'Reference Number',
    'Paid At',
    'Notes',
    'RinkStop Fee (5%)',
  ];
  const rows = (records || []).map(r => {
    const profile = profileMap.get(r.player_id);
    const feeAmount = parseFloat(String(r.amount_paid || 0)) * (parseFloat(String(payment.convenience_fee_pct || 0)) / 100);
    return [
      profile?.display_name || profile?.username || r.player_id,
      profile?.username || '',
      r.player_id,
      r.amount_due,
      r.amount_paid,
      payment.currency,
      r.status,
      r.paid_via || '',
      r.reference_number || '',
      r.paid_at || '',
      r.notes || '',
      feeAmount.toFixed(2),
    ].map(csvEscape).join(',');
  });

  // Totals row
  const totalDue = (records || []).reduce((sum, r) => sum + parseFloat(String(r.amount_due || 0)), 0);
  const totalPaid = (records || []).reduce((sum, r) => sum + parseFloat(String(r.amount_paid || 0)), 0);
  const totalFee = (records || []).reduce((sum, r) => sum + parseFloat(String(r.amount_paid || 0)) * (parseFloat(String(payment.convenience_fee_pct || 0)) / 100), 0);
  rows.push([
    'TOTAL', '', '',
    totalDue.toFixed(2),
    totalPaid.toFixed(2),
    payment.currency,
    '', '', '', '', '',
    totalFee.toFixed(2),
  ].map(csvEscape).join(','));

  const csv = [header.map(csvEscape).join(','), ...rows].join('\n');
  const filename = `${normalizedSlug}-${payment.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}