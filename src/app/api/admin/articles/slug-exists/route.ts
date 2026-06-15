import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/articles/slug-exists?slug=X&id=Y
 *
 * Checks whether a slug is already in use on a post OTHER than the
 * one being edited (so we can show a collision warning during review
 * without false-positive matching the post's own slug).
 *
 * Returns: { exists: boolean, existing?: { id, slug, title } }
 */
export async function GET(req: NextRequest) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;

  const sp = new URL(req.url).searchParams;
  const slug = (sp.get('slug') || '').trim();
  const id = (sp.get('id') || '').trim();

  if (!slug) {
    return NextResponse.json({ exists: false });
  }

  let query = supabaseAdmin
    .from('posts')
    .select('id, slug, title')
    .eq('slug', slug)
    .limit(1);

  if (id) {
    query = query.neq('id', id);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    return NextResponse.json({ exists: false, error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({
    exists: true,
    existing: { id: data.id, slug: data.slug, title: data.title },
  });
}
