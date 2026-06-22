import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POST_TABLES = ['team_news', 'team_schedule', 'team_results'] as const;
type PostTable = (typeof POST_TABLES)[number];

interface MarkReadRequest {
  postTable: PostTable;
  postId: string;
}

function validate(body: unknown): body is MarkReadRequest {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (typeof b.postTable !== 'string' || !POST_TABLES.includes(b.postTable as PostTable)) return false;
  if (typeof b.postId !== 'string' || !UUID_RE.test(b.postId)) return false;
  return true;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!validate(body)) {
    return NextResponse.json({ error: 'Invalid postTable or postId' }, { status: 400 });
  }

  // Verify the post exists (and the user can see it)
  const { data: post, error: postErr } = await supabaseAdmin
    .from(body.postTable)
    .select('id, team_id')
    .eq('id', body.postId)
    .single();

  if (postErr || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Verify the user is on the team that owns the post (or is a parent)
  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('id')
    .eq('team_id', post.team_id)
    .or(`user_id.eq.${userId},parent_user_id.eq.${userId}`)
    .is('left_at', null)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: 'You are not a member of this team' }, { status: 403 });
  }

  // Mark as read (idempotent via the SQL function)
  const { error } = await supabaseAdmin.rpc('mark_feed_post_read', {
    p_user_id: userId,
    p_post_table: body.postTable,
    p_post_id: body.postId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
