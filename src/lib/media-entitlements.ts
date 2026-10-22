/**
 * MEDIA ENTITLEMENTS — unified allowance model (2026-10-22)
 *
 * WHY THIS FILE EXISTS
 * RinkStop had exactly ONE server-side media gate (video uploads blocked below
 * `identity_plus`). There was no storage quota, no asset count, and no per-tier
 * allowance anywhere — yet "Unlimited photos & videos" is advertised on
 * Hockey Passport Plus. That is an unenforced paid claim.
 *
 * The brief requires a SINGLE allowance consumed across every supported use
 * (social posts, player profile photos/highlights, club posts, league posts)
 * rather than separate per-feature caps. This module is that single source.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️  PROVISIONAL DEFAULTS — NOT YET PUBLICLY ADVERTISED
 *
 * Measured storage across all buckets on 2026-10-22 (corrected — the first
 * pass undercounted folders as single entries):
 *     post-media  5 files · 8.78 MB
 *     player-media 0 · listing-photos 0 · profile-covers 2 · rink-maps 1
 *     TOTAL ~8.8 MB
 *
 * There is effectively NO usage baseline. Every number below is a placeholder
 * chosen to be generous enough not to block real users and tight enough to
 * bound worst-case cost. They are NOT derived from observed demand and must
 * not be published on the pricing page until they have been reviewed against
 * real usage and approved by Arnel.
 *
 * To make these real: set values here, then (1) test against real uploads,
 * (2) confirm the cost maths in the pricing cost map, (3) flip
 * `MEDIA_LIMITS_PROVISIONAL` to false to unlock advertising them.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { TierName } from './pricing';

/** Gate advertising of the numbers until Arnel approves them. */
export const MEDIA_LIMITS_PROVISIONAL = true;

/** Which storage buckets count toward the unified allowance. */
export const MEDIA_BUCKETS = {
  post_media: 'post-media',       // social posts (photos + video)
  player_media: 'player-media',   // player profile photos + highlights
  listing_photos: 'listing-photos', // club / team / rink photos
  profile_covers: 'profile-covers', // profile cover images
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
}

const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;

const IMAGE_FILE_MAX = 15 * MB;   // above the 10MB social cap, allows HQ stills
const VIDEO_FILE_MAX = 100 * MB;  // matches the enforced post-media bucket cap

/**
 * Provisional allowances. Identity tiers are per-person; organization and
 * business tiers are SHARED across the org (see note on enforcement below).
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
  },
  verified_identity: {
    maxTotalBytes: 750 * MB,
    maxFileBytes: IMAGE_FILE_MAX,
    maxAssetCount: 60,
    videoAllowed: false,
    maxVideoSeconds: null,
    label: '750 MB · 60 items · photos only',
  },
  identity_plus: {
    maxTotalBytes: 5 * GB,
    maxFileBytes: VIDEO_FILE_MAX,
    maxAssetCount: 250,
    videoAllowed: true,
    maxVideoSeconds: 600, // 10 min
    label: '5 GB · 250 items · photos + video up to 10 min',
  },

  // ── Organizations / business (shared pool per org) ─────────────────────
  club_starter: {
    maxTotalBytes: 10 * GB,
    maxFileBytes: VIDEO_FILE_MAX,
    maxAssetCount: 400,
    videoAllowed: true,
    maxVideoSeconds: 900,
    label: '10 GB shared · 400 items · video up to 15 min',
  },
  club_pro: {
    maxTotalBytes: 50 * GB,
    maxFileBytes: VIDEO_FILE_MAX,
    maxAssetCount: 1500,
    videoAllowed: true,
    maxVideoSeconds: 1800,
    label: '50 GB shared · 1,500 items · video up to 30 min',
  },
  club_elite: {
    maxTotalBytes: 200 * GB,
    maxFileBytes: VIDEO_FILE_MAX,
    maxAssetCount: 6000,
    videoAllowed: true,
    maxVideoSeconds: 3600,
    label: '200 GB shared · 6,000 items · video up to 60 min',
  },
  league: {
    maxTotalBytes: 500 * GB,
    maxFileBytes: VIDEO_FILE_MAX,
    maxAssetCount: 20000,
    videoAllowed: true,
    maxVideoSeconds: 7200,
    label: '500 GB shared · 20,000 items · video up to 2 hours',
  },
  federation: {
    maxTotalBytes: 0, // 0 = negotiated; must not be enforced as "no media"
    maxFileBytes: VIDEO_FILE_MAX,
    maxAssetCount: 0,
    videoAllowed: true,
    maxVideoSeconds: null,
    label: 'Negotiated capacity',
  },
  business_listing: {
    maxTotalBytes: 2 * GB,
    maxFileBytes: IMAGE_FILE_MAX,
    maxAssetCount: 100,
    videoAllowed: false,
    maxVideoSeconds: null,
    label: '2 GB · 100 items · photos only',
  },
  business_plus: {
    maxTotalBytes: 20 * GB,
    maxFileBytes: VIDEO_FILE_MAX,
    maxAssetCount: 800,
    videoAllowed: true,
    maxVideoSeconds: 1200,
    label: '20 GB shared · 800 items · video up to 20 min',
  },
};

export function getMediaAllowance(tier: string | null | undefined): MediaAllowance {
  const key = (tier as TierName) in MEDIA_ALLOWANCES ? (tier as TierName) : 'free';
  return MEDIA_ALLOWANCES[key];
}

/**
 * Federation is "negotiated", encoded as 0 to mean "not machine-enforced".
 * Treating that as a literal zero quota would block all media for a paying
 * federation customer, which is worse than not enforcing it. This predicate
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
  if (bytes >= GB) return `${+(bytes / GB).toFixed(bytes % GB === 0 ? 0 : 1)} GB`;
  if (bytes >= MB) return `${+(bytes / MB).toFixed(bytes % MB === 0 ? 0 : 0)} MB`;
  return `${bytes} B`;
}

/**
 * Customer-facing explanation. Kept here (not in the pricing copy) so the
 * pricing page can never state a limit that differs from what is enforced.
 */
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