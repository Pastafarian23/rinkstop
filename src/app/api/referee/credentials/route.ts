// src/app/api/referee/credentials/route.ts
// PATCH /api/referee/credentials — referee edits their DRAFT federation
// registration. Same shape as the player + coach flow.
//
// Tier 2 PR2 (2026-07-23). Referee-only via referee_user_id ownership.

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

function normalizeNumber(raw: any): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (trimmed.length > 32) return null;
  if (/[\s\r\n\t]/.test(trimmed)) return null;
  return trimmed;
}

export async function PATCH(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`ref-creds:${ip}`, RATE_LIMIT);
  maybeCleanup();
  if (!result.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    applyRateLimitHeaders(res, result);
    return res;
  }

  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!session.userId) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const { federation_slug, registration_number, expires_at } = body ?? {};
  if (!federation_slug || typeof federation_slug !== 'string') {
    return NextResponse.json({ error: 'federation_slug is required.' }, { status: 400 });
  }
  const numberNorm = normalizeNumber(registration_number);
  if (!numberNorm) {
    return NextResponse.json({ error: 'registration_number is required.' }, { status: 400 });
  }

  const { data: fed, error: fedErr } = await supabaseAdmin
    .from('federations')
    .select('id')
    .eq('slug', federation_slug)
    .maybeSingle();
  if (fedErr || !fed) {
    return NextResponse.json({ error: `Federation "${federation_slug}" not found.` }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from('federation_registrations')
    .select('id, submission_status')
    .eq('referee_user_id', userId)
    .eq('federation_id', fed.id)
    .maybeSingle();
  if (existing && existing.submission_status !== 'draft') {
    return NextResponse.json(
      { error: `Cannot edit — status is "${existing.submission_status}". Withdraw first.` },
      { status: 409 }
    );
  }

  const updatePayload: Record<string, any> = {
    registration_number: numberNorm,
    updated_at: new Date().toISOString(),
  };
  if (expires_at !== undefined) updatePayload.expires_at = expires_at || null;

  if (existing) {
    const { error } = await supabaseAdmin
      .from('federation_registrations')
      .update(updatePayload)
      .eq('id', existing.id);
    if (error) {
      return NextResponse.json({ error: 'Failed to update draft.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, registration_id: existing.id });
  }

  const insertPayload: Record<string, any> = {
    referee_user_id: userId,
    federation_id: fed.id,
    registration_number: numberNorm,
    submission_status: 'draft',
  };
  if (expires_at) insertPayload.expires_at = expires_at;

  const { data: inserted, error } = await supabaseAdmin
    .from('federation_registrations')
    .insert(insertPayload)
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A registration already exists for this referee + federation.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to save draft.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, registration_id: inserted.id });
}
