/**
 * PATCH /api/manage/federation — federation owner edits their own profile
 *
 * Ownership check: `federations.owner_user_id = <signed-in user>`.
 *
 * Publishing rules (Arnel, 2026-10-29 18:07 CDT — "proceed with recommendations"):
 *   - Description, website, contact email/phone, logo → publish IMMEDIATELY.
 *     These are self-evident facts the federation owns.
 *   - Display NAME → queued for Arnel's approval. A name change ripples
 *     across every page that mentions the federation, so a human checks it.
 *
 * The API returns `pending_name: true` when a name change was queued, so the
 * UI can tell the admin what actually happened.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import {
  isFederationOwner,
  validateFederationPatch,
  FEDERATION_CLAIM_TYPE,
} from '@/lib/federation-ownership';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RL = { maxRequests: 60, windowMs: 60 * 1000 };

export async function PATCH(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`fed-manage:${ip}`, RL);
  maybeCleanup();

  const session = await auth();
  if (!session.userId) {
    const res = NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!userId) {
    const res = NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    const res = NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  const validated = validateFederationPatch(body);
  if (validated.ok === false) {
    const res = NextResponse.json(
      { error: 'validation_failed', field: validated.field, message: validated.message },
      { status: 400 },
    );
    return applyRateLimitHeaders(res, rl);
  }

  // Find the federation this user owns.
  const { data: owned, error: ownedErr } = await supabaseAdmin
    .from('federations')
    .select('id, name, slug, pending_name')
    .eq('owner_user_id', userId)
    .limit(1);

  if (ownedErr) {
    console.error('[manage/federation] ownership lookup failed:', ownedErr);
    const res = NextResponse.json({ error: 'Failed to look up your federation.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }
  const federation = owned?.[0];
  if (!federation) {
    const res = NextResponse.json(
      { error: 'You are not the approved administrator of any federation.' },
      { status: 403 },
    );
    return applyRateLimitHeaders(res, rl);
  }

  // Split into immediate-publish fields and approval-queued fields.
  const immediate: Record<string, unknown> = {};
  const queued: Record<string, unknown> = {};

  for (const [field, value] of Object.entries(validated.update)) {
    if (field === 'name') {
      queued.name = value;
    } else {
      immediate[field] = value;
    }
  }

  const now = new Date().toISOString();

  // --- Apply the immediate fields ---
  if (Object.keys(immediate).length > 0) {
    const { error: updateErr } = await supabaseAdmin
      .from('federations')
      .update({ ...immediate, updated_at: now })
      .eq('id', federation.id);
    if (updateErr) {
      console.error('[manage/federation] update failed:', updateErr);
      const res = NextResponse.json({ error: 'Failed to save your changes.' }, { status: 500 });
      return applyRateLimitHeaders(res, rl);
    }
  }

  // --- Queue the name change ---
  let pendingName = false;
  if (queued.name !== undefined) {
    const nextName = String(queued.name).trim();
    if (nextName && nextName !== federation.name) {
      pendingName = true;
      const { error: pendingErr } = await supabaseAdmin
        .from('federations')
        .update({
          pending_name: nextName,
          pending_submitted_at: now,
          pending_submitted_by: userId,
          updated_at: now,
        })
        .eq('id', federation.id);
      if (pendingErr) {
        console.error('[manage/federation] pending name update failed:', pendingErr);
      }
    }
  }

  // --- Audit trail ---
  try {
    await supabaseAdmin.from('admin_audit_log').insert({
      actor_user_id: userId,
      actor_email: userEmail,
      actor_role: 'federation_admin',
      action: 'federation_profile_updated',
      entity_type: 'federation',
      entity_id: federation.id,
      entity_name: federation.name,
      params: {
        immediate_fields: Object.keys(immediate),
        pending_name: pendingName ? queued.name : null,
      },
    });
  } catch (e) {
    console.error('[manage/federation] audit log failed (non-fatal):', e);
  }

  const { data: fresh } = await supabaseAdmin
    .from('federations')
    .select('id, name, slug, description, website_url, contact_email, contact_phone, logo_url, pending_name, pending_submitted_at')
    .eq('id', federation.id)
    .maybeSingle();

  const res = NextResponse.json({
    ok: true,
    pending_name: pendingName,
    federation: fresh ?? null,
    claim_type: FEDERATION_CLAIM_TYPE,
  });
  return applyRateLimitHeaders(res, rl);
}
