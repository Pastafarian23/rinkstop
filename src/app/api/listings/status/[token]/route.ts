import { NextRequest, NextResponse } from 'next/server';
import { getSubmissionStatusByToken } from '@/lib/submission-status';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const RL = { maxRequests: 30, windowMs: 60 * 1000 };

// GET /api/listings/status/[token]
//
// Public status for a listing submission, keyed by an unguessable token.
//
// SECURITY MODEL (2026-10-30):
//   `listing_submissions` holds submitter email addresses and our internal
//   notes. The anon Supabase key CANNOT read that table — a public SELECT
//   policy on it was dropped on 2026-10-30 after it was found to expose
//   every lead's email address (see
//   supabase/migrations/2026-10-30_listing_submissions_pii_lockdown.sql).
//
//   So this endpoint resolves the token SERVER-SIDE with the service-role
//   client and returns ONLY what the submitter should see. Never add
//   `email`, `notes`, `outcome_notes`, `reviewed_by` or `contacted_by` to
//   the response.
//
//   The token is 256 bits of entropy, so it is not guessable, but it IS
//   rate-limited anyway as defence in depth.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const ip = getClientIP(request);
  const result = await checkRateLimit(`listing-status:${ip}`, RL);
  maybeCleanup();

  const view = await getSubmissionStatusByToken(token);

  if (!view) {
    const res = NextResponse.json({ error: 'Not found' }, { status: 404 });
    return applyRateLimitHeaders(res, result);
  }

  const res = NextResponse.json(view);
  // Do not cache — the status changes when we approve the submission.
  res.headers.set('Cache-Control', 'no-store, max-age=0');
  return applyRateLimitHeaders(res, result);
}
