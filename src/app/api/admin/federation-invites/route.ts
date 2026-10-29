/**
 * POST /api/admin/federation-invites — mint a federation claim invite
 * GET  /api/admin/federation-invites — list invites for a federation
 *
 * Admin-only via getAdminFromRequest().
 *
 * The returned invite URL is the ONLY path a federation has to a claim form.
 * There is no public federation claim button, so this endpoint is the single
 * way an invite comes into existence.
 *
 * Body (POST):
 *   federation_id  (uuid, required)
 *   email          (string, required)  — the vetted contact
 *   contact_name   (string, optional)
 *   note           (string, optional)
 *   max_uses       (number, optional, default 1)
 *   expires_days   (number, optional, default 30)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';
import { generateInviteToken, DEFAULT_INVITE_DAYS } from '@/lib/federation-ownership';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RL = { maxRequests: 60, windowMs: 60 * 1000 };

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`fed-invites:${ip}`, RL);
  maybeCleanup();

  const auth = await getAdminFromRequest(request, 'admin_federation_invites_list');
  if ('response' in auth) {
    return applyRateLimitHeaders(auth.response as NextResponse, rl);
  }

  const federationId = request.nextUrl.searchParams.get('federation_id');

  let query = supabaseAdmin
    .from('federation_claim_invites')
    .select('id, federation_id, email, contact_name, note, max_uses, times_used, expires_at, revoked_at, accepted_by, accepted_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (federationId) query = query.eq('federation_id', federationId);

  const { data, error } = await query;
  if (error) {
    console.error('[federation-invites] list failed:', error);
    const res = NextResponse.json({ error: 'Failed to list invites.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  // Hydrate federation names for display.
  const fedIds = Array.from(new Set((data || []).map((i) => i.federation_id)));
  const fedNames: Record<string, string> = {};
  if (fedIds.length > 0) {
    const { data: feds } = await supabaseAdmin
      .from('federations')
      .select('id, name')
      .in('id', fedIds);
    for (const f of feds || []) fedNames[f.id] = f.name;
  }

  const invites = (data || []).map((i) => ({
    ...i,
    federation_name: fedNames[i.federation_id] ?? '(unknown)',
  }));

  const res = NextResponse.json({ invites });
  return applyRateLimitHeaders(res, rl);
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`fed-invites:${ip}`, RL);
  maybeCleanup();

  const auth = await getAdminFromRequest(request, 'admin_federation_invites_create');
  if ('response' in auth) {
    return applyRateLimitHeaders(auth.response as NextResponse, rl);
  }
  const { admin } = auth;

  let body: {
    federation_id?: string;
    email?: string;
    contact_name?: string;
    note?: string;
    max_uses?: number;
    expires_days?: number;
  };
  try {
    body = await request.json();
  } catch {
    const res = NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  const federationId = (body.federation_id || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const contactName = (body.contact_name || '').trim() || null;
  const note = (body.note || '').trim() || null;

  if (!federationId) {
    const res = NextResponse.json({ error: 'federation_id is required.' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    const res = NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  const maxUses = Math.min(Math.max(Number(body.max_uses ?? 1) || 1, 1), 10);
  const expiresDays = Math.min(Math.max(Number(body.expires_days ?? DEFAULT_INVITE_DAYS) || DEFAULT_INVITE_DAYS, 1), 365);

  // Federation must exist and be claimable.
  const { data: federation, error: fedErr } = await supabaseAdmin
    .from('federations')
    .select('id, name, slug, claimable, owner_user_id')
    .eq('id', federationId)
    .maybeSingle();

  if (fedErr) {
    console.error('[federation-invites] federation lookup failed:', fedErr);
    const res = NextResponse.json({ error: 'Failed to look up federation.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }
  if (!federation) {
    const res = NextResponse.json({ error: 'Federation not found.' }, { status: 404 });
    return applyRateLimitHeaders(res, rl);
  }
  if (federation.claimable === false) {
    const res = NextResponse.json({ error: 'This federation is not claimable.' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }
  if (federation.owner_user_id) {
    const res = NextResponse.json({
      error: 'This federation already has an owner. Revoke that ownership before issuing a new invite.',
    }, { status: 409 });
    return applyRateLimitHeaders(res, rl);
  }

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: invite, error: insertErr } = await supabaseAdmin
    .from('federation_claim_invites')
    .insert({
      token,
      federation_id: federationId,
      email,
      contact_name: contactName,
      note,
      max_uses: maxUses,
      times_used: 0,
      expires_at: expiresAt,
      created_by: admin.userId,
    })
    .select('id, token, federation_id, email, contact_name, note, max_uses, times_used, expires_at, created_at')
    .single();

  if (insertErr) {
    console.error('[federation-invites] insert failed:', insertErr);
    const res = NextResponse.json({ error: 'Failed to create invite.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  // Audit trail.
  try {
    await supabaseAdmin.from('admin_audit_log').insert({
      actor_user_id: admin.userId,
      actor_email: admin.email,
      actor_role: admin.role,
      action: 'federation_invite_created',
      entity_type: 'federation',
      entity_id: federationId,
      entity_name: federation.name,
      params: {
        invite_id: invite.id,
        email,
        contact_name: contactName,
        max_uses: maxUses,
        expires_days: expiresDays,
      },
    });
  } catch (e) {
    console.error('[federation-invites] audit log failed (non-fatal):', e);
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
  const inviteUrl = `${baseUrl.replace(/\/$/, '')}/profile/claim?token=${encodeURIComponent(token)}`;

  const res = NextResponse.json({
    invite,
    invite_url: inviteUrl,
    federation_name: federation.name,
  });
  return applyRateLimitHeaders(res, rl);
}
