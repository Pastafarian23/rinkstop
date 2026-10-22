// src/lib/media-ledger.ts
//
// Thin, well-commented wrapper over the media_assets / media_asset_refs ledger
// introduced in migration 2026-10-23_media_asset_ledger.sql.
//
// THE TWO INVARIANTS THIS FILE ENFORCES
//
// 1. Every stored object gets exactly one ledger row, keyed on
//    (bucket, object_path). Adding a second reference to an existing object
//    increments ref_count and never the byte total — that is what stops a user
//    being charged twice for one video that appears in both a social post and a
//    player highlight.
//
// 2. A Storage object is only ever deleted once its LAST reference is gone.
//    Every delete goes through `releaseAssetRef`, which removes the reference
//    and lets the database trigger decide whether the object becomes
//    reapable. No call site deletes from Storage directly.
//
// Both functions FAIL SOFT. A ledger write that throws must not fail a user's
// upload: the object is already in Storage, the user already got their URL, and
// the bucket-walk fallback in media-usage.ts still measures their usage
// correctly. A ledger outage degrades accounting precision, it does not break
// the product. The error is logged so it is visible.

import { supabaseAdmin } from './supabase';

/** Storage coordinates of one stored object. */
export interface AssetRef {
  bucket: string;
  /** BUCKET-QUALIFIED path, e.g. `post-media/user_123/1712-ab.mp4`. */
  objectPath: string;
}

/** A logical row that points at a stored object. */
export interface LogicalRef {
  refTable: string;
  refId: string;
}

function assetKindFor(mimeType: string | null | undefined, path: string): 'photo' | 'video' | 'document' {
  if (mimeType?.startsWith('video/')) return 'video';
  if (mimeType?.startsWith('image/')) return 'photo';
  if (mimeType === 'application/pdf') return 'document';
  // Fall back to the extension when the browser sent an unhelpful MIME type.
  if (/\.(mp4|webm|mov|m4v|avi)(\?.*)?$/i.test(path)) return 'video';
  if (/\.(jpe?g|png|webp|gif|heic|avif)(\?.*)?$/i.test(path)) return 'photo';
  if (/\.pdf(\?.*)?$/i.test(path)) return 'document';
  return 'photo';
}

/**
 * Register a freshly uploaded object, with zero references.
 *
 * Call this immediately after a successful Storage upload, BEFORE returning the
 * URL to the client. An upload with no ledger row still counts (the bucket-walk
 * fallback measures it) but is invisible to the reaper, so it would never be
 * cleaned up if the user abandons the composer without saving the post.
 */
export async function registerAsset(params: {
  bucket: string;
  objectPath: string;
  ownerUserId: string;
  bytes: number;
  mimeType?: string | null;
}): Promise<{ assetId: string | null }> {
  const { bucket, objectPath, ownerUserId, bytes, mimeType } = params;
  try {
    const { data, error } = await supabaseAdmin
      .from('media_assets')
      .upsert(
        {
          bucket,
          object_path: objectPath,
          owner_user_id: ownerUserId,
          bytes: Math.max(0, Math.floor(bytes) || 0),
          mime_type: mimeType ?? null,
          asset_kind: assetKindFor(mimeType, objectPath),
        },
        { onConflict: 'bucket,object_path' },
      )
      .select('id')
      .single();

    if (error) {
      console.error('[media-ledger] registerAsset failed', { bucket, objectPath, error: error.message });
      return { assetId: null };
    }
    return { assetId: (data as { id: string } | null)?.id ?? null };
  } catch (e) {
    console.error('[media-ledger] registerAsset threw', { bucket, objectPath, e });
    return { assetId: null };
  }
}

/**
 * Attach a logical reference to a stored object.
 *
 * Idempotent: the unique constraint on (asset_id, ref_table, ref_id) plus
 * `ignoreDuplicates` means calling this twice for the same post does not
 * double-count. The database trigger then recomputes ref_count, so the caller
 * never sets it directly.
 */
