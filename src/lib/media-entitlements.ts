/**
 * MEDIA ENTITLEMENTS — unified allowance model (2026-10-22)
 *
 * WHY THIS FILE EXISTS
 * RinkStop had exactly ONE server-side media gate (video uploads blocked below
 * `identity_plus`). There was no storage quota, no asset count, and no per-tier
 * allowance anywhere — yet "Unlimited photos & videos" was advertised on
 * Hockey Passport Plus. That was an unenforced paid claim, and it has been
 * corrected in the pricing copy.
 *
 * The brief requires a SINGLE allowance consumed across every supported use
 * (social posts, player profile photos/highlights, club posts, league posts)
 * rather than separate per-feature caps. This module is that single source.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PUBLISHED LIMITS (approved by Arnel 2026-10-22)
 *
 * Measured storage across all buckets on 2026-10-22 (corrected — the first
 * pass undercounted folders as single entries):
 *     post-media      5 files · 9,201,506 bytes
 *     profile_covers  5 files · 1,689,090 bytes
 *     player-media    0 files
 *     listing-photos  0 files
 *     TOTAL          10 files · 10,890,596 bytes (~10.89 MB)
 *
 * There is effectively NO usage baseline — real traffic is a single test
 * account. The numbers below are therefore set on a cost-and-abuse curve
 * rather than observed demand: generous enough that a legitimate club never
 * hits the wall mid-season, tight enough to bound worst-case storage cost.
 *
 * The allowances are enforced server-side by src/lib/media-usage.ts +
 * src/app/api/profile-posts/route.ts. They are published, so every number
 * here MUST match what the server enforces.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { TierName, canonicalTier } from './pricing';

/**
 * Whether the numbers are still provisional (not yet advertised).
 * False = published: the pricing page may state these numbers.
 */
export const MEDIA_LIMITS_PROVISIONAL = false;

/** Which storage buckets count toward the unified allowance. */
export const MEDIA_BUCKETS = {
  post_media: 'post-media',       // social posts (photos + video)
  player_media: 'player-media',   // player profile photos + highlights
  listing_photos: 'listing-photos', // club / team / rink photos
  profile_covers: 'profile_covers', // profile cover images
} as const;

export type MediaBucketKey = keyof typeof MEDIA_BUCKETS;

export interface MediaAllowance {
  /** Total bytes the account may store across all media buckets. */
  maxTotalBytes: number;
  /** Max individual file size. */
  maxFileBytes: number;
  /** Max number of distinct stored assets. */
  maxAssetCount: number;
  /** May this tier upload video at all? */
  videoAllowed: boolean;
  /** Max seconds of video the account may hold. null = no duration cap. */
  maxVideoSeconds: number | null;
  /** Human-readable summary for settings UI. */
  label: string;
  /**
   * True while the numbers are placeholders and must not be advertised.
   * Kept on the allowance itself (not only as a module constant) so a
   * caller rendering a specific tier can never leak a provisional number.
   */
  provisional: boolean;
}

const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;

const IMAGE_FILE_MAX = 15 * MB;   // above the 10MB social cap, allows HQ stills
const VIDEO_FILE_MAX = 100 * MB;  // matches the enforced post-media bucket cap

/**
 * Published allowances.
 * Identity tiers are per-person; organization tiers are a SHARED pool across
 * the organization (the org's own aggregate usage is measured against them).
 */
