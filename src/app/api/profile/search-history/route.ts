/**
 * GET /api/profile/search-history
 *
 * Returns the caller's most recent 8 search queries from profile_search_history,
 * ordered by last_searched_at DESC. Used to populate the "Recent searches"
 * section of the search dropdown.
 *
 * Auth: Clerk (auth() / currentUser()). Filters by Clerk userId — the
 * application layer enforces that callers can only read their own history.
 * RLS policies block all client-side direct access (defense in depth).
 *
 * Response: { searches: SearchHistoryRow[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);

  if (!userId) {
    return NextResponse.json({ searches: [] });
  }

  const { data, error } = await supabaseAdmin
    .from('profile_search_history')
    .select('query, source, last_searched_at')
    .eq('user_id', userId)
    .order('last_searched_at', { ascending: false })
    .limit(8);

  if (error) {
    console.error('[search-history] select failed:', error);
    return NextResponse.json({ searches: [] });
  }

  return NextResponse.json({ searches: data ?? [] });
}
