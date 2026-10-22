import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/profile-posts/me?include_deleted=true
// Returns the authenticated user's own posts for the dashboard.
//
// `include_deleted=true` additionally returns soft-deleted posts so the user can
// restore them. This is what makes the retention promise on /pricing real: the
// media is kept for 30 days, and this is how a user gets it back. Without it,
// "recoverable" would describe a file nobody can reach through the product.
//
// Restore eligibility is enforced server-side by POST
// /api/profile-posts/[id]/restore — this endpoint only lists what exists. Posts
// whose media has passed its retention window appear here but will refuse to
// restore; the UI surfaces the server's reason rather than hiding them, so the
// state is never silently wrong.
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const includeDeleted =
    new URL(request.url).searchParams.get('include_deleted') === 'true';

  let query = supabaseAdmin
    .from('profile_posts')
    .select('id, body, media_url, created_at, updated_at, deleted_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!includeDeleted) query = query.is('deleted_at', null);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
