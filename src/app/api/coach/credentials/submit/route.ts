// src/app/api/coach/credentials/submit/route.ts
// POST /api/coach/credentials/submit
//
// Coach submits a DRAFT federation_registrations row for admin verification.
// Body: { registration_id: UUID }
//
// Tier 2 PR2 (2026-07-23).

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`coach-creds-submit:${ip}`, RATE_LIMIT);
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
  const { registration_id } = body ?? {};
  if (!registration_id || typeof registration_id !== 'string') {
    return NextResponse.json({ error: 'registration_id (UUID) is required.' }, { status: 400 });
  }

  // Fetch the row + verify ownership via coach_profiles.profile_id.
  const { data: row, error: rowErr } = await supabaseAdmin
    .from('federation_registrations')
    .select('id, submission_status, coach_id')
    .eq('id', registration_id)
    .maybeSingle();
  if (rowErr || !row) {
    return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
  }
  if (!row.coach_id) {
    return NextResponse.json({ error: 'Wrong persona — this is not a coach registration.' }, { status: 400 });
  }
  const { data: coach, error: coachErr } = await supabaseAdmin
    .from('coach_profiles')
    .select('id, profile_id')
    .eq('id', row.coach_id)
    .maybeSingle();
  if (coachErr || !coach) {
    return NextResponse.json({ error: 'Failed to verify ownership.' }, { status: 500 });
  }
  if (coach.profile_id !== userId) {
    return NextResponse.json({ error: 'Not your registration.' }, { status: 403 });
  }
  if (row.submission_status !== 'draft') {
    return NextResponse.json(
      { error: `Cannot submit — status is "${row.submission_status}".` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const { error: updErr } = await supabaseAdmin
    .from('federation_registrations')
    .update({
      submission_status: 'pending',
      submitted_at: now,
      submitted_by: userId,
      rejection_reason: null,
      verified_at: null,
      verified_by: null,
      updated_at: now,
    })
    .eq('id', registration_id);
  if (updErr) {
    console.error('[coach-creds-submit] update failed', updErr);
    return NextResponse.json({ error: 'Failed to submit.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, submission_status: 'pending' });
}
