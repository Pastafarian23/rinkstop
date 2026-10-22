// src/lib/media-usage.ts
//
// Server-side usage measurement for the unified media allowance
// (see src/lib/media-entitlements.ts for the policy).
//
// WHY THIS EXISTS
// An allowance that isn't measured isn't enforced. Before this, RinkStop had no
// way to know how much an account had stored, so no quota could be checked.
//
// HOW USAGE IS MEASURED — THE LEDGER, NOT THE BUCKET
//
// This module previously walked the Supabase Storage bucket prefix and summed
// `metadata.contentLength`. That was correct arithmetic but wrong policy: a
// bucket walk counts every byte ever uploaded, because nothing ever removed an
// object. DELETE /api/profile-posts/[id] only sets `profile_posts.deleted_at`,
// so a deleted post's video kept consuming the owner's allowance forever. The
// owner could delete a post and never recover the quota.
//
// The naive fix — delete the Storage object on post delete — breaks the
// opposite way: if the same object is referenced by another post, a profile
// cover, or a listing photo, deleting it breaks live content.
//
// So accounting is now driven by the `media_assets` / `media_asset_refs`
// ledger (migration 2026-10-23_media_asset_ledger.sql), which records which
// objects belong to an account and who still references each one:
//
//   • ref_count > 0                  → live, counts fully
//   • ref_count = 0, in grace window → soft-deleted but recoverable; still
//                                     counted during the grace period
//   • ref_count = 0, grace expired   → not counted, eligible for reaping
//
// The bucket walk below is retained as FALLBACK ONLY, for the window between
// deploying this code and completing the ledger backfill, and as a safety net
// if the ledger is ever empty for a user. It is never summed together with the
// ledger — double-counting the same bytes would overstate usage and block
// uploads the user is entitled to.
//
// SHARED ASSETS ARE COUNTED ONCE
// The same video can appear in a social post, a team page, and a player
// highlight. Because the ledger keys on (bucket, object_path) — one row per
// stored object regardless of how many rows reference it — a shared asset is
// counted exactly once. Adding a second reference to an existing asset changes
// ref_count, never the byte total. This is what prevents charging separately for
// the same video appearing in multiple parts of RinkStop.
//
// SCOPE — WHAT COUNTS TOWARD THE ALLOWANCE
// Four buckets are counted. Three of them are keyed by the owning Clerk user
// id directly:
//
//   • post-media/`<userId>`/…           social posts (photos + video)
//   • profile_covers/`<userId>`/…       profile cover images
//   • listing-photos/`<userId>`/…       club / team / rink listing photos
//
// The fourth is keyed by PLAYER id, not user id:
//
//   • player-media/`<playerId>`/…        player profile photos + highlights
//
// `player-media` cannot be walked with the user id: its path prefix is the
// player's UUID (`managed_profiles.profile_id`), so the user id prefix would
// never match and the bucket would silently contribute zero bytes. The owning
// user is instead resolved through three independent relationships, whose
// union is walked:
//
//   1. player_media.uploaded_by = userId        → player_media.player_id
//   2. managed_profiles.manager_user_id = userId (profile_type='player')
//                                                → managed_profiles.profile_id
//   3. players.user_id = userId                 → players.id
//
// (2) and (3) usually resolve to the same UUID, but not always — see the
// orphan-link note in `resolvePlayerPrefixes`.
//
// NOT counted, deliberately:
//   • player-documents, team-documents, rink-contracts — each has its own
//     document/contract caps; counting them here would double-charge.
//   • rink-maps — platform-seeded, not user uploads.

import { supabaseAdmin } from '@/lib/supabase';
import {
  getMediaAllowance,
  isNegotiatedCapacity,
  type MediaAllowance,
  type MediaUsageSnapshot,
} from './media-entitlements';

/** Buckets whose path prefix is the owning Clerk user id. */
const USER_KEYED_BUCKETS = ['post-media', 'profile_covers', 'listing-photos'] as const;

/** Bucket whose path prefix is a player UUID. */
const PLAYER_KEYED_BUCKET = 'player-media';

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
 * Resolve the set of player-id prefixes in `player-media` that belong to a
 * given user.
 *
 * Three sources, unioned, because no single one is complete:
 *   • `player_media.uploaded_by` — who actually pushed the bytes.
 *   • `managed_profiles.manager_user_id` — a parent/guardian who manages the
 *     player (the `profile_id` here is the same UUID used in the storage path).
 *   • `players.user_id` — a player who owns their own record.
 *
 * Note on a known orphan: one `managed_profiles` row has a `profile_id` that
 * resolves to no `players`/`profiles` row. That prefix is still walked — it is
 * a real storage prefix and its bytes are real — but it will not appear in
 * any listing query. That is a data-integrity issue tracked separately, not
 * an allowance bug.
 *
 * Fails soft: any lookup error yields an empty set for that source, which
 * under-counts rather than blocking uploads.
 */
async function resolvePlayerPrefixes(userId: string): Promise<string[]> {
  const prefixes = new Set<string>();

  const { data: media } = await supabaseAdmin
    .from('player_media')
    .select('player_id')
    .eq('uploaded_by', userId);
  for (const row of media || []) {
    if (row?.player_id) prefixes.add(row.player_id);
  }

  const { data: managed } = await supabaseAdmin
    .from('managed_profiles')
    .select('profile_id')
    .eq('manager_user_id', userId)
    .eq('profile_type', 'player');
  for (const row of managed || []) {
    if (row?.profile_id) prefixes.add(row.profile_id);
  }

  const { data: owned } = await supabaseAdmin
    .from('players')
    .select('id')
    .eq('user_id', userId);
  for (const row of owned || []) {
    if (row?.id) prefixes.add(row.id);
  }

  return Array.from(prefixes);
}

