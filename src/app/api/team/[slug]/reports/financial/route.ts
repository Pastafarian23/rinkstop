/**
 * /api/team/[slug]/reports/financial
 *
 * Phase 1c-3 (Financial Reporting — Club Pro).
 *
 * GET: returns aggregated financial data for the org.
 *   Query params:
 *     - period: 'last_30_days' | 'last_90_days' | 'ytd' | 'all' (default last_90_days)
 *   Returns:
 *     { ok, summary: {...}, by_status: [...], recent_payments: [...] }
 *
 * Tier-gated on Club Pro+ (matches the "Financial reporting" promise on
 * /pricing for Club Pro).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { requireUserId } from '@/lib/connections';
import { tierAtLeastSameTrack } from '@/lib/tier-gate';
import {
  checkRateLimit,
  getClientIP,
  applyRateLimitHeaders,
  maybeCleanup,
} from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function tierOk(tier: string | null | undefined): boolean {
  return tierAtLeastSameTrack(tier, 'club_pro');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`financial-report:${ip}`, { maxRequests: 30, windowMs: 60 * 1000 });
  maybeCleanup();

  const session = await auth();
  if (!session?.userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }
  const userId = await resolveCanonicalUserId(
    await requireUserId(),
    (await currentUser())?.emailAddresses?.[0]?.emailAddress || ''
  );
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  const { slug } = await params;
  const normalizedSlug = (slug || '').toLowerCase().trim();

  const url = new URL(request.url);
  const period = url.searchParams.get('period') || 'last_90_days';

  // Find team
  const { data: team } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, name')
    .eq('slug', normalizedSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!team) {
    const res = NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    return applyRateLimitHeaders(res, rl);
  }

  // Membership + admin check
  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', team.id)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle();
  if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
    const res = NextResponse.json({ error: 'Admin only.' }, { status: 403 });
    return applyRateLimitHeaders(res, rl);
  }

  // Tier gate on the org
  const { data: teamRow } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, owner_user_id')
    .eq('id', team.id)
    .maybeSingle();
  if (!teamRow) {
    const res = NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    return applyRateLimitHeaders(res, rl);
  }
  const { data: ownerProfile } = await supabaseAdmin
    .from('profiles')
    .select('tier')
    .eq('user_id', teamRow.owner_user_id)
    .maybeSingle();
  if (!tierOk((ownerProfile?.tier as string) ?? 'free')) {
    const res = NextResponse.json(
      { error: 'Financial reporting requires Club Pro or higher.', code: 'tier_required' },
      { status: 403 }
    );
    return applyRateLimitHeaders(res, rl);
  }

  // Compute the period start
  const now = new Date();
  let periodStart: Date | null = null;
  if (period === 'last_30_days') {
    periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (period === 'last_90_days') {
    periodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (period === 'ytd') {
    periodStart = new Date(now.getFullYear(), 0, 1);
  } else if (period === 'all') {
    periodStart = null;
  } else {
    const res = NextResponse.json({ error: 'invalid_period', allowed: ['last_30_days', 'last_90_days', 'ytd', 'all'] }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  // Fetch payments (the request) in the period
  let paymentsQuery = supabaseAdmin
    .from('payments')
    .select('id, title, amount_per_player, currency, due_date, status, created_at, updated_at')
    .eq('team_id', team.id)
    .order('created_at', { ascending: false });
  if (periodStart) {
    paymentsQuery = paymentsQuery.gte('created_at', periodStart.toISOString());
  }
  const { data: payments, error: payErr } = await paymentsQuery;
  if (payErr) {
    console.error('[financial-report] payments fetch failed:', payErr);
    const res = NextResponse.json({ error: 'Could not load payments.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  // Fetch payment_records (per-player) for the same period
  const paymentIds = (payments || []).map((p) => p.id);
  let recordsQuery = supabaseAdmin
    .from('payment_records')
    .select('id, payment_id, player_id, amount_due, amount_paid, status, paid_at, created_at');
  if (periodStart) {
    recordsQuery = recordsQuery.gte('created_at', periodStart.toISOString());
  }
  if (paymentIds.length > 0) {
    recordsQuery = recordsQuery.in('payment_id', paymentIds);
  }
  const { data: records, error: recErr } = await recordsQuery;
  if (recErr) {
    console.error('[financial-report] records fetch failed:', recErr);
    const res = NextResponse.json({ error: 'Could not load payment records.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  // Aggregate
  const recordsArr = (records || []) as Array<{
    id: string; payment_id: string; amount_due: number | null; amount_paid: number | null;
    status: string; paid_at: string | null; created_at: string;
  }>;

  const summary = {
    period,
    payments_count: (payments || []).length,
    total_invoiced: 0,
    total_paid: 0,
    total_outstanding: 0,
    overdue_count: 0,
    paid_count: 0,
    pending_count: 0,
  };
  for (const r of recordsArr) {
    const due = r.amount_due ?? 0;
    const paid = r.amount_paid ?? 0;
    summary.total_invoiced += due;
    summary.total_paid += paid;
    summary.total_outstanding += Math.max(0, due - paid);
    if (r.status === 'paid' || r.status === 'completed') summary.paid_count++;
    else if (r.status === 'overdue') summary.overdue_count++;
    else summary.pending_count++;
  }

  // Group by payment (so admins can see per-payment rollup)
  const paymentIds2 = Array.from(new Set(recordsArr.map((r) => r.payment_id)));
  const paymentById: Record<string, { id: string; title: string; invoiced: number; paid: number; outstanding: number; records: number; paid_records: number }> = {};
  for (const p of (payments || []) as Array<{ id: string; title: string }>) {
    paymentById[p.id] = { id: p.id, title: p.title, invoiced: 0, paid: 0, outstanding: 0, records: 0, paid_records: 0 };
  }
  for (const r of recordsArr) {
    const p = paymentById[r.payment_id];
    if (!p) continue;
    p.records++;
    p.invoiced += r.amount_due ?? 0;
    p.paid += r.amount_paid ?? 0;
    p.outstanding += Math.max(0, (r.amount_due ?? 0) - (r.amount_paid ?? 0));
    if (r.status === 'paid' || r.status === 'completed') p.paid_records++;
  }

  const byStatus = Object.values(paymentById).sort((a, b) => b.outstanding - a.outstanding);

  // Recent activity (last 10 records with paid_at)
  const recent = recordsArr
    .filter((r) => r.paid_at)
    .sort((a, b) => (b.paid_at || '').localeCompare(a.paid_at || ''))
    .slice(0, 10);

  const res = NextResponse.json({
    ok: true,
    team: { id: team.id, slug: team.slug, name: team.name },
    period,
    summary,
    by_status: byStatus,
    recent_payments: recent,
  });
  return applyRateLimitHeaders(res, rl);
}
