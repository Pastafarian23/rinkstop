import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { assetRefFromPublicUrl, releaseAssetRef } from '@/lib/media-ledger';

// Matches the limits enforced by POST /api/profile-posts.
const MAX_BODY_LENGTH = 1000;
const ALLOWED_SPORTS = new Set([
  'hockey', 'figure_skating', 'speed_skating',
  'basketball', 'soccer', 'baseball', 'other',
]);

// DELETE /api/profile-posts/[id]
// Soft-deletes a post. Only the owner can delete their own post.
//
// WHAT HAPPENS TO THE MEDIA (2026-10-23)
// This route used to only set `deleted_at`. The Storage object was left behind
// forever, and because quota was measured by walking the bucket, a deleted
// post's video kept consuming the owner's allowance permanently. Deleting a
// post did not free a single byte — the user could delete everything and still
// be over quota, with no way to recover.
//
// Now the media reference is released from the quota ledger:
//
//   ref_count > 0  → object still used elsewhere (another post, a cover,
//                     a listing photo). It stays live and fully counted, and
//                     NOTHING is deleted from Storage. This is the shared-asset
//                     guarantee: removing one reference never destroys media
//                     another page still renders.
//   ref_count = 0  → the database trigger stamps retained_until = now() + 30d.
//                     The file is kept (so an accidental delete is recoverable)
//                     and still counts during the grace window, then stops
//                     counting and a reaper deletes it.
//
// Storage is deliberately NOT touched here. Deleting the object inline would
// break shared assets, and would make an accidental post-delete unrecoverable.
// Physical deletion is the reaper's job, once retention has expired.
//
// The release is best-effort: if it fails, the post is still soft-deleted
// (the user's data is safe) and the object simply keeps counting for now. The
// fallback bucket-walk measurement still reflects reality, so the failure mode
// is "quota stays high for a while", never "quota disappears".
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership before deleting. We need media_url too, to release the
  // ledger reference.
  const { data: post } = await supabaseAdmin
    .from('profile_posts')
    .select('id, user_id, media_url')
    .eq('id', id)
    .maybeSingle();

  if (!post) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (post.user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from('profile_posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Release the media reference from the quota ledger.
  //
  // Order matters: the post is soft-deleted FIRST so the user's intent is
  // honoured even if the ledger call fails. Reversing this could leave a
  // deleted post still counting against quota AND still visible.
  let mediaReleased: 'released' | 'still_referenced' | 'skipped' = 'skipped';
  if (post.media_url) {
    const asset = assetRefFromPublicUrl(post.media_url, 'post-media');
    if (asset) {
      const result = await releaseAssetRef(asset, {
        refTable: 'profile_posts',
        refId: id,
      });
      if (result.ok) {
        mediaReleased = result.refCount === 0 ? 'released' : 'still_referenced';
      }
    }
    // A non-storage media_url (external link) needs no ledger bookkeeping.
  }

  console.log('[profile-posts DELETE]', { postId: id, userId, mediaReleased });

  return NextResponse.json({ success: true, mediaReleased });
}

// PATCH /api/profile-posts/[id]
// Edits a post's text, sport, and/or link. Only the owner can edit.
//
// 2026-11-05 (Arnel: "Fix posting from profile, can only delete not edit so
// add edit functionality"). Posts could be deleted but never corrected —
// a typo or a wrong sport was permanent.
//
// SCOPE: text-only edits. Media replacement is deliberately NOT supported:
// swapping a photo would have to release the old media reference from the
// quota ledger and attach the new one, and getting that wrong would either
// leak quota or destroy an asset another page still renders. That is a
// separate change with its own ledger bookkeeping.
//
// The `profile_posts_owner_crud` RLS policy already allows the owner to
// update their own rows, and the explicit ownership check here makes the
// rule explicit at the route level too.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let payload: { body?: unknown; sport?: unknown; link_url?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const updates: Record<string, string | null> = {};

  if (payload.body !== undefined) {
    if (typeof payload.body !== 'string') {
      return NextResponse.json({ error: 'body must be a string.' }, { status: 400 });
    }
    const body = payload.body.trim();
    if (!body) {
      return NextResponse.json(
        { error: 'Post text cannot be empty. Delete the post instead.' },
        { status: 400 },
      );
    }
    if (body.length > MAX_BODY_LENGTH) {
      return NextResponse.json(
        { error: `Post text is too long (max ${MAX_BODY_LENGTH} characters).` },
        { status: 400 },
      );
    }
    updates.body = body;
  }

  if (payload.sport !== undefined) {
    const sport = payload.sport === null ? null : String(payload.sport).trim();
    if (sport && !ALLOWED_SPORTS.has(sport)) {
      return NextResponse.json({ error: 'Invalid sport.' }, { status: 400 });
    }
    updates.sport = sport || null;
  }

  if (payload.link_url !== undefined) {
    const link = payload.link_url === null ? null : String(payload.link_url).trim();
    if (link) {
      let parsed: URL | null = null;
      try {
        parsed = new URL(link);
      } catch {
        return NextResponse.json(
          { error: 'That does not look like a valid link.' },
          { status: 400 },
        );
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return NextResponse.json(
          { error: 'Links must start with http:// or https://' },
          { status: 400 },
        );
      }
    }
    // A link post stores the URL in `media_url` (see POST — "If link_url was
    // passed, prefer it as media_url"). Only editable when the post has no
    // uploaded media of its own, so an edit can never orphan a stored file.
    updates.media_url = link || null;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  // Ownership check — only the author may edit.
  const { data: post } = await supabaseAdmin
    .from('profile_posts')
    .select('id, user_id, deleted_at')
    .eq('id', id)
    .maybeSingle();

  if (!post || post.deleted_at) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (post.user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: updated, error } = await supabaseAdmin
    .from('profile_posts')
    .update(updates)
    .eq('id', id)
    .select('id, body, sport, media_url, media_thumb, target_type, target_id, created_at, updated_at')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log('[profile-posts PATCH]', { postId: id, userId, fields: Object.keys(updates) });

  return NextResponse.json({ success: true, post: updated });
}