/**
 * Measure the unified media usage attributable to a user, resolved against
 * THAT user's tier allowance.
 *
 * Fails SOFT: a storage-list error counts as zero usage, which is permissive.
 * That is deliberate — a transient Storage failure must not block every upload
 * sitewide. The hard cost backstop remains the bucket's own file_size_limit,
 * enforced by Supabase itself.
 */
export interface MediaEntitlement {
  usage: MediaUsageSnapshot;
  allowance: MediaAllowance;
  negotiated: boolean;
}

/**
 * Pick the more generous of two allowances (personal tier vs org tier).
 *
 * A person can hold a personal Hockey Passport AND own an organization.
 * Their media is a single physical pool, so the entitlement must be the BEST
 * of the two — never the sum (that would double-count the same bytes).
 *
 * Comparison is by rank within the respective ladder; ties go to the personal
 * allowance (stricter), and a negotiated allowance always wins because
 * negotiated means "not machine-enforced".
 */
export function pickBetterAllowance(
  personal: MediaAllowance,
  org: MediaAllowance,
): MediaAllowance {
  if (isNegotiatedCapacity(org)) return org;
  if (isNegotiatedCapacity(personal)) return personal;
  if (org.maxTotalBytes !== personal.maxTotalBytes) {
    return org.maxTotalBytes > personal.maxTotalBytes ? org : personal;
  }
  if (org.maxAssetCount !== personal.maxAssetCount) {
    return org.maxAssetCount > personal.maxAssetCount ? org : personal;
  }
  // Same size — prefer the one that permits video and a longer duration.
  if (org.videoAllowed && !personal.videoAllowed) return org;
  if (org.maxVideoSeconds && personal.maxVideoSeconds) {
    return org.maxVideoSeconds > personal.maxVideoSeconds ? org : personal;
  }
  return personal;
}

/**
 * Measure usage from the ledger.
 *
 * Reads `media_counted_assets`, which is the single definition of "counts
 * against the allowance" (live references only, plus anything still inside its
 * post-deletion grace window). One row per stored object, so a shared asset
 * appears once no matter how many posts/rows reference it.
 *
 * Returns null when the ledger has no rows for this owner, which tells the
 * caller to fall back to a bucket walk rather than reporting zero usage and
 * letting the user exceed their allowance without noticing.
 */
async function measureFromLedger(userId: string): Promise<MediaUsageSnapshot | null> {
  const { data, error } = await supabaseAdmin
    .from('media_counted_assets')
    .select('bytes')
    .eq('owner_user_id', userId);

  if (error) return null;

  let totalBytes = 0;
  let assetCount = 0;
  for (const row of data || []) {
    totalBytes += Number(row?.bytes ?? 0) || 0;
    assetCount += 1;
  }

  // Zero rows is indistinguishable from "ledger not backfilled for this user"
  // at the storage level, so treat an empty result as "no data" and let the
  // caller fall back. This is the safe direction: the fallback measures the
  // same objects, so the worst case is a redundant walk.
  if (assetCount === 0) return null;

  return { totalBytes, assetCount };
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
  allowanceOverride?: MediaAllowance,
): Promise<MediaEntitlement> {
  const allowance = allowanceOverride ?? getMediaAllowance(tier);
  if (isNegotiatedCapacity(allowance)) {
    return { usage: { totalBytes: 0, assetCount: 0 }, allowance, negotiated: true };
  }

  // Primary path: the ledger. Falls back to a bucket walk when the ledger has
  // nothing for this user (pre-backfill, or a user created after the backfill
  // whose first upload has not been indexed yet).
  let usage = await measureFromLedger(userId);

  if (!usage) {
    let totalBytes = 0;
    let assetCount = 0;

    for (const bucket of USER_KEYED_BUCKETS) {
      const part = await measureBucket(bucket, `${userId}/`);
      totalBytes += part.totalBytes;
      assetCount += part.assetCount;
    }

    const playerPrefixes = await resolvePlayerPrefixes(userId);
    for (const playerId of playerPrefixes) {
      const part = await measureBucket(PLAYER_KEYED_BUCKET, `${playerId}/`);
      totalBytes += part.totalBytes;
      assetCount += part.assetCount;
    }

    usage = { totalBytes, assetCount };
  }

  return { usage, allowance, negotiated: false };
}

/**
 * Public-facing allowance summary for the signed-in user, used by settings and
 * upgrade prompts. Returns the provisional flag so UI can avoid stating exact
 * numbers while they are unapproved.
 */
export async function describeMyMediaAllowance(
  userId: string,
  tier: string | null | undefined,
  orgTier?: string | null,
) {
  const personalAllowance = getMediaAllowance(tier);
  const allowance = orgTier
    ? pickBetterAllowance(personalAllowance, getMediaAllowance(orgTier))
    : personalAllowance;
  const { usage, negotiated } = await getMediaEntitlementForUser(userId, tier, allowance);
  if (negotiated) {
    return {
      negotiated: true,
      provisional: false,
      label: 'Negotiated capacity',
      used: null,
      allowance: null,
    };
  }
  return {
    negotiated: false,
    provisional: allowance.provisional,
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
