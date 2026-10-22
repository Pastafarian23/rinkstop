import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { assetRefFromPublicUrl, releaseAssetRef } from '@/lib/media-ledger';

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
