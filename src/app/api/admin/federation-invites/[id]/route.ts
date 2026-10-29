/**
 * POST /api/admin/federation-invites/[id] — revoke an invite
 *
 * Revoking is the kill-switch: the token stops working immediately, even if
 * it was never used and even if the email leaked.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RL = { maxRequests: 60, windowMs: 60 * 1000 };

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`fed-invite-revoke:${ip}`, RL);
  maybeCleanup();

  const auth = await getAdminFromRequest(request, 'admin_federation_invites_revoke');
  if ('response' in auth) {
    return applyRateLimitHeaders(auth.response as NextResponse, rl);
  }
  const { admin } = auth;

  const { id } = await params;

  const { data: invite, error: loadErr } = await supabaseAdmin
    .from('federation_claim_invites')
    .select('id, federation_id, email, revoked_at')
    .eq('id', id)
    .maybeSingle();

  if (loadErr || !invite) {
    const res = NextResponse.json({ error: 'Invite not found.' }, { status: 404 });
    return applyRateLimitHeaders(res, rl);
  }
  if (invite.revoked_at) {
    const res = NextResponse.json({ error: 'Invite already revoked.' }, { status: 409 });
    return applyRateLimitHeaders(res, rl);
  }

  const { error: updateErr } = await supabaseAdmin
    .from('federation_claim_invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);

  if (updateErr) {
    console.error('[federation-invites] revoke failed:', updateErr);
    const res = NextResponse.json({ error: 'Revoke failed.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  try {
    await supabaseAdmin.from('admin_audit_log').insert({
      actor_user_id: admin.userId,
      actor_email: admin.email,
      actor_role: admin.role,
      action: 'federation_invite_revoked',
      entity_type: 'federation',
      entity_id: invite.federation_id,
      params: { invite_id: id, email: invite.email },
    });
  } catch (e) {
    console.error('[federation-invites] audit log failed (non-fatal):', e);
  }

  const res = NextResponse.json({ ok: true, revoked_at: new Date().toISOString() });
  return applyRateLimitHeaders(res, rl);
}
