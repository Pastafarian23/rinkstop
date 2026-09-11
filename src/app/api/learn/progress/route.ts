/**
 * GET /api/learn/progress
 *
 * Returns the current user's /learn progress: which hrefs they've marked
 * as read, when, and total pages in the catalog (so the client can render
 * "X of N" without a second fetch).
 *
 * Used by:
 *   - /learn index page "Your progress" widget (Phase 5 PR2)
 *   - /learn subpages to show "✓ Marked as read" badge
 *   - /api/learn/next-step recommendation engine (cross-checks against catalog)
 *
 * Auth: required (Clerk). 401 if unauthenticated.
 *
 * Response:
 *   { readHrefs: string[], readCount: number, totalCount: number,
 *     lastReadAt: string | null }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { LEARN } from '@/lib/learn-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session.userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('learn_progress')
    .select('href, read_at')
    .eq('user_id', session.userId)
    .order('read_at', { ascending: false });

  if (error) {
    console.error('[learn/progress] select failed:', error);
    return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 });
  }

  const readHrefs = (data || []).map((r) => r.href);
  const lastReadAt = readHrefs.length > 0 ? data![0].read_at : null;

  return NextResponse.json({
    readHrefs,
    readCount: readHrefs.length,
    totalCount: LEARN.length,
    lastReadAt,
  });
}
