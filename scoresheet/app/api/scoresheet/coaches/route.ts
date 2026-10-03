/**
 * GET /api/scoresheet/coaches?q=<query>
 *
 * Coach autocomplete for the game details form. Searches rinkstop
 * `profiles` (display_name + username) and returns matches as
 *   { id: string; display_name: string; username: string | null }
 *
 * 5-50 results, ranked by relevance. Service-role auth (anyone with
 * a session can search — coaches aren't sensitive data).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }
  const sb = getServerSupabase();
  if (!sb) return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });

  // Search display_name OR username.
  const { data, error } = await sb
    .from('profiles')
    .select('user_id, display_name, username, avatar_url')
    .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
    .limit(15);

  if (error) {
    console.error('[coaches-search]', error);
    return NextResponse.json({ error: 'Search failed.' }, { status: 500 });
  }

  const results = (data || []).map((p) => ({
    id: p.user_id,
    display_name: p.display_name || p.username || 'Unknown',
    username: p.username,
    avatar_url: p.avatar_url,
  }));
  return NextResponse.json({ results });
}