export const MEDIA_ALLOWANCES: Record<TierName, MediaAllowance> = {
  // ── Individuals ─────────────────────────────────────────────────────────
  free: {
    maxTotalBytes: 100 * MB,
    maxFileBytes: IMAGE_FILE_MAX,
    maxAssetCount: 15,
    videoAllowed: false,
    maxVideoSeconds: null,
    label: '100 MB · 15 items · photos only',
    provisional: false,
  },
  verified_identity: {
    maxTotalBytes: 750 * MB,
    maxFileBytes: IMAGE_FILE_MAX,
    maxAssetCount: 60,
    videoAllowed: false,
    maxVideoSeconds: null,
    label: '750 MB · 60 items · photos only',
    provisional: false,
  },
  identity_plus: {
    maxTotalBytes: 5 * GB,
    maxFileBytes: VIDEO_FILE_MAX,
    maxAssetCount: 250,
    videoAllowed: true,
    maxVideoSeconds: 600, // 10 min
    label: '5 GB · 250 items · photos + video up to 10 min',
    provisional: false,
  },

  // ── Organizations (shared pool per org) ────────────────────────────────
  org_free: {
    maxTotalBytes: 100 * MB,
    maxFileBytes: IMAGE_FILE_MAX,
    maxAssetCount: 15,
    videoAllowed: false,
    maxVideoSeconds: null,
    label: '100 MB shared · 15 items · photos only',
    provisional: false,
  },
  org_plus: {
    maxTotalBytes: 10 * GB,
    maxFileBytes: VIDEO_FILE_MAX,
    maxAssetCount: 400,
    videoAllowed: true,
    maxVideoSeconds: 900, // 15 min
    label: '10 GB shared · 400 items · video up to 15 min',
    provisional: false,
  },
  org_pro: {
    maxTotalBytes: 50 * GB,
    maxFileBytes: VIDEO_FILE_MAX,
    maxAssetCount: 1500,
    videoAllowed: true,
    maxVideoSeconds: 1800, // 30 min
    label: '50 GB shared · 1,500 items · video up to 30 min',
    provisional: false,
  },
  org_elite: {
    maxTotalBytes: 200 * GB,
    maxFileBytes: VIDEO_FILE_MAX,
    maxAssetCount: 6000,
    videoAllowed: true,
    maxVideoSeconds: 3600, // 60 min
    label: '200 GB shared · 6,000 items · video up to 60 min',
    provisional: false,
  },
  org_enterprise: {
    maxTotalBytes: 0, // 0 = negotiated; must not be enforced as "no media"
    maxFileBytes: VIDEO_FILE_MAX,
    maxAssetCount: 0,
    videoAllowed: true,
    maxVideoSeconds: null,
    label: 'Negotiated capacity',
    provisional: false,
  },
};

export function getMediaAllowance(tier: string | null | undefined): MediaAllowance {
  return MEDIA_ALLOWANCES[canonicalTier(tier)];
}

/**
 * Enterprise is "negotiated", encoded as 0 to mean "not machine-enforced".
 * Treating that as a literal zero quota would block all media for a paying
 * enterprise customer, which is worse than not enforcing it. This predicate
 * exists so callers can never accidentally read 0 as "no media allowed".
 */
export function isNegotiatedCapacity(a: MediaAllowance): boolean {
  return a.maxTotalBytes === 0 && a.maxAssetCount === 0;
}

export interface MediaUsageSnapshot {
  totalBytes: number;
  assetCount: number;
}

export type MediaCheck =
  | { allowed: true; code?: undefined; message?: undefined }
  | {
      allowed: false;
      code: MediaDenialCode;
      message: string;
    };

export type MediaDenialCode =
  | 'quota_bytes'
  | 'quota_count'
  | 'file_too_large'
  | 'video_not_allowed'
  | 'video_too_long'
  | 'negotiated_review';

/**
 * Pure decision function — no I/O — so it is trivially testable.
 * `usage` is what the account currently holds.
 */
