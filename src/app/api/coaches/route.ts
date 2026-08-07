// src/app/api/coaches/route.ts
// POST /api/coaches — create or update the authenticated user's coach_profiles row.
//
// Phase 4 (2026-07-10). Upsert pattern (one coach per profile_id).
// A user creates a coach profile by submitting this; subsequent updates
// hit the same endpoint with the same body shape.

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

// WS8 PR4: VALID_AUTHORITIES removed — coach license/federation registration
// is now driven by the federation_registrations.federation_id FK (typed via
// the federations table), not by free-text authority names. See
// PATCH /api/coach/credentials.

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`coach-profile:${ip}`, RATE_LIMIT);
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

  // WS8 PR4: license_number / license_issuing_authority / license_expires_at
  // were removed from coach_profiles. Federation registration goes through
  // PATCH /api/coach/credentials → federation_registrations.
  const {
    years_coaching,
    current_team_id,
    bio,
  } = body ?? {};

  // Validation
  if (years_coaching != null && years_coaching !== '') {
    const y = Number(years_coaching);
    if (!Number.isInteger(y) || y < 0 || y > 80) {
      return NextResponse.json({ error: 'years_coaching must be 0-80.' }, { status: 400 });
    }
  }

  if (current_team_id != null && current_team_id !== '') {
    const { data: team, error: teamErr } = await supabaseAdmin
      .from('team_workspaces')
      .select('id')
      .eq('id', current_team_id)
      .maybeSingle();
    if (teamErr) {
      console.error('[coaches] team lookup failed', teamErr);
      return NextResponse.json({ error: 'Failed to look up team.' }, { status: 500 });
    }
    if (!team) {
      return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    }
  }

  if (bio != null && typeof bio === 'string' && bio.length > 1000) {
    return NextResponse.json({ error: 'bio too long (max 1000 chars).' }, { status: 400 });
  }

  // Build upsert payload
  const payload: Record<string, any> = {
    profile_id: userId,
  };
  if (years_coaching !== undefined) payload.years_coaching = years_coaching === '' ? null : Number(years_coaching);
  if (current_team_id !== undefined) payload.current_team_id = current_team_id || null;
  if (bio !== undefined) payload.bio = bio?.trim() || null;
  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('coach_profiles')
    .upsert(payload, { onConflict: 'profile_id' })
    .select('id, profile_id, years_coaching, current_team_id, bio, verification_status, created_at, updated_at')
    .single();

  if (error) {
    console.error('[coaches] upsert failed', error);
    return NextResponse.json({ error: 'Failed to save coach profile.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, coach: data });
}