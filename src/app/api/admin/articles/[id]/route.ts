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
 * Returns the post plus joined cross-link references.
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
 *
 * Two update paths:
 *   1) Review path — atomic "promote with edits" via review_post_with_edits RPC.
 *      Triggered when body contains any of:
 *        title, subtitle, content, tags, category,
 *        cross_link_overrides, highlight_id_override
 *      AND/OR when status transitions to/from published with content edits.
 *      Writes diff rows to post_review_edits and sets reviewed_by/reviewed_at.
 *
 *   2) Legacy path — flat column updates for fields outside the review set
 *      (seo_title, seo_description, slug, is_featured, og_image_url, etc.).
 *      Does not write to post_review_edits.
 *
 * Status-only changes (no content edits) are routed through the legacy path
 * to keep queue actions (promote/archive) snappy and to not create
 * "noisy" diff rows for routine status flips.
 */
export async function PATCH(req: NextRequest, { params }: Props) {
  const auth = await getAdminFromRequest();
  if ('response' in auth) return auth.response;
  const { id } = await params;
  const adminCtx = auth.admin;

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // ============================================================
  // Path 1: review (content edits + status change, atomic with diff)
  // ============================================================
  const REVIEW_FIELDS = [
    'title', 'subtitle', 'content', 'tags', 'category',
    'cross_link_overrides', 'highlight_id_override',
  ];

  const reviewChanges: Record<string, any> = {};
  for (const key of REVIEW_FIELDS) {
    if (key in body) reviewChanges[key] = body[key];
  }

  const hasReviewChanges = Object.keys(reviewChanges).length > 0;
  const hasStatusChange = 'status' in body;

  if (hasReviewChanges) {
    // Route through the RPC. This atomically updates the post + writes
    // diff rows to post_review_edits.
    const statusToSet = hasStatusChange ? body.status : null;

    const { data, error } = await supabaseAdmin.rpc('review_post_with_edits', {
      p_post_id: id,
      p_reviewer_id: adminCtx.userId,
      p_changes: reviewChanges,
      p_set_status: statusToSet,
    });

    if (error) {
      // Translate known errors to friendly HTTP codes
      if (error.message?.includes('article_not_found')) {
        return NextResponse.json({ error: 'article_not_found' }, { status: 404 });
      }
      if (error.message?.includes('field_not_editable')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message?.includes('invalid_status')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If the request also had non-review fields (e.g. SEO tweaks), apply
    // them in a follow-up update. The RPC is the source of truth for the
    // review-tracked fields.
    const LEGACY_FIELDS = [
      'seo_title', 'seo_description', 'slug',
      'is_featured', 'og_image_url', 'reading_time_minutes',
      'author_name', 'author_role',
      'team_home_id', 'team_away_id', 'league_id', 'player_id', 'country_slug',
      'highlight_id',
    ];
    const legacy: Record<string, any> = {};
    for (const key of LEGACY_FIELDS) {
      if (key in body) legacy[key] = body[key];
    }
    if (Object.keys(legacy).length > 0) {
      legacy.updated_at = new Date().toISOString();
      const { data: postLegacy, error: legacyErr } = await supabaseAdmin
        .from('posts')
        .update(legacy)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (legacyErr) {
        // RPC succeeded but legacy update failed — return the RPC data
        // with a warning. The review changes are persisted; SEO tweak is lost.
        return NextResponse.json({
          ...(data as any),
          _warning: `Review changes saved, but legacy update failed: ${legacyErr.message}`,
        });
      }
      return NextResponse.json(postLegacy);
    }

    return NextResponse.json(data);
  }

  // ============================================================
  // Path 2: legacy flat update (status-only, SEO, etc.)
  // ============================================================
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
