import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_ROLES = ['head_coach','assistant_coach','manager','president','vice_president','treasurer','secretary'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();
  const body = await request.json();

  // Validate input
  if (!body.title || typeof body.title !== 'string') {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }
  if (typeof body.amount_per_player !== 'number' || body.amount_per_player < 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  // Find team
  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  // Verify caller is admin on this team
  const { data: myMembership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  if (!myMembership || !ADMIN_ROLES.includes(myMembership.role)) {
    return NextResponse.json({ error: 'Coaches only' }, { status: 403 });
  }

  // Create payment
  const { data: payment, error: createErr } = await supabaseAdmin
    .from('payments')
    .insert({
      team_id: team.id,
      created_by: userId,
      title: body.title,
      description: body.description || null,
      amount_per_player: body.amount_per_player,
      currency: body.currency || 'PHP',
      convenience_fee_pct: body.convenience_fee_pct ?? 5,
      due_date: body.due_date || null,
      status: 'open',
    })
    .select('id')
    .single();
  if (createErr || !payment) {
    return NextResponse.json({ error: createErr?.message || 'Insert failed' }, { status: 500 });
  }

  // Auto-create payment_records for all current team members
  const { data: members } = await supabaseAdmin
    .from('team_members')
    .select('user_id')
    .eq('team_id', team.id)
    .is('left_at', null);

  if (members && members.length > 0) {
    const records = members.map((m) => ({
      payment_id: payment.id,
      player_id: m.user_id,
      amount_due: body.amount_per_player,
      amount_paid: 0,
      status: 'unpaid',
    }));
    const { error: recErr } = await supabaseAdmin
      .from('payment_records')
      .insert(records);
    if (recErr) {
      console.error('[payments] Failed to create payment_records:', recErr);
      // Non-fatal: payment exists, but no per-player rows
    }
  }

  return NextResponse.json({ ok: true, payment });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  // Verify caller is on team
  const { data: myMembership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  if (!myMembership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('team_id', team.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ ok: true, payments });
}