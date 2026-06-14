import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/articles/[id]
 * Get a single article by id (admin view — no status filter).
 */
export async function GET(_req: NextRequest, { params }: Props) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('posts')
    .select(
      `*, team_home:teams!posts_team_home_id_fkey(id, name, slug),
       team_away:teams!posts_team_away_id_fkey(id, name, slug),
       league:leagues!posts_league_id_fkey(id, name, slug),
       player:players!posts_player_id_fkey(id, first_name, last_name, slug)`,
    )
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'article_not_found' }, { status: 404 });
  return NextResponse.json(data);
}

/**
 * PATCH /api/admin/articles/[id]
 * Update fields on a single article. Common uses:
 *   - status transitions: { status: 'draft' | 'published' | 'archived' }
 *   - title / content / tags edits
 *   - cross-link adjustments
 *
 * Setting status to 'published' for the first time sets published_at = now().
 * Setting status to 'archived' sets a `archived_at` value if the column
 * exists (fall back to updated_at if not).
 */
export async function PATCH(req: NextRequest, { params }: Props) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;
  const { id } = await params;

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Whitelist which fields can be updated through this endpoint.
  // Adding fields here is a security decision — anything not listed is rejected.
  const ALLOWED_FIELDS = [
    'title', 'subtitle', 'content', 'content_html',
    'seo_title', 'seo_description', 'slug',
    'tags', 'category', 'status', 'is_featured',
    'team_home_id', 'team_away_id', 'league_id', 'player_id', 'country_slug',
    'highlight_id', 'og_image_url', 'reading_time_minutes',
    'author_name', 'author_role',
  ];

  const update: Record<string, any> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) update[key] = body[key];
  }

  // Status transition side-effects
  if (update.status === 'published') {
    // Only set published_at if it isn't already set (preserve original publish date on re-publish)
    const { data: existing } = await supabaseAdmin
      .from('posts')
      .select('published_at')
      .eq('id', id)
      .maybeSingle();
    if (!existing?.published_at) {
      update.published_at = new Date().toISOString();
    }
  }
  // Note: we use updated_at as the archive timestamp proxy.
  // The posts table has no archived_at column (verified 2026-06-14).
  // When admin archives, the row gets status='archived' and updated_at=now().

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Always bump updated_at
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('posts')
    .update(update)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'article_not_found' }, { status: 404 });
  return NextResponse.json(data);
}

/**
 * DELETE /api/admin/articles/[id]
 * Hard delete. Use PATCH with {status: 'archived'} for soft delete.
 * Kept for completeness — the admin UI defaults to archive.
 */
export async function DELETE(_req: NextRequest, { params }: Props) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('posts')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
