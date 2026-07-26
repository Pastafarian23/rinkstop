// src/app/api/admin/federation-registrations/[id]/approve/route.ts
// POST /api/admin/federation-registrations/[id]/approve
//
// Admin approves a pending federation registration. Sets status='approved',
// writes audit fields (verified_at, verified_by), and (WS13 PR3) issues a
// user_credentials row tied to the certification_id that was stamped on
// the draft at submit time.
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
    .select('id, submission_status, player_id, coach_id, referee_user_id, federation_id, certification_id, registration_number, expires_at')
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

  // WS13 PR3: issue a user_credentials row on approval. The user_id is
  // resolved from the polymorphic column (player.coach.referee_user_id).
  // Skip issuance gracefully if any link is missing (old rows may not
  // have certification_id if they predate PR3).
  if (row.certification_id) {
    let userId: string | null = null;
    if (row.player_id) {
      const { data: p } = await supabaseAdmin.from('players').select('user_id').eq('id', row.player_id).maybeSingle();
      userId = p?.user_id ?? null;
    } else if (row.coach_id) {
      const { data: c } = await supabaseAdmin.from('coach_profiles').select('profile_id').eq('id', row.coach_id).maybeSingle();
      userId = c?.profile_id ?? null;
    } else if (row.referee_user_id) {
      userId = row.referee_user_id;
    }

    if (userId) {
      // Idempotency: skip if a credential already exists for this
      // (user, certification, registration) tuple. Re-approving a
      // withdrawn+resubmitted registration would otherwise double-issue.
      const { data: existing } = await supabaseAdmin
        .from('user_credentials')
        .select('id')
        .eq('user_id', userId)
        .eq('certification_id', row.certification_id)
        .eq('registration_id', id)
        .maybeSingle();

      if (!existing) {
        const { error: credErr } = await supabaseAdmin.from('user_credentials').insert({
          user_id: userId,
          certification_id: row.certification_id,
          federation_id: row.federation_id,
          registration_id: id,
          credential_number: row.registration_number,
          status: 'issued',
          issued_at: now,
          expires_at: row.expires_at ? `${row.expires_at}T00:00:00Z` : null,
        });
        if (credErr) {
          // Don't fail the approval — the registration is approved,
          // credential issuance can be retried. Log and surface as warning.
          console.error('[admin-fed-approve] user_credentials insert failed', credErr);
        }
      }
    } else {
      console.warn('[admin-fed-approve] no user_id resolved for registration', id);
    }
  } else {
    console.warn('[admin-fed-approve] no certification_id on registration', id, '— credential not issued. Re-submit required.');
  }

  return NextResponse.json({ ok: true, submission_status: 'approved' });
}
