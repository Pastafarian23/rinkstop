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

const VALID_AUTHORITIES = [
  'USA Hockey',
  'Hockey Canada',
  'IIHF',
  'USHL',
  'NAHL',
  'NCAA',
  'Other',
];

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

  const {
    license_number,
    license_issuing_authority,
    license_expires_at,
    years_coaching,
    current_team_id,
    bio,
  } = body ?? {};

  // Validation
  if (license_issuing_authority != null && license_issuing_authority !== '' && !VALID_AUTHORITIES.includes(license_issuing_authority)) {
    return NextResponse.json(
      { error: `license_issuing_authority must be one of: ${VALID_AUTHORITIES.join(', ')}` },
      { status: 400 }
    );
  }

  if (license_number != null && typeof license_number === 'string' && license_number.length > 64) {
    return NextResponse.json({ error: 'license_number too long (max 64 chars).' }, { status: 400 });
  }

  if (license_expires_at != null && license_expires_at !== '') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(license_expires_at)) {
      return NextResponse.json({ error: 'license_expires_at must be YYYY-MM-DD.' }, { status: 400 });
    }
  }

  if (years_coaching != null && years_coaching !== '') {
    const y = Number(years_coaching);
    if (!Number.isInteger(y) || y < 0 || y > 80) {
      return NextResponse.json({ error: 'years_coaching must be 0-80.' }, { status: 400 });
    }
  }

  if (current_team_id != null && current_team_id !== '') {
    const { data: team, error: teamErr } = await supabaseAdmin
      .from('teams')
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
  if (license_number !== undefined) payload.license_number = license_number?.trim() || null;
  if (license_issuing_authority !== undefined) payload.license_issuing_authority = license_issuing_authority?.trim() || null;
  if (license_expires_at !== undefined) payload.license_expires_at = license_expires_at || null;
  if (years_coaching !== undefined) payload.years_coaching = years_coaching === '' ? null : Number(years_coaching);
  if (current_team_id !== undefined) payload.current_team_id = current_team_id || null;
  if (bio !== undefined) payload.bio = bio?.trim() || null;
  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('coach_profiles')
    .upsert(payload, { onConflict: 'profile_id' })
    .select('id, profile_id, license_number, license_issuing_authority, license_expires_at, years_coaching, current_team_id, bio, verification_status, created_at, updated_at')
    .single();

  if (error) {
    console.error('[coaches] upsert failed', error);
    return NextResponse.json({ error: 'Failed to save coach profile.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, coach: data });
}