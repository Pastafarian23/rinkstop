/**
 * POST /api/admin/federation-member-requests/[id] — approve / reject
 *
 * Approving does the real work:
 *   - member_type='league', league_id set → sets leagues.federation_id
 *   - member_type='league', no league_id (a PROPOSED new league) → creates
 *     the league row, then links it
 *   - member_type='club', team_id set → sets team_workspaces.federation_id
 *
 * A "Removal requested" note means the opposite: the target is currently
 * linked, and approval UNLINKS it.
 *
 * Everything is audited.
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
  const rl = await checkRateLimit(`fed-member-review:${ip}`, RL);
  maybeCleanup();

  const auth = await getAdminFromRequest(request, 'admin_federation_member_requests');
  if ('response' in auth) {
    return applyRateLimitHeaders(auth.response as NextResponse, rl);
  }
  const { admin } = auth;

  let body: { action?: 'approve' | 'reject'; note?: string };
  try {
    body = await request.json();
  } catch {
    const res = NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }
  if (body.action !== 'approve' && body.action !== 'reject') {
    const res = NextResponse.json({ error: 'action must be approve or reject.' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  const { id } = await params;

  const { data: request_row, error: loadErr } = await supabaseAdmin
    .from('federation_member_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (loadErr || !request_row) {
    const res = NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    return applyRateLimitHeaders(res, rl);
  }
  if (request_row.status !== 'pending') {
    const res = NextResponse.json(
      { error: `Request already ${request_row.status}.`, code: 'already_reviewed' },
      { status: 409 },
    );
    return applyRateLimitHeaders(res, rl);
  }

  const now = new Date().toISOString();

  // --- REJECT ---
  if (body.action === 'reject') {
    const { error: updateErr } = await supabaseAdmin
      .from('federation_member_requests')
      .update({
        status: 'rejected',
        reviewed_by: admin.userId,
        reviewed_at: now,
        review_note: (body.note || '').trim() || null,
      })
      .eq('id', id);
    if (updateErr) {
      console.error('[federation-member-requests] reject failed:', updateErr);
      const res = NextResponse.json({ error: 'Reject failed.' }, { status: 500 });
      return applyRateLimitHeaders(res, rl);
    }

    await audit(admin.userId, admin.email, admin.role, 'federation_member_request_rejected', request_row, {
      note: body.note || null,
    });

    const res = NextResponse.json({ ok: true, status: 'rejected' });
    return applyRateLimitHeaders(res, rl);
  }

  // --- APPROVE ---
  const isRemoval = String(request_row.review_note || '').includes('Removal requested');
  const federationId = request_row.federation_id;
  const memberType = request_row.member_type;

  if (memberType === 'league') {
    if (isRemoval) {
      // Unlink the league.
      if (!request_row.league_id) {
        const res = NextResponse.json({ error: 'No league id on this request.' }, { status: 400 });
        return applyRateLimitHeaders(res, rl);
      }
      const { error: unlinkErr } = await supabaseAdmin
        .from('leagues')
        .update({ federation_id: null })
        .eq('id', request_row.league_id);
      if (unlinkErr) {
        console.error('[federation-member-requests] unlink league failed:', unlinkErr);
        const res = NextResponse.json({ error: 'Failed to unlink the league.' }, { status: 500 });
        return applyRateLimitHeaders(res, rl);
      }
    } else if (request_row.league_id) {
      // Link an existing league.
      const { error: linkErr } = await supabaseAdmin
        .from('leagues')
        .update({ federation_id: federationId })
        .eq('id', request_row.league_id);
      if (linkErr) {
        console.error('[federation-member-requests] link league failed:', linkErr);
        const res = NextResponse.json({ error: 'Failed to link the league.' }, { status: 500 });
        return applyRateLimitHeaders(res, rl);
      }
    } else {
      // Create the proposed league, then link it.
      const name = String(request_row.proposed_name || '').trim();
      if (!name) {
        const res = NextResponse.json({ error: 'The request has no league name.' }, { status: 400 });
        return applyRateLimitHeaders(res, rl);
      }
      const slug = String(request_row.proposed_slug || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Unique slug: if taken, suffix with a short random segment.
      let finalSlug = slug || 'league';
      const { data: clash } = await supabaseAdmin
        .from('leagues')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle();
      if (clash) {
        finalSlug = `${finalSlug}-${Math.random().toString(36).slice(2, 6)}`;
      }

      const { data: created, error: createErr } = await supabaseAdmin
        .from('leagues')
        .insert({
          name,
          slug: finalSlug,
          description: request_row.proposed_description || null,
          country: request_row.proposed_country || null,
          level: request_row.proposed_level || null,
          website_url: request_row.proposed_website_url || null,
          federation_id: federationId,
          is_active: true,
          claimable: true,
        })
        .select('id, name, slug')
        .single();

      if (createErr) {
        console.error('[federation-member-requests] create league failed:', createErr);
        const res = NextResponse.json({ error: 'Failed to create the league.' }, { status: 500 });
        return applyRateLimitHeaders(res, rl);
      }

      await audit(admin.userId, admin.email, admin.role, 'federation_league_created', request_row, {
        league_id: created.id,
        slug: created.slug,
      });
    }
  } else if (memberType === 'club') {
    if (!request_row.team_id) {
      const res = NextResponse.json({ error: 'No club id on this request.' }, { status: 400 });
      return applyRateLimitHeaders(res, rl);
    }
    const { error: clubErr } = await supabaseAdmin
      .from('team_workspaces')
      .update({ federation_id: isRemoval ? null : federationId })
      .eq('id', request_row.team_id);
    if (clubErr) {
      console.error('[federation-member-requests] club update failed:', clubErr);
      const res = NextResponse.json({ error: 'Failed to update the club.' }, { status: 500 });
      return applyRateLimitHeaders(res, rl);
    }
  }

  const { error: updateErr } = await supabaseAdmin
    .from('federation_member_requests')
    .update({
      status: 'approved',
      reviewed_by: admin.userId,
      reviewed_at: now,
      review_note: (body.note || '').trim() || request_row.review_note || null,
    })
    .eq('id', id);

  if (updateErr) {
    console.error('[federation-member-requests] approve failed:', updateErr);
    const res = NextResponse.json({ error: 'Approve failed.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  await audit(admin.userId, admin.email, admin.role, 'federation_member_request_approved', request_row, {
    removal: isRemoval,
    note: body.note || null,
  });

  const res = NextResponse.json({
    ok: true,
    status: 'approved',
    message: isRemoval
      ? 'Removed and unlinked.'
      : 'Approved and linked to the federation page.',
  });
  return applyRateLimitHeaders(res, rl);
}

async function audit(
  actorUserId: string,
  actorEmail: string,
  actorRole: string,
  action: string,
  row: Record<string, unknown>,
  params: Record<string, unknown>,
) {
  try {
    await supabaseAdmin.from('admin_audit_log').insert({
      actor_user_id: actorUserId,
      actor_email: actorEmail,
      actor_role: actorRole,
      action,
      entity_type: 'federation',
      entity_id: String(row.federation_id ?? ''),
      entity_name: row.proposed_name ? String(row.proposed_name) : null,
      params: { ...params, request_id: row.id, member_type: row.member_type },
    });
  } catch (e) {
    console.error('[federation-member-requests] audit log failed (non-fatal):', e);
  }
}
