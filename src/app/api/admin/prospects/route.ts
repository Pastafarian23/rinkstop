/**
 * src/app/api/admin/prospects/route.ts
 *
 * Admin-only B2B prospect pipeline (Phase 8 of conversion overhaul).
 *
 * Per Arnel Phase 8 directive (memory/2026-10-01-conversion-monetization-overhaul.md):
 * "Create an internal prospect table for unclaimed rinks, hockey clubs,
 *  leagues, hockey shops, trainers, clinics, equipment businesses. Track
 *  website, contact info, claimed/unclaimed, profile completeness, commercial
 *  opportunity, outreach status. DO NOT send automated outreach without
 *  approval."
 *
 * This route is admin/super_admin only. Uses Clerk auth via getAdminFromRequest.
 * Underlying table: b2b_prospects (migration 2026-10-02). RLS disabled for
 * anon/authenticated; service_role only.
 *
 * Endpoints:
 *   GET    /api/admin/prospects            — list with pagination, filters
 *   POST   /api/admin/prospects            — create
 *   GET    /api/admin/prospects/[id]       — read one
 *   PATCH  /api/admin/prospects/[id]       — update (status, notes, contact)
 *   DELETE /api/admin/prospects/[id]       — delete (super_admin only)
 *
 * NEVER exposes: outreach_owner PII beyond admin's own user id.
 * NEVER allows automated outreach from a request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

type ProspectInput = {
  kind?: unknown;
  display_name?: unknown;
  city?: unknown;
  region?: unknown;
  country?: unknown;
  website?: unknown;
  contact_email?: unknown;
  contact_phone?: unknown;
  contact_name?: unknown;
  source?: unknown;
  rink_id?: unknown;
  team_id?: unknown;
  league_id?: unknown;
  priority_score?: unknown;
  notes?: unknown;
};

function parseProspect(input: unknown):
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; errors: string[] } {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, errors: ['body must be an object'] };
  }
  const body = input as ProspectInput;
  const errors: string[] = [];

  const kind = typeof body.kind === 'string' ? body.kind : '';
  if (!PROSPECT_KINDS.has(kind)) errors.push('kind invalid');

  const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
  if (!displayName) errors.push('display_name required');

  const out: Record<string, unknown> = {
    kind,
    display_name: displayName,
  };

  if (typeof body.city === 'string') out.city = body.city.trim().slice(0, 100);
  if (typeof body.region === 'string') out.region = body.region.trim().slice(0, 100);
  if (typeof body.country === 'string') out.country = body.country.trim().slice(0, 80);

  if (typeof body.website === 'string' && body.website) {
    try {
      new URL(body.website);
      out.website = body.website.slice(0, 500);
    } catch {
      errors.push('website must be a valid URL');
    }
  }

  if (typeof body.contact_email === 'string' && body.contact_email) {
    const emailOk = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(body.contact_email);
    if (!emailOk) errors.push('contact_email invalid');
    else out.contact_email = body.contact_email.slice(0, 200);
  }

  if (typeof body.contact_phone === 'string') out.contact_phone = body.contact_phone.slice(0, 50);
  if (typeof body.contact_name === 'string') out.contact_name = body.contact_name.slice(0, 200);
  if (typeof body.source === 'string') out.source = body.source.slice(0, 80);

  if (typeof body.rink_id === 'string' && body.rink_id) out.rink_id = body.rink_id;
  if (typeof body.team_id === 'string' && body.team_id) out.team_id = body.team_id;
  if (typeof body.league_id === 'string' && body.league_id) out.league_id = body.league_id;

  if (typeof body.priority_score === 'number') {
    if (body.priority_score < 0 || body.priority_score > 100) {
      errors.push('priority_score must be 0-100');
    } else {
      out.priority_score = Math.round(body.priority_score);
    }
  }

  if (typeof body.notes === 'string') out.notes = body.notes.slice(0, 5000);

  if (errors.length > 0) return { ok: false as const, errors };
  return { ok: true as const, data: out };
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROSPECT_KINDS = new Set([
  'rink',
  'team',
  'league',
  'hockey_shop',
  'trainer',
  'clinic',
  'equipment_business',
]);

const OUTREACH_STATUSES = new Set([
  'new',
  'researching',
  'ready_to_contact',
  'contacted',
  'engaged',
  'declined',
  'claimed_via_outreach',
  'no_response',
  'do_not_contact',
]);

export async function GET(req: NextRequest) {
  const authz = await getAdminFromRequest();
  if ('response' in authz) return authz.response as NextResponse;

  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') ?? undefined;
  const status = url.searchParams.get('status') ?? undefined;
  const country = url.searchParams.get('country') ?? undefined;
  const claimedParam = url.searchParams.get('claimed');
  const minPriorityParam = url.searchParams.get('min_priority');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0;

  let q = supabaseAdmin
    .from('b2b_prospects')
    .select(
      'id, kind, display_name, city, region, country, website, contact_email, contact_phone, contact_name, source, rink_id, team_id, league_id, rinkstop_claimed, rinkstop_claimed_at, rinkstop_profile_url, profile_completeness_pct, verification, outreach_status, outreach_owner, initial_outreach_at, last_outreach_at, next_follow_up_at, priority_score, created_at, updated_at',
      { count: 'exact' }
    )
    .order('priority_score', { ascending: false })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (kind && PROSPECT_KINDS.has(kind)) q = q.eq('kind', kind);
  if (status && OUTREACH_STATUSES.has(status)) q = q.eq('outreach_status', status);
  if (country) q = q.ilike('country', country);
  if (claimedParam === 'true') q = q.eq('rinkstop_claimed', true);
  else if (claimedParam === 'false') q = q.eq('rinkstop_claimed', false);
  if (minPriorityParam) {
    const v = parseInt(minPriorityParam, 10);
    if (!isNaN(v)) q = q.gte('priority_score', v);
  }

  const { data, error, count } = await q;
  if (error) {
    return NextResponse.json({ ok: false, msg: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    prospects: data ?? [],
    pagination: {
      limit,
      offset,
      total: count ?? (data?.length ?? 0),
    },
  });
}

export async function POST(req: NextRequest) {
  const authz = await getAdminFromRequest();
  if ('response' in authz) return authz.response as NextResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, msg: 'invalid JSON' }, { status: 400 });
  }

  const parsed = parseProspect(body);
  if (parsed.ok !== true) {
    return NextResponse.json(
      { ok: false, msg: 'invalid body', errors: parsed.errors },
      { status: 400 }
    );
  }

  const row = {
    ...parsed.data,
    outreach_owner: authz.admin.userId,
    created_by: authz.admin.userId,
  };

  const { data, error } = await supabaseAdmin
    .from('b2b_prospects')
    .insert(row)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, msg: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, prospect: data }, { status: 201 });
}