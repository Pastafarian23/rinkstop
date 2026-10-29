/**
 * POST /api/admin/federations/[id]/approve-name — publish a pending name change
 *
 * The federation admin asked to rename their listing. We queue it (a name
 * ripples across every page that mentions the federation), and Arnel approves
 * it here.
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
  const rl = await checkRateLimit(`fed-name-approve:${ip}`, RL);
  maybeCleanup();

  const auth = await getAdminFromRequest(request, 'admin_federation_approve_name');
  if ('response' in auth) {
    return applyRateLimitHeaders(auth.response as NextResponse, rl);
  }
  const { admin } = auth;

  const { id } = await params;

  const { data: federation, error: loadErr } = await supabaseAdmin
    .from('federations')
    .select('id, name, pending_name, pending_logo_url, pending_description, pending_website_url, pending_contact_email, pending_contact_phone, pending_submitted_at')
    .eq('id', id)
    .maybeSingle();

  if (loadErr || !federation) {
    const res = NextResponse.json({ error: 'Federation not found.' }, { status: 404 });
    return applyRateLimitHeaders(res, rl);
  }

  if (!federation.pending_name && !federation.pending_logo_url) {
    const res = NextResponse.json({ error: 'No pending changes on this federation.' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    pending_name: null,
    pending_logo_url: null,
    pending_description: null,
    pending_website_url: null,
    pending_contact_email: null,
    pending_contact_phone: null,
    pending_submitted_at: null,
    pending_submitted_by: null,
    updated_at: now,
  };

  // Only apply the fields that actually have a pending value.
  if (federation.pending_name) update.name = federation.pending_name;
  if (federation.pending_logo_url) update.logo_url = federation.pending_logo_url;
  if (federation.pending_description) update.description = federation.pending_description;
  if (federation.pending_website_url) update.website_url = federation.pending_website_url;
  if (federation.pending_contact_email) update.contact_email = federation.pending_contact_email;
  if (federation.pending_contact_phone) update.contact_phone = federation.pending_contact_phone;

  const { error: updateErr } = await supabaseAdmin
    .from('federations')
    .update(update)
    .eq('id', id);

  if (updateErr) {
    console.error('[federations/approve-name] update failed:', updateErr);
    const res = NextResponse.json({ error: 'Approve failed.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  try {
    await supabaseAdmin.from('admin_audit_log').insert({
      actor_user_id: admin.userId,
      actor_email: admin.email,
      actor_role: admin.role,
      action: 'federation_pending_changes_approved',
      entity_type: 'federation',
      entity_id: id,
      entity_name: federation.name,
      params: {
        previous_name: federation.name,
        new_name: federation.pending_name,
        submitted_at: federation.pending_submitted_at,
      },
    });
  } catch (e) {
    console.error('[federations/approve-name] audit log failed (non-fatal):', e);
  }

  const res = NextResponse.json({ ok: true, name: update.name ?? federation.name });
  return applyRateLimitHeaders(res, rl);
}