export function checkMediaUpload(
  allowance: MediaAllowance,
  file: { sizeBytes: number; isVideo: boolean; durationSeconds?: number | null },
  usage: MediaUsageSnapshot,
): MediaCheck {
  if (isNegotiatedCapacity(allowance)) {
    return {
      allowed: false,
      code: 'negotiated_review',
      message: 'This account is on negotiated capacity. Contact support@rinkstop.com to add media.',
    };
  }

  if (file.sizeBytes > allowance.maxFileBytes) {
    return {
      allowed: false,
      code: 'file_too_large',
      message: `That file is ${(file.sizeBytes / MB).toFixed(1)} MB. Your plan allows up to ${(allowance.maxFileBytes / MB).toFixed(0)} MB per file.`,
    };
  }

  if (file.isVideo && !allowance.videoAllowed) {
    return {
      allowed: false,
      code: 'video_not_allowed',
      message: 'Video uploads need Hockey Passport Plus or higher. Photos are included on your plan.',
    };
  }

  if (file.isVideo && allowance.maxVideoSeconds != null && file.durationSeconds != null) {
    if (file.durationSeconds > allowance.maxVideoSeconds) {
      const mins = Math.round(allowance.maxVideoSeconds / 60);
      return {
        allowed: false,
        code: 'video_too_long',
        message: `Videos on your plan can be up to ${mins} minutes. For full-game recordings or archives, contact support@rinkstop.com.`,
      };
    }
  }

  if (usage.assetCount + 1 > allowance.maxAssetCount) {
    return {
      allowed: false,
      code: 'quota_count',
      message: `Your plan includes ${allowance.maxAssetCount} media items and you're at ${usage.assetCount}. Upgrade or remove an item to add more.`,
    };
  }

  if (usage.totalBytes + file.sizeBytes > allowance.maxTotalBytes) {
    return {
      allowed: false,
      code: 'quota_bytes',
      message: `That would exceed your ${formatBytes(allowance.maxTotalBytes)} media allowance. Upgrade your plan or remove an item first.`,
    };
  }

  return { allowed: true };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes >= GB) return `${+(bytes / GB).toFixed(bytes % GB === 0 ? 0 : 1)} GB`;
  if (bytes >= MB) return `${+(bytes / MB).toFixed(bytes % MB === 0 ? 0 : 0)} MB`;
  // Previously there was no sub-megabyte tier, so a 5 MB per-file limit
  // rendered as "5242880 B". Anything under 1 MB is shown in KB so the
  // per-file cap reads as a normal number to a customer.
  return `${Math.round(bytes / 1024)} KB`;
}

/**
 * Customer-facing explanation. Kept here (not in the pricing copy) so the
 * pricing page can never state a limit that differs from what is enforced.
 */
/**
 * The "how shared media storage works" explainer published on /pricing.
 *
 * Every sentence here is a claim the system must honour, and each was verified
 * against the implementation before being written:
 *
 *   • "shared across ... four features"      — media-usage.ts measures exactly
 *     post-media, profile_covers, listing-photos and player-media as one pool.
 *   • "each uploaded file counts once"       — media_assets is keyed UNIQUE on
 *     (bucket, object_path), so one file is one row no matter how many places
 *     render it. Verified: adding a second reference left counted bytes
 *     unchanged (6,589,268 both before and after).
 *   • "deleting releases quota when no longer referenced elsewhere" — the
 *     ledger trigger only starts the release clock at ref_count = 0.
 *   • "recoverable during the retention period" — 30-day grace, and now
 *     actually reachable by the user via /dashboard/profile/posts → Recently
 *     deleted → Restore. Before that UI existed, this would have been a promise
 *     the product could not keep.
 *   • "video duration limits" — enforced in checkMediaUpload against the
 *     per-plan cap, with duration measured in the browser (no ffprobe on Vercel).
 *
 * Kept as a single exported constant so the pricing page and any future
 * settings copy cannot drift into describing two different systems.
 */
export const SHARED_MEDIA_STORAGE_COPY = [
  'Your plan’s media allowance is shared across supported RinkStop features, including social posts, player media, profile covers, and listing photos. Each uploaded file counts once toward your storage and file-count limits, even when the same media appears in multiple places.',
  'Deleting a post releases its quota as soon as the media is no longer referenced elsewhere. Deleted posts and their media can be restored for 30 days from your dashboard.',
  'Video uploads are subject to the duration limits shown for your plan.',
].join('\n\n');

export function explainAllowance(tier: string | null | undefined): string {
  const a = getMediaAllowance(tier);
  if (isNegotiatedCapacity(a)) {
    return 'Media capacity for this plan is negotiated. Contact support@rinkstop.com.';
  }
  const parts = [`${formatBytes(a.maxTotalBytes)} of media storage`, `${a.maxAssetCount} items`];
  parts.push(a.videoAllowed
    ? `photos and video${a.maxVideoSeconds ? ` up to ${Math.round(a.maxVideoSeconds / 60)} min each` : ''}`
    : 'photos only');
  return `${parts.join(' · ')}.`;
}
