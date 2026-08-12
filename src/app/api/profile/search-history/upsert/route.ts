/**
 * POST /api/profile/search-history/upsert
 *
 * Records (or increments) a search query in the caller's profile_search_history.
 * Called when a user executes any search from any search bar on the site.
 *
 * Auth: Clerk. Application layer filters by Clerk userId.
 *
 * Body: { q: string; source: 'home_hero' | 'dashboard_header' | 'command_palette' | 'directory_results' }
 *
 * Logic:
 *   - Normalizes query (lowercase, trim, collapse whitespace)
 *   - Tries UPDATE first: increments search_count + updates last_searched_at
 *   - If no rows matched → INSERT new row
 *   - After write, prunes to keep only the 8 most recent distinct queries
 *     per user (defense against overflow; prune failures are silently ignored)
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveCanonicalUserId } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  const cu = await currentUser();
  const userEmail = cu?.emailAddresses?.[0]?.emailAddress || '';
  const userId = await resolveCanonicalUserId(session.userId, userEmail);

  if (!userId) {
    return NextResponse.json({ ok: false, reason: 'unauthenticated' }, { status: 401 });
  }

  let body: { q?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid JSON' }, { status: 400 });
  }

  const raw = (body.q ?? '').trim();
  if (!raw || raw.length < 2) {
    return NextResponse.json({ ok: false, reason: 'query too short' }, { status: 400 });
  }

  const source = (body.source ?? 'home_hero') as string;
  const VALID_SOURCES = ['home_hero', 'dashboard_header', 'command_palette', 'directory_results'];
  if (!VALID_SOURCES.includes(source)) {
    return NextResponse.json({ ok: false, reason: 'invalid source' }, { status: 400 });
  }

  const queryNormalized = raw.toLowerCase().replace(/\s+/g, ' ');
  const now = new Date().toISOString();

  // Try UPDATE first (increments count if row already exists)
  const { data: existing } = await supabaseAdmin
    .from('profile_search_history')
    .select('id, search_count')
    .eq('user_id', userId)
    .eq('query_normalized', queryNormalized)
    .single();

  if (existing) {
    // Row exists — update it
    await supabaseAdmin
      .from('profile_search_history')
      .update({
        search_count: existing.search_count + 1,
        last_searched_at: now,
      })
      .eq('id', existing.id);
  } else {
    // New query — insert it
    await supabaseAdmin
      .from('profile_search_history')
      .insert({
        user_id: userId,
        query: raw,
        query_normalized: queryNormalized,
        source,
        search_count: 1,
        first_searched_at: now,
        last_searched_at: now,
      });
  }

  // Prune: keep only the 8 most recent searches per user
  const { data: keepIds } = await supabaseAdmin
    .from('profile_search_history')
    .select('id')
    .eq('user_id', userId)
    .order('last_searched_at', { ascending: false })
    .limit(8);

  if (keepIds && keepIds.length > 0) {
    const idsToDelete = keepIds.map((r: { id: string }) => r.id);
    await supabaseAdmin
      .from('profile_search_history')
      .delete()
      .eq('user_id', userId)
      .not('id', 'in', idsToDelete);
  }

  return NextResponse.json({ ok: true });
}
