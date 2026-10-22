// src/app/api/v1/org/[id]/finances/route.ts
//
// Public API — organization financial report.
//
// HISTORY / WHY THIS FILE EXISTS
// The audit recorded that "/api/v1/org/{id}/finances" was "advertised in the
// API docs". That claim was WRONG: it existed only as a stale comment inside
// src/app/api/v1/org/[id]/route.ts. There was no public API docs page
// (/api-docs, /docs/api, /api, /developers and /docs all returned 404) and no
// finances route at all.
//
// This file makes the endpoint real rather than leaving a comment claiming
// it exists.
//
// WHAT IT DOES
// Returns the same aggregate financial data the in-app Financial Reporting
// screen shows (src/app/api/team/[slug]/reports/financial/route.ts), scoped
// to ONE team workspace (the `{id}` in the path), for an API caller.
//
// AUTH (three independent gates, all must pass)
//   1. A valid, unrevoked API key issued FOR THIS ORG
//      (src/lib/api-keys.ts — sha256 digest lookup, fails closed).
//   2. The org must be published.
//   3. The org's OWNER must hold org_pro or higher on the organization
//      track. Financial reporting is advertised on the Organization Pro card
//      ("Financial reporting (payments, outstanding, overdue)"), so org_pro is
//      the correct floor — this mirrors the in-app route's gate.
//
// The tier gate is evaluated against the org OWNER's profiles.org_tier, not
// the key caller's personal tier: the entitlement belongs to the org.
//
// RESPONSE
//   {
//     ok, org: { id, slug, name },
//     period, summary: { payments_count, total_invoiced, total_paid,
//                        total_outstanding, overdue_count, paid_count,
//                        pending_count },
//     by_status: [ { id, title, invoiced, paid, outstanding, records,
//                    paid_records } ],
//     recent_payments: [ { id, payment_id, amount_due, amount_paid, status,
//                          paid_at, created_at } ]
//   }
//
// Amounts are returned in the smallest currency unit (cents), matching the
// in-app route — callers divide by 100.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyOrgApiKey, extractPresentedKey, apiKeyUnauthorized } from '@/lib/api-keys';
import { tierAtLeast } from '@/lib/tier';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_PERIODS = ['last_30_days', 'last_90_days', 'ytd', 'all'] as const;
type Period = (typeof VALID_PERIODS)[number];

function periodStartFor(period: Period): Date | null {
  const now = new Date();
  if (period === 'last_30_days') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (period === 'last_90_days') return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  if (period === 'ytd') return new Date(now.getFullYear(), 0, 1);
  return null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // ── Gate 1: API key ──────────────────────────────────────────────────────
  const verification = await verifyOrgApiKey(extractPresentedKey(req), id);
  if (!verification.ok) return apiKeyUnauthorized(verification.reason);

  const url = new URL(req.url);
  const rawPeriod = url.searchParams.get('period') || 'last_90_days';
  if (!VALID_PERIODS.includes(rawPeriod as Period)) {
    return NextResponse.json(
      { error: 'invalid_period', allowed: VALID_PERIODS },
      { status: 400 },
    );
  }
  const period = rawPeriod as Period;

  // ── Gate 2: org exists and is published ─────────────────────────────────
  const { data: org, error: orgErr } = await supabaseAdmin
    .from('team_workspaces')
    .select('id, slug, name, is_published, owner_user_id, created_by')
    .eq('id', id)
    .maybeSingle();
  if (orgErr) {
    console.error('[v1/org/finances] org lookup failed:', orgErr.message);
    return NextResponse.json({ error: 'Org not found' }, { status: 404 });
  }
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
  if (!org.is_published) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  // ── Gate 3: owner's organization tier must be org_pro+ ──────────────────
  // The entitlement belongs to the org, so we read the OWNER's org_tier —
  // not the API caller's personal tier.
  const ownerUserId = (org as any).owner_user_id || (org as any).created_by || null;
  if (!ownerUserId) {
    return NextResponse.json({ error: 'Org has no owner' }, { status: 403 });
  }
  const { data: ownerProfile } = await supabaseAdmin
    .from('profiles')
    .select('org_tier')
    .eq('user_id', ownerUserId)
    .maybeSingle();
  const ownerOrgTier = (ownerProfile?.org_tier as string) || 'org_free';
  if (!tierAtLeast(ownerOrgTier, 'org_pro')) {
    return NextResponse.json(
      {
        error: 'Financial reporting requires Organization Pro or higher.',
        code: 'tier_required',
        required_tier: 'org_pro',
        current_tier: ownerOrgTier,
      },
      { status: 403 },
    );
  }

  // ── Data ────────────────────────────────────────────────────────────────
  const periodStart = periodStartFor(period);

  let paymentsQuery = supabaseAdmin
    .from('payments')
    .select('id, title, amount_per_player, currency, due_date, status, created_at, updated_at')
    .eq('team_id', id)
    .order('created_at', { ascending: false });
  if (periodStart) paymentsQuery = paymentsQuery.gte('created_at', periodStart.toISOString());

  const { data: payments, error: payErr } = await paymentsQuery;
  if (payErr) {
    console.error('[v1/org/finances] payments fetch failed:', payErr.message);
    return NextResponse.json({ error: 'Could not load payments.' }, { status: 500 });
  }

  const paymentIds = (payments || []).map((p) => p.id);
  let recordsQuery = supabaseAdmin
    .from('payment_records')
    .select('id, payment_id, player_id, amount_due, amount_paid, status, paid_at, created_at');
  if (periodStart) recordsQuery = recordsQuery.gte('created_at', periodStart.toISOString());
  if (paymentIds.length > 0) recordsQuery = recordsQuery.in('payment_id', paymentIds);

  const { data: records, error: recErr } = await recordsQuery;
  if (recErr) {
    console.error('[v1/org/finances] payment records fetch failed:', recErr.message);
    return NextResponse.json({ error: 'Could not load payment records.' }, { status: 500 });
  }

  const recordsArr = (records || []) as Array<{
    id: string;
    payment_id: string;
    amount_due: number | null;
    amount_paid: number | null;
    status: string;
    paid_at: string | null;
    created_at: string;
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

  const paymentById: Record<
    string,
    { id: string; title: string; invoiced: number; paid: number; outstanding: number; records: number; paid_records: number }
  > = {};
  for (const p of (payments || []) as Array<{ id: string; title: string }>) {
    paymentById[p.id] = {
      id: p.id, title: p.title, invoiced: 0, paid: 0, outstanding: 0, records: 0, paid_records: 0,
    };
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
  const recent = recordsArr
    .filter((r) => r.paid_at)
    .sort((a, b) => (b.paid_at || '').localeCompare(a.paid_at || ''))
    .slice(0, 10);

  return NextResponse.json({
    ok: true,
    org: { id: org.id, slug: org.slug, name: org.name },
    period,
    summary,
    by_status: byStatus,
    recent_payments: recent,
  });
}
