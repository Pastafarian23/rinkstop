import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/articles/[id]/review-history
 * Returns the post_review_edits rows for a post, newest first.
 * Used by the review screen to show "what's been edited before."
 */
export async function GET(_req: NextRequest, { params }: Props) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('post_review_edits')
    .select('id, field, old_value, new_value, reviewed_by, reviewed_at')
    .eq('post_id', id)
    .order('id', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ edits: data || [] });
}
