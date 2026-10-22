// src/app/api/profile-posts/[id]/restore/route.ts
//
// Restore a soft-deleted post within its media retention window.
//
// WHY THIS EXISTS
// Deleting a post releases its media reference immediately, which frees the
// quota right away. The Storage object is then kept for 30 days so the delete is
// RECOVERABLE — but without this endpoint "recoverable" is theoretical: the file
// sat on disk with no way to bring the post back, and the user who deleted by
// mistake had no path to their content. The retention window was protecting
// something nobody could retrieve.
//
// This endpoint closes that loop. It clears deleted_at and re-attaches the
// ledger reference, which makes the asset live again (the trigger clears
// retained_until).
//
// GUARANTEE: THE ALLOWANCE IS STILL HONOURED
// Restoring can push an account over its current allowance — the user may have
// used the freed capacity in the meantime. If that has happened the restore is
// REFUSED with a clear 413 rather than silently over-allocating.
//
// This is the safe behaviour for both sides:
//   • the user is not allowed to exceed what they paid for, and
//   • they are not allowed to lose content silently — the error tells them
//     exactly what to do (delete something else, or upgrade).
//
// Refusing a restore is reversible: the post stays soft-deleted and the media
// stays on disk until its window expires, so upgrading and retrying works.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { assetRefFromPublicUrl, attachAssetRef } from '@/lib/media-ledger';
import {
  checkMediaUpload,
  getMediaAllowance,
} from '@/lib/media-entitlements';
import { getMediaEntitlementForUser, pickBetterAllowance } from '@/lib/media-usage';

/**
 * POST /api/profile-posts/[id]/restore
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { data: post } = await supabaseAdmin
    .from('profile_posts')
    .select('id, user_id, media_url, deleted_at')
    .eq('id', id)
    .maybeSingle();

  if (!post) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (post.user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!post.deleted_at) {
    return NextResponse.json({ error: 'Post is not deleted' }, { status: 400 });
  }

  // Re-attach the media reference BEFORE un-deleting, so the post never
  // becomes visible while its media is unaccounted for.
  let mediaBytes = 0;
  const asset = assetRefFromPublicUrl(post.media_url, 'post-media');
  if (asset) {
    const { data: assetRow } = await supabaseAdmin
      .from('media_assets')
      .select('id, bytes, retained_until')
      .eq('bucket', asset.bucket)
      .eq('object_path', asset.objectPath)
      .maybeSingle();

    if (assetRow) {
      mediaBytes = Number(assetRow.bytes) || 0;

      // Restore is refused if it would push the account over its allowance.
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('tier, org_tier')
        .eq('user_id', userId)
        .maybeSingle();
      const tier = (profile?.tier as string) ?? 'free';
      const orgTier = (profile?.org_tier as string) ?? 'org_free';
      const { usage, allowance, negotiated } = await getMediaEntitlementForUser(
        userId,
        tier,
        pickBetterAllowance(getMediaAllowance(tier), getMediaAllowance(orgTier)),
      );

      if (!negotiated && mediaBytes > 0) {
        const decision = checkMediaUpload(
          allowance,
          {
            sizeBytes: mediaBytes,
            isVideo: /\.mp4|webm|mov|m4v$/i.test(asset.objectPath),
            durationSeconds: null,
          },
          usage,
        );
        if (!decision.allowed) {
          return NextResponse.json(
            {
              error: decision.message,
              code: decision.code,
              recoverable: true,
              hint: 'Your post and its media are still saved. Delete something else, or upgrade, then try again.',
            },
            { status: decision.code === 'video_not_allowed' ? 403 : 413 },
          );
        }
      }

      const attached = await attachAssetRef(asset, {
        refTable: 'profile_posts',
        refId: id,
      });
      // On failure the post is still restored below; the bucket-walk fallback
      // keeps usage correct and the asset becomes reapable again if it is
      // deleted a second time.
      if (!attached.ok) {
        console.warn('[profile-posts restore] ledger re-attach failed', { postId: id });
      }
    } else {
      // The ledger row is gone — the retention window expired and the reaper
      // ran. The Storage object may or may not still exist.
      console.warn('[profile-posts restore] no ledger row; media may be reaped', {
        postId: id,
      });
    }
  }

  const { error } = await supabaseAdmin
    .from('profile_posts')
    .update({ deleted_at: null })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, restoredMedia: Boolean(asset) });
}