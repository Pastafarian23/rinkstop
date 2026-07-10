// src/app/api/passport/federation/route.ts
// PATCH /api/passport/federation — owner updates their own federation numbers.
//
// Phase 3 (2026-07-10). Self-reported by default; v1 doesn't have USA Hockey
// or Hockey Canada API integration for verification.

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

const VALID_POSITIONS = ['forward', 'defense', 'goalie'];

// Format sanity: USA Hockey # is typically 9-12 digits. Hockey Canada #
// is alphanumeric, 6-10 chars. We don't hard-fail on format (some federations
// vary), but we trim, normalize, and reject obviously-wrong values.
function normalizeNumber(raw: any): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (trimmed.length > 32) return null;
  // Reject obviously wrong values: empty after trim, contains whitespace, control chars
  if (/[\s\r\n\t]/.test(trimmed)) return null;
  return trimmed;
}

export async function PATCH(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`passport-fed:${ip}`, RATE_LIMIT);
  maybeCleanup();

  if (!result.allowed) {
    const res = new NextResponse(JSON.stringify({ error: 'Too many requests. Please slow down.' }), { status: 429 });
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

  const { usa_hockey_number, hockey_canada_number, primary_position_category } = body ?? {};

  let usaNorm: string | null;
  let hcNorm: string | null;
  try {
    usaNorm = normalizeNumber(usa_hockey_number);
    hcNorm = normalizeNumber(hockey_canada_number);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  // Allow "" or null to clear the field, but reject obviously-bad strings.
  // The frontend sends "" to mean "clear this field"; we coerce to null.

  if (primary_position_category != null && primary_position_category !== '') {
    if (!VALID_POSITIONS.includes(primary_position_category)) {
      return NextResponse.json({ error: `primary_position_category must be one of: ${VALID_POSITIONS.join(', ')}` }, { status: 400 });
    }
  }

  // Resolve player
  const { data: player, error: playerErr } = await supabaseAdmin
    .from('players')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (playerErr) {
    console.error('[passport-fed] player lookup failed', playerErr);
    return NextResponse.json({ error: 'Failed to look up player record.' }, { status: 500 });
  }
  if (!player) {
    return NextResponse.json(
      { error: 'You need to claim a player profile before setting federation numbers. Claim your profile at /claim-your-listing.' },
      { status: 403 }
    );
  }

  const updatePayload: Record<string, any> = {};
  if (usa_hockey_number !== undefined) updatePayload.usa_hockey_number = usaNorm;
  if (hockey_canada_number !== undefined) updatePayload.hockey_canada_number = hcNorm;
  if (primary_position_category !== undefined) {
    updatePayload.primary_position_category = primary_position_category === '' ? null : primary_position_category;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('players')
    .update(updatePayload)
    .eq('id', player.id);

  if (error) {
    console.error('[passport-fed] update failed', error);
    return NextResponse.json({ error: 'Failed to save federation numbers.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}