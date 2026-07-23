// src/app/api/admin/federation-registrations/[id]/approve/route.ts
// POST /api/admin/federation-registrations/[id]/approve
//
// Admin approves a pending federation registration. Sets status='approved'
// and writes audit fields (verified_at, verified_by).
//
// Tier 2 workflow (2026-07-23). Admin-only via getAdminFromRequest().

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 1000 };

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`admin-fed-approve:${ip}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, rl);
    return res;
  }

  const gate = await getAdminFromRequest();
  if ('response' in gate) return gate.response;

  const { id } = await params;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id (UUID) is required.' }, { status: 400 });
  }

  const { data: row, error: rowErr } = await supabaseAdmin
    .from('federation_registrations')
    .select('id, submission_status')
    .eq('id', id)
    .maybeSingle();
  if (rowErr) {
    console.error('[admin-fed-approve] row lookup failed', rowErr);
    return NextResponse.json({ error: 'Failed to look up registration.' }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
  }
  if (row.submission_status !== 'pending') {
    return NextResponse.json(
      { error: `Cannot approve — status is "${row.submission_status}".` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const { error: updErr } = await supabaseAdmin
    .from('federation_registrations')
    .update({
      submission_status: 'approved',
      verified_at: now,
      verified_by: gate.admin.userId,
      rejection_reason: null,
      updated_at: now,
    })
    .eq('id', id);
  if (updErr) {
    console.error('[admin-fed-approve] update failed', updErr);
    return NextResponse.json({ error: 'Failed to approve.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, submission_status: 'approved' });
}