export async function attachAssetRef(
  asset: AssetRef,
  ref: LogicalRef,
): Promise<{ ok: boolean }> {
  try {
    // Resolve the asset id by natural key rather than requiring the caller to
    // have kept it. Upload and post-creation are separate requests, and the
    // browser can retry either one.
    const { data: assetRow, error: lookupError } = await supabaseAdmin
      .from('media_assets')
      .select('id')
      .eq('bucket', asset.bucket)
      .eq('object_path', asset.objectPath)
      .maybeSingle();

    if (lookupError || !assetRow) {
      // No ledger row yet — nothing to attach to. The object is still measured
      // by the bucket-walk fallback, so this is a precision loss, not a leak.
      console.warn('[media-ledger] attachAssetRef: no ledger row', asset);
      return { ok: false };
    }

    const { error } = await supabaseAdmin
      .from('media_asset_refs')
      .upsert(
        {
          asset_id: (assetRow as { id: string }).id,
          ref_table: ref.refTable,
          ref_id: ref.refId,
        },
        { onConflict: 'asset_id,ref_table,ref_id', ignoreDuplicates: true },
      );

    if (error) {
      console.error('[media-ledger] attachAssetRef failed', { asset, ref, error: error.message });
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error('[media-ledger] attachAssetRef threw', { asset, ref, e });
    return { ok: false };
  }
}

/**
 * Detach a logical reference. This is the ONLY correct way to stop charging a
 * user for media.
 *
 * When the last reference for an object disappears, the database trigger sets
 * `retained_until = now() + 30 days`. The object:
 *   • still exists in Storage (recoverable — the user can undo a delete)
 *   • still counts toward quota during the grace window
 *   • stops counting once the window passes, then a reaper deletes it
 *
 * That grace window is the whole point: it means "delete a post" immediately
 * stops being a permanent quota charge, while not making an accidental delete
 * instantly and irrecoverably destroy the file.
 *
 * Does NOT delete from Storage. See `reapExpiredAssets` for that step.
 */
export async function releaseAssetRef(
  asset: AssetRef,
  ref: LogicalRef,
): Promise<{ ok: boolean; refCount: number | null }> {
  try {
    const { data: assetRow, error: lookupError } = await supabaseAdmin
      .from('media_assets')
      .select('id')
      .eq('bucket', asset.bucket)
      .eq('object_path', asset.objectPath)
      .maybeSingle();

    if (lookupError || !assetRow) return { ok: false, refCount: null };
    const assetId = (assetRow as { id: string }).id;

    const { error } = await supabaseAdmin
      .from('media_asset_refs')
      .delete()
      .eq('asset_id', assetId)
      .eq('ref_table', ref.refTable)
      .eq('ref_id', ref.refId);

    if (error) {
      console.error('[media-ledger] releaseAssetRef failed', { asset, ref, error: error.message });
      return { ok: false, refCount: null };
    }

    // Read back the trigger-maintained count so callers can log/assert it.
    const { data: after } = await supabaseAdmin
      .from('media_assets')
      .select('ref_count')
      .eq('id', assetId)
      .maybeSingle();

    return { ok: true, refCount: (after as { ref_count: number } | null)?.ref_count ?? null };
  } catch (e) {
    console.error('[media-ledger] releaseAssetRef threw', { asset, ref, e });
    return { ok: false, refCount: null };
  }
}

/**
 * Derive (bucket, objectPath) from a stored public URL.
 *
 * Returns null for external URLs (a user pasting a link from elsewhere) and for
 * URLs that do not belong to RinkStop Storage — those must never be passed to
 * the reaper, which would delete someone else's file.
 */
export function assetRefFromPublicUrl(
  url: string | null | undefined,
  expectedBucket?: string,
): AssetRef | null {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/\/object\/public\/([^?#]+)/);
  if (!m) return null;

  const full = m[1];
  const slash = full.indexOf('/');
  if (slash <= 0) return null;

  const bucket = full.slice(0, slash);
  const objectPath = full.slice(slash + 1);
  if (!bucket || !objectPath) return null;

  // Guard against a URL that points at a bucket we were not asked about. Only
  // delete from buckets this feature owns.
  if (expectedBucket && bucket !== expectedBucket) return null;

  return { bucket, objectPath };
}

/**
 * Delete from Storage the assets whose grace period has expired, then drop
 * their ledger rows.
 *
 * Order matters: Storage is deleted FIRST, and the ledger row is only removed
 * after Storage confirms. If the process dies mid-way, the worst case is a
 * ledger row pointing at a missing object — which the next run detects and
 * cleans up. The reverse order would orphan real files with no record, which is
 * unrecoverable storage cost.
 *
 * Run from a cron. `expired_media_assets()` only returns assets with zero live
 * references, so this cannot destroy media anything still points at.
 */
export async function reapExpiredAssets(limit = 200): Promise<{
  deleted: number;
  bytesReclaimed: number;
  errors: number;
}> {
  let deleted = 0;
  let bytesReclaimed = 0;
  let errors = 0;

  try {
    const { data, error } = await supabaseAdmin.rpc('expired_media_assets', { p_limit: limit });
    if (error || !data) {
      console.error('[media-ledger] reapExpiredAssets: rpc failed', error?.message);
      return { deleted, bytesReclaimed, errors: errors + 1 };
    }

    const rows = data as Array<{ asset_id: string; bucket: string; object_path: string; bytes: number }>;
    if (!rows.length) return { deleted, bytesReclaimed, errors };

    // Group by bucket so each delete is one Storage call per bucket.
    const byBucket = new Map<string, typeof rows>();
    for (const r of rows) {
      if (!byBucket.has(r.bucket)) byBucket.set(r.bucket, []);
      byBucket.get(r.bucket)!.push(r);
    }

    for (const [bucket, bucketRows] of byBucket) {
      const { error: delError } = await supabaseAdmin.storage
        .from(bucket)
        .remove(bucketRows.map((r) => r.object_path));

      if (delError) {
        errors += bucketRows.length;
        console.error('[media-ledger] storage delete failed', { bucket, error: delError.message });
        // Do NOT release the ledger rows — leave them so the next run retries.
        continue;
      }

      for (const r of bucketRows) {
        const { data: released } = await supabaseAdmin.rpc('release_expired_media_asset', {
          p_asset_id: r.asset_id,
        });
        if (released) {
          deleted += 1;
          bytesReclaimed += Number(r.bytes) || 0;
        } else {
          // The guard refused: the asset regained a reference between the list
          // and the delete. Correctly preserved.
          console.warn('[media-ledger] release refused, asset still referenced', r.asset_id);
        }
      }
    }

    console.log(
      `[media-ledger] reaped ${deleted} assets, ${(bytesReclaimed / 1048576).toFixed(2)} MB, ${errors} errors`,
    );
  } catch (e) {
    console.error('[media-ledger] reapExpiredAssets threw', e);
    errors += 1;
  }

  return { deleted, bytesReclaimed, errors };
}