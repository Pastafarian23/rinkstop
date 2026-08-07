// src/app/api/referee/credentials/submit/route.ts
// POST /api/referee/credentials/submit
//
// Referee submits a DRAFT federation_registrations row for admin verification.
// Body: { registration_id: UUID }

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 1000 };

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const result = await checkRateLimit(`ref-creds-submit:${ip}`, RATE_LIMIT);
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

  const { data: row, error: rowErr } = await supabaseAdmin
    .from('federation_registrations')
    .select('id, submission_status, referee_user_id')
    .eq('id', registration_id)
    .maybeSingle();
  if (rowErr || !row) {
    return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
  }
  if (!row.referee_user_id) {
    return NextResponse.json({ error: 'Wrong persona — this is not a referee registration.' }, { status: 400 });
  }
  if (row.referee_user_id !== userId) {
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
    return NextResponse.json({ error: 'Failed to submit.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, submission_status: 'pending' });
}
