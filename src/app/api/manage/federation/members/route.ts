/**
 * POST /api/manage/federation/members — member league / club requests
 *
 * A federation admin can:
 *   - add an existing league or club to their federation
 *   - propose a brand-new league
 *   - remove a league or club from their federation
 *
 * Every one of those goes into `federation_member_requests` with
 * status='pending'. Arnel approves them in /admin/intake before anything
 * touches the public directory. That is the safeguard: a leaked invite token
 * must not be able to attach arbitrary rows to a national governing body.
 *
 * The ONLY exception is "remove", which is also queued — because unlinking a
 * row silently would hide a club that really is a member.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RL = { maxRequests: 60, windowMs: 60 * 1000 };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`fed-members:${ip}`, RL);
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

  let body: {
    action?: 'add' | 'remove' | 'propose_league';
    member_type?: 'league' | 'club';
    league_id?: string;
    team_id?: string;
    name?: string;
    country?: string;
    level?: string;
    website_url?: string;
    description?: string;
  };
  try {
    body = await request.json();
  } catch {
    const res = NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    return applyRateLimitHeaders(res, rl);
  }

  // --- Ownership ---
  const { data: owned } = await supabaseAdmin
    .from('federations')
    .select('id, name, slug')
    .eq('owner_user_id', userId)
    .limit(1);
  const federation = owned?.[0];
  if (!federation) {
    const res = NextResponse.json(
      { error: 'You are not the approved administrator of any federation.' },
      { status: 403 },
    );
    return applyRateLimitHeaders(res, rl);
  }

  const action = body.action;
  const memberType = body.member_type;

  // --- REMOVE ---
  if (action === 'remove') {
    if (memberType !== 'league' && memberType !== 'club') {
      const res = NextResponse.json({ error: 'member_type must be league or club.' }, { status: 400 });
      return applyRateLimitHeaders(res, rl);
    }
    const targetId = memberType === 'league' ? body.league_id : body.team_id;
    if (!targetId) {
      const res = NextResponse.json({ error: 'A target id is required.' }, { status: 400 });
      return applyRateLimitHeaders(res, rl);
    }

    // Verify the row is currently linked to THIS federation.
    const table = memberType === 'league' ? 'leagues' : 'team_workspaces';
    const { data: linked } = await supabaseAdmin
      .from(table)
      .select('id, name')
      .eq('id', targetId)
      .eq('federation_id', federation.id)
      .maybeSingle();
    if (!linked) {
      const res = NextResponse.json({ error: 'That listing is not linked to your federation.' }, { status: 404 });
      return applyRateLimitHeaders(res, rl);
    }

    const { error: insertErr } = await supabaseAdmin
      .from('federation_member_requests')
      .insert({
        federation_id: federation.id,
        member_type: memberType,
        league_id: memberType === 'league' ? targetId : null,
        team_id: memberType === 'club' ? targetId : null,
        proposed_name: linked.name,
        status: 'pending',
        submitted_by: userId,
        review_note: 'Removal requested by federation admin.',
      });
    if (insertErr) {
      console.error('[manage/federation/members] removal request failed:', insertErr);
      const res = NextResponse.json({ error: 'Failed to submit the request.' }, { status: 500 });
      return applyRateLimitHeaders(res, rl);
    }

    const res = NextResponse.json({
      ok: true,
      message: `Removal of ${linked.name} is with our team for review.`,
    });
    return applyRateLimitHeaders(res, rl);
  }

  // --- PROPOSE A NEW LEAGUE ---
  if (action === 'propose_league') {
    const name = (body.name || '').trim();
    if (!name) {
      const res = NextResponse.json({ error: 'League name is required.' }, { status: 400 });
      return applyRateLimitHeaders(res, rl);
    }
    const slug = slugify(name);
    if (!slug) {
      const res = NextResponse.json({ error: 'That league name cannot be turned into a URL.' }, { status: 400 });
      return applyRateLimitHeaders(res, rl);
    }

    const { error: insertErr } = await supabaseAdmin
      .from('federation_member_requests')
      .insert({
        federation_id: federation.id,
        member_type: 'league',
        league_id: null,
        proposed_name: name,
        proposed_slug: slug,
        proposed_country: (body.country || '').trim() || null,
        proposed_level: (body.level || '').trim() || null,
        proposed_website_url: (body.website_url || '').trim() || null,
        proposed_description: (body.description || '').trim() || null,
        status: 'pending',
        submitted_by: userId,
      });
    if (insertErr) {
      console.error('[manage/federation/members] propose league failed:', insertErr);
      const res = NextResponse.json({ error: 'Failed to submit the league.' }, { status: 500 });
      return applyRateLimitHeaders(res, rl);
    }

    const res = NextResponse.json({
      ok: true,
      message: `${name} has been submitted. We will create the listing and link it to your federation.`,
    });
    return applyRateLimitHeaders(res, rl);
  }

  // --- ADD AN EXISTING LEAGUE OR CLUB ---
  if (action === 'add') {
    if (memberType !== 'league' && memberType !== 'club') {
      const res = NextResponse.json({ error: 'member_type must be league or club.' }, { status: 400 });
      return applyRateLimitHeaders(res, rl);
    }
    const targetId = memberType === 'league' ? body.league_id : body.team_id;
    if (!targetId) {
      const res = NextResponse.json({ error: 'A target id is required.' }, { status: 400 });
      return applyRateLimitHeaders(res, rl);
    }

    const table = memberType === 'league' ? 'leagues' : 'team_workspaces';
    const { data: target } = await supabaseAdmin
      .from(table)
      .select('id, name, federation_id')
      .eq('id', targetId)
      .maybeSingle();
    if (!target) {
      const res = NextResponse.json({ error: 'That listing could not be found.' }, { status: 404 });
      return applyRateLimitHeaders(res, rl);
    }
    if (target.federation_id === federation.id) {
      const res = NextResponse.json({ error: 'That listing is already linked to your federation.' }, { status: 409 });
      return applyRateLimitHeaders(res, rl);
    }
    if (target.federation_id) {
      const res = NextResponse.json({
        error: 'That listing already belongs to another federation. Contact us and we will transfer it.',
      }, { status: 409 });
      return applyRateLimitHeaders(res, rl);
    }

    const { error: insertErr } = await supabaseAdmin
      .from('federation_member_requests')
      .insert({
        federation_id: federation.id,
        member_type: memberType,
        league_id: memberType === 'league' ? targetId : null,
        team_id: memberType === 'club' ? targetId : null,
        proposed_name: target.name,
        status: 'pending',
        submitted_by: userId,
      });
    if (insertErr) {
      console.error('[manage/federation/members] add request failed:', insertErr);
      const res = NextResponse.json({ error: 'Failed to submit the request.' }, { status: 500 });
      return applyRateLimitHeaders(res, rl);
    }

    const res = NextResponse.json({
      ok: true,
      message: `${target.name} has been sent to our team. It will appear on your federation page once approved.`,
    });
    return applyRateLimitHeaders(res, rl);
  }

  const res = NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  return applyRateLimitHeaders(res, rl);
}
