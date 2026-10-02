/**
 * src/app/api/admin/prospects/[id]/route.ts
 *
 * Admin-only single-prospect operations for the B2B pipeline (Phase 8).
 *
 * Endpoints:
 *   GET    /api/admin/prospects/[id]    — read one
 *   PATCH  /api/admin/prospects/[id]    — update status, notes, contact, priority
 *   DELETE /api/admin/prospects/[id]    — delete (super_admin only)
 *
 * Auth: getAdminFromRequest (Clerk session + admin/super_admin role).
 * Table: b2b_prospects (migration 2026-10-02). Service-role only at the DB layer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

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

const VERIFICATIONS = new Set([
  'unverified',
  'business_email_confirmed',
  'phone_confirmed',
  'website_live',
  'fully_verified',
]);

// Fields allowed for PATCH (everything else is admin-only or DB-managed).
const PATCH_FIELDS = new Set([
  'kind',
  'display_name',
  'city',
  'region',
  'country',
  'website',
  'contact_email',
  'contact_phone',
  'contact_name',
  'verification',
  'outreach_status',
  'outreach_owner',
  'initial_outreach_at',
  'last_outreach_at',
  'next_follow_up_at',
  'notes',
  'priority_score',
  'priority_signals',
  'rinkstop_claimed',
  'profile_completeness_pct',
]);

type PatchInput = Record<string, unknown>;

function parsePatch(input: unknown):
  | { ok: true; data: PatchInput }
  | { ok: false; errors: string[] } {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, errors: ['body must be an object'] };
  }
  const body = input as PatchInput;
  const out: PatchInput = {};
  const errors: string[] = [];

  for (const [k, v] of Object.entries(body)) {
    if (!PATCH_FIELDS.has(k)) {
      errors.push(`field not patchable: ${k}`);
      continue;
    }
    if (k === 'kind' && (typeof v !== 'string' || !PROSPECT_KINDS.has(v))) {
      errors.push('kind invalid');
      continue;
    }
    if (k === 'outreach_status' && (typeof v !== 'string' || !OUTREACH_STATUSES.has(v))) {
      errors.push('outreach_status invalid');
      continue;
    }
    if (k === 'verification' && (typeof v !== 'string' || !VERIFICATIONS.has(v))) {
      errors.push('verification invalid');
      continue;
    }
    if (k === 'priority_score') {
      if (typeof v !== 'number' || v < 0 || v > 100) {
        errors.push('priority_score must be 0-100');
        continue;
      }
      out[k] = Math.round(v);
      continue;
    }
    if (k === 'website' && typeof v === 'string' && v) {
      try {
        new URL(v);
      } catch {
        errors.push('website must be a valid URL');
        continue;
      }
    }
    if (k === 'contact_email' && typeof v === 'string' && v) {
      const emailOk = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v);
      if (!emailOk) {
        errors.push('contact_email invalid');
        continue;
      }
    }
    if (k === 'rinkstop_claimed' && typeof v !== 'boolean') {
      errors.push('row claimed must be boolean');
      continue;
    }
    out[k] = v;
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: out };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await getAdminFromRequest();
  if ('response' in authz) return authz.response as NextResponse;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, msg: 'id required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('b2b_prospects')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, msg: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, msg: 'not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, prospect: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await getAdminFromRequest();
  if ('response' in authz) return authz.response as NextResponse;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, msg: 'id required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, msg: 'invalid JSON' }, { status: 400 });
  }

  const parsed = parsePatch(body);
  if (parsed.ok !== true) {
    return NextResponse.json(
      { ok: false, msg: 'invalid body', errors: parsed.errors },
      { status: 400 }
    );
  }

  // Side-effect: if status moves to 'contacted' for the first time, set
  // initial_outreach_at automatically. Helps the audit trail without
  // forcing the caller to remember.
  const patch: PatchInput = { ...parsed.data };
  if (
    patch.outreach_status === 'contacted' ||
    patch.outreach_status === 'engaged' ||
    patch.outreach_status === 'claimed_via_outreach'
  ) {
    const { data: existing } = await supabaseAdmin
      .from('b2b_prospects')
      .select('initial_outreach_at, last_outreach_at')
      .eq('id', id)
      .maybeSingle();

    const now = new Date().toISOString();
    if (existing && !existing.initial_outreach_at) {
      patch.initial_outreach_at = now;
    }
    patch.last_outreach_at = now;
  }

  const { data, error } = await supabaseAdmin
    .from('b2b_prospects')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, msg: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, msg: 'not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, prospect: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authz = await getAdminFromRequest();
  if ('response' in authz) return authz.response as NextResponse;

  // Delete is super_admin only — losing a prospect record should be rare and intentional.
  if (!authz.admin.isSuperAdmin) {
    return NextResponse.json(
      { ok: false, msg: 'super_admin required for delete' },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, msg: 'id required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('b2b_prospects')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ ok: false, msg: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}