/**
 * GET /api/corrections/mine — caller's own submissions, newest first
 *
 * Phase 2-A0. Approved by Arnel 2026-07-08.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { resolveCanonicalUserId } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, getClientIP, applyRateLimitHeaders, maybeCleanup } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = await checkRateLimit(`corrections-mine:${ip}`, { maxRequests: 60, windowMs: 60 * 1000 });
  maybeCleanup();

  const session = await auth();
  if (!session?.userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);
  if (!userId) {
    const res = NextResponse.json({ error: 'Sign in.' }, { status: 401 });
    return applyRateLimitHeaders(res, rl);
  }

  const { data, error } = await supabaseAdmin
    .from('corrections')
    .select('id, entity_type, entity_id, field_name, current_value, proposed_value, reason, status, reviewer_note, submitted_at, reviewed_at')
    .eq('submitter_user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(100);
  if (error) {
    console.error('[corrections-mine] fetch failed:', error);
    const res = NextResponse.json({ error: 'Failed to load submissions.' }, { status: 500 });
    return applyRateLimitHeaders(res, rl);
  }

  const res = NextResponse.json({ ok: true, submissions: data || [] });
  return applyRateLimitHeaders(res, rl);
}