// src/lib/media-usage.ts
//
// Server-side usage measurement for the unified media allowance
// (see src/lib/media-entitlements.ts for the policy).
//
// WHY THIS EXISTS
// An allowance that isn't measured isn't enforced. Before this, RinkStop had no
// way to know how much an account had stored, so no quota could be checked.
//
// SCOPE — IMPORTANT AND DELIBERATE
// Today this counts POSTS-attributed media only:
//   • post-media/`<userId>`/…            (social posts)
//   • player-media/`<userId>`/…          (player profile photos + highlights)
// Those are the paths that already embed the owning Clerk user id, so usage can
// be attributed server-side without a schema change.
//
// NOT yet counted:
//   • listing-photos, profile_covers — keyed by team/rink/profile id, not user.
//     Wiring those requires an ownership column on team_workspaces. Tracked as
//     follow-up; org allowances are therefore currently UNDER-counted.
//
// This is stated plainly rather than hidden: the allowance is real and
// enforced, but incomplete for org-owned media until ownership is recorded.

import { supabaseAdmin } from '@/lib/supabase';
import {
  getMediaAllowance,
  isNegotiatedCapacity,
  type MediaAllowance,
  type MediaUsageSnapshot,
} from './media-entitlements';

const MEDIA_BUCKETS = ['post-media', 'player-media'] as const;

/**
 * Size of a stored object, in bytes.
 *
 * IMPORTANT: the Supabase Storage list API does NOT expose a top-level `size`
 * field. The byte count lives at `metadata.contentLength`, and folder markers
 * have no metadata at all. Getting this wrong silently counts every object as
 * 0 bytes, which would make the entire byte quota unenforced while still
 * appearing to work. Verified against the live API 2026-10-22:
 *   entry keys = name, version, id, updated_at, created_at,
 *                last_accessed_at, metadata, archived_at,
 *                is_delete_marker, is_versioned
 */
function objectSize(entry: {
  metadata?: { contentLength?: string | number } | null;
}): number {
  const raw = entry.metadata?.contentLength;
  if (raw == null) return 0;
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** True when the entry is a folder marker rather than a real object. */
function isFolderEntry(entry: { metadata?: unknown }): boolean {
  return entry.metadata == null;
}

/** Recursively sum a bucket subtree. Depth-capped to bound worst-case cost. */
async function measureBucket(bucket: string, prefix: string, depth = 0): Promise<MediaUsageSnapshot> {
  if (depth > 6) return { totalBytes: 0, assetCount: 0 };

  const { data, error } = await supabaseAdmin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !data) return { totalBytes: 0, assetCount: 0 };

  let totalBytes = 0;
  let assetCount = 0;
  for (const entry of data) {
    if (isFolderEntry(entry)) {
      const child = await measureBucket(bucket, `${prefix}${entry.name}/`, depth + 1);
      totalBytes += child.totalBytes;
      assetCount += child.assetCount;
    } else {
      totalBytes += objectSize(entry);
      assetCount += 1;
    }
  }
  return { totalBytes, assetCount };
}

/**
 * Measure the unified media usage attributable to a user, resolved against
 * THAT user's tier allowance.
 *
 * Fails SOFT: a storage-list error counts as zero usage, which is permissive.
 * That is deliberate — a transient Storage failure must not block every upload
 * sitewide. The hard cost backstop remains the bucket's own 100 MB
 * file_size_limit, enforced by Supabase itself.
 */
export interface MediaEntitlement {
  usage: MediaUsageSnapshot;
  allowance: MediaAllowance;
  negotiated: boolean;
}

/**
 * Resolve a user's tier, then measure their usage against THAT tier's
 * allowance.
 *
 * Explicit return type (not inferred): inference produced a union whose
 * `allowance` member widened, which defeated discriminated-union narrowing on
 * the caller's `checkMediaUpload` result.
 */
export async function getMediaEntitlementForUser(
  userId: string,
  tier: string | null | undefined,
): Promise<MediaEntitlement> {
  const allowance = getMediaAllowance(tier);
  if (isNegotiatedCapacity(allowance)) {
    return { usage: { totalBytes: 0, assetCount: 0 }, allowance, negotiated: true };
  }

  let totalBytes = 0;
  let assetCount = 0;
  for (const bucket of MEDIA_BUCKETS) {
    const part = await measureBucket(bucket, `${userId}/`);
    totalBytes += part.totalBytes;
    assetCount += part.assetCount;
  }

  return { usage: { totalBytes, assetCount }, allowance, negotiated: false };
}

/**
 * Public-facing allowance summary for the signed-in user, used by settings and
 * upgrade prompts. Returns the provisional flag so UI can avoid stating exact
 * numbers while they are unapproved.
 */
export async function describeMyMediaAllowance(userId: string, tier: string | null | undefined) {
  const { usage, allowance, negotiated } = await getMediaEntitlementForUser(userId, tier);
  if (negotiated) {
    return { negotiated: true, label: 'Negotiated capacity', used: null, allowance: null };
  }
  return {
    negotiated: false,
    label: allowance.label,
    used: usage,
    allowance: {
      totalBytes: allowance.maxTotalBytes,
      assetCount: allowance.maxAssetCount,
      videoAllowed: allowance.videoAllowed,
      maxVideoSeconds: allowance.maxVideoSeconds,
    },
  };
}