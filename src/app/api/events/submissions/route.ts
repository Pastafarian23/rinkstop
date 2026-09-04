// src/app/api/events/submissions/route.ts
//
// Public: submit a new event for review by a rink owner.
//   POST /api/events/submissions
//
// Does NOT require auth — anyone (signed in or not) can submit an event.
// If the submitter is signed in, we link their profile to the submission.
//
// Rate-limited to prevent spam (10 submissions per hour per IP).
//
// NOTE: actual DB columns are: title, description, event_type, starts_at, ends_at,
// source_url, rink_id, submitter_name, submitter_email, status, submission_source,
// rejection_reason, reviewed_at, reviewed_by, created_event_id, raw_payload.
// (Per OpenAPI schema; supersedes the 2026-08-04_rink_programming_and_events.sql
// migration which was never applied to dev/prod in this exact form.)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EVENT_TYPES = new Set([
  'public_skate','stick_and_puck','learn_to_skate','open_hockey','pickup',
  'drop_in','youth_league','adult_league','shinny','rat_hockey','broomball',
  'figure_skating','tournament','camp','tryout','showcase','other',
]);

const RATE_LIMIT = { maxRequests: 10, windowMs: 60 * 60 * 1000 }; // 10/hour

function tooManyRequests(message: string, rl: { remaining: number; limit: number; retryAfter?: number }) {
  const res = NextResponse.json({ error: message }, { status: 429 });
  applyRateLimitHeaders(res, rl);
  return res;
}

// POST /api/events/submissions
export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(`event-submit:${getClientIP(request)}`, RATE_LIMIT);
  maybeCleanup();
  if (!rl.allowed) {
    return tooManyRequests('Too many submissions. Please try again later.', rl);
  }

  try {
    const body = await request.json();

    // Required field validation
    const errors: string[] = [];
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length < 3) {
      errors.push('Title is required (min 3 chars).');
    }
    if (!body.event_type || !EVENT_TYPES.has(body.event_type)) {
      errors.push('Event type is required.');
    }
    if (!body.starts_at) {
      errors.push('Start date/time is required.');
    } else if (isNaN(new Date(body.starts_at).getTime())) {
      errors.push('Start date/time is invalid.');
    }
    if (!body.ends_at) {
      errors.push('End date/time is required.');
    } else if (isNaN(new Date(body.ends_at).getTime())) {
      errors.push('End date/time is invalid.');
    } else if (new Date(body.ends_at) <= new Date(body.starts_at)) {
      errors.push('End must be after start.');
    }
    if (!body.submitter_name || typeof body.submitter_name !== 'string' || body.submitter_name.trim().length < 2) {
      errors.push('Your name is required.');
    }
    if (!body.submitter_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.submitter_email)) {
      errors.push('Valid email is required.');
    }

    // rink_id is optional, but if provided, must reference an existing rink
    let rinkId: string | null = null;
    if (body.rink_id) {
      const { data: rink } = await supabaseAdmin
        .from('rinks')
        .select('id')
        .eq('id', body.rink_id)
        .maybeSingle();
      if (rink) rinkId = rink.id;
      else errors.push('Rink not found.');
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
    }

    // Get submitter user_id if signed in
    let submitterUserId: string | null = null;
    try {
      const session = await auth();
      if (session.userId) submitterUserId = session.userId;
    } catch { /* anonymous is fine */ }

    const payload: Record<string, unknown> = {
      rink_id: rinkId,
      submitter_name: String(body.submitter_name).trim(),
      submitter_email: String(body.submitter_email).trim().toLowerCase(),
      title: String(body.title).trim(),
      event_type: String(body.event_type),
      starts_at: new Date(body.starts_at).toISOString(),
      ends_at: new Date(body.ends_at).toISOString(),
      source_url: body.registration_url || body.source_url || null,
      description: body.description || null,
      status: 'pending',
      submission_source: 'public_form',
      raw_payload: {
        submitted_address: body.address || null,
        submitted_notes: body.notes || null,
        submitted_timezone: body.timezone || null,
        submitter_user_id: submitterUserId,
      },
    };

    const { data: submission, error } = await supabaseAdmin
      .from('event_submissions')
      .insert(payload)
      .select('id, status, created_at')
      .single();

    if (error || !submission) {
      console.error('[event-submissions POST] insert error:', error);
      return NextResponse.json({ error: 'Failed to submit. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({
      submission_id: submission.id,
      status: submission.status,
      message: 'Thanks! The rink owner will review your submission.',
    }, { status: 201 });
  } catch (err) {
    console.error('[event-submissions POST] handler error:', err);
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 });
  }
}
