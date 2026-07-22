/**
 * src/lib/passport/types.ts
 *
 * Type definitions for the Passport identity layer.
 *
 * Per the Master Index terminology:
 * - Passport ID: the public identifier (RS1-XXXXXXXXXXXX)
 * - Internal Identity Identifier: the Clerk user ID (TEXT in production)
 * - Passport Status: state machine (pending/active/suspended/deactivated)
 * - Verification Level: identity proof strength (none/email_verified/id_verified/federation_verified)
 */

export type PassportStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'deactivated';

export type VerificationLevel =
  | 'none'
  | 'email_verified'
  | 'id_verified'
  | 'federation_verified';

export type PassportSource =
  | 'migration'
  | 'signup'
  | 'admin'
  | 'system';

export type PassportEntityType =
  | 'player'
  | 'coach'
  | 'organization'
  | 'managed_profile';

export type PassportEventType =
  | 'PASSPORT_ISSUED'
  | 'PASSPORT_ACTIVATED'
  | 'VERIFICATION_LEVEL_CHANGED'
  | 'PASSPORT_SUSPENDED'
  | 'PASSPORT_DEACTIVATED'
  | 'PASSPORT_LINK_ADDED'
  | 'PASSPORT_LINK_REMOVED';

/**
 * The Passport record as stored in public.passports.
 */
export interface PassportRecord {
  passportId: string;
  internalUserId: string;
  status: PassportStatus;
  verificationLevel: VerificationLevel;
  issuedAt: string;
  activatedAt: string | null;
  deactivatedAt: string | null;
  source: PassportSource;
  createdAt: string;
  updatedAt: string;
  /**
   * The opaque QR identifier (UUID, added in WS2 PR2 Step 1.1). Used to encode
   * the Passport's QR code — opaque because the URL or passport_id is never
   * encoded directly into the QR payload.
   */
  qrIdentifier: string;
}

/**
 * A single Passport event as stored in public.passport_events.
 */
export interface PassportEvent {
  id: string;
  passportId: string;
  eventType: PassportEventType;
  payload: Record<string, unknown>;
  internalUserId: string;
  createdAt: string;
}

/**
 * A Passport link as stored in public.passport_links.
 */
export interface PassportLink {
  id: string;
  passportId: string;
  entityType: PassportEntityType;
  entityId: string;
  linkedAt: string;
  linkedBy: string;
}

/**
 * A QR identifier revocation record, stored in public.passport_qr_revocations.
 * Each row represents one rotation of the qr_identifier for a Passport.
 */
export interface PassportQrRevocation {
  id: string;
  passportId: string;
  oldQrIdentifier: string;
  newQrIdentifier: string;
  reason: string | null;
  revokedBy: string | null;
  revokedAt: string;
}

/**
 * The unified identity view returned by PassportAdapter.
 *
 * This is the read-side interface for "who is this Passport holder?"
 * across all existing RinkStop tables.
 */
export interface PassportUnifiedView {
  // Identity
  internalUserId: string;
  passportId: string | null;
  passportStatus: PassportStatus | null;

  // Roles (from existing tables)
  isCoach: boolean;
  isPlayer: boolean;
  isParent: boolean; // has managed_profiles
  isOrganizationAdmin: boolean;

  // Verification
  verificationLevel: VerificationLevel;

  // Hockey history (legacy aggregate, read-only)
  hasHockeyHistory: boolean;
  hockeyTeamCount: number;
  latestTeamName: string | null;

  // Family (managed profiles)
  managedProfileCount: number;

  // Federations
  federationAffiliations: string[];

  // Profile (from profiles.avatar_url)
  avatarUrl: string | null;
}

/**
 * Result of a single-user migration attempt.
 */
export interface MigrationResult {
  status: 'migrated' | 'already_migrated' | 'skipped' | 'error';
  passportId?: string;
  reason?: string;
  error?: string;
}

/**
 * Errors raised by the Passport service layer.
 */
export class PassportDisabledError extends Error {
  constructor() {
    super('Passport functionality is disabled (PASSPORT_ENABLED=false)');
    this.name = 'PassportDisabledError';
  }
}

export class PassportNotFoundError extends Error {
  constructor(internalUserId: string) {
    super(`No Passport found for internal user id ${internalUserId}`);
    this.name = 'PassportNotFoundError';
  }
}

export class PassportAlreadyExistsError extends Error {
  constructor(passportId: string) {
    super(`Passport ${passportId} already exists`);
    this.name = 'PassportAlreadyExistsError';
  }
}

export class InvalidPassportIdError extends Error {
  constructor(candidate: string) {
    super(`Invalid Passport ID format: ${candidate}`);
    this.name = 'InvalidPassportIdError';
  }
}

export class PassportCollisionError extends Error {
  constructor(attempts: number) {
    super(`Failed to generate unique Passport ID after ${attempts} attempts`);
    this.name = 'PassportCollisionError';
  }
}
// =============================================================================
// Workstream 3 — Stamp system types (PR2+)
// =============================================================================

/**
 * Stamp target types — the polymorphic parent of a stamp row.
 * Exactly one of target_rink_id / target_venue_id / target_event_id is set.
 */
export type StampTargetType = 'rink' | 'venue' | 'event';

/**
 * Stamp actor types — who initiated the scan.
 * Determined server-side from the user's profile role.
 */
export type StampActorType =
  | 'player'
  | 'parent'
  | 'coach'
  | 'rink_operator'
  | 'tournament_organizer';

/**
 * Stamp subject types — who got stamped (only set for third_party scans).
 * For self-scan stamps, subject_user_id / subject_type are NULL.
 */
export type StampSubjectType = 'player' | 'coach' | 'team';

/**
 * Stamp context — what kind of visit this was.
 * Optional. Used for coach→player stamps to disambiguate practice vs game.
 */
export type StampContext =
  | 'practice'
  | 'game'
  | 'check-in'
  | 'registration';

/**
 * Stamp visibility — controls whether the row surfaces on the public Passport.
 * Per WS3 Decision 2: opt-in per stamp, default private.
 */
export type StampVisibility = 'private' | 'public';

/**
 * Stamp status — dispute/rotation states.
 * Per WS3 plan: 'disputed' is set by the holder (PR4); 'revoked' is set by
 * admin via QR rotation (PR4).
 */
export type StampStatus = 'confirmed' | 'disputed' | 'revoked';

/**
 * Stamp source — who initiated the scan mechanically.
 */
export type StampSource = 'self_scan' | 'third_party_scan';

/**
 * Resolved stamp target — what a QR identifier points at.
 * The QR resolver (PR2) returns one of these shapes before /stamp/[qrIdentifier]
 * renders the confirmation page.
 */
export type ResolvedStampTarget =
  | {
      targetType: 'rink';
      rinkId: string;
      rinkName: string;
      rinkSlug: string;
      verificationTier: string;
      publicId: string;
    }
  | {
      targetType: 'venue';
      venueId: string;
      venueName: string;
      verificationTier: string;
      publicId: string;
    }
  | {
      targetType: 'event';
      eventId: string;
      eventName: string;
      startsAt: string;
      parentType: 'rink' | 'venue';
      parentName: string;
      publicId: string;
    };

/**
 * Stamp record as stored in public.stamps.
 */
export interface StampRecord {
  id: string;
  targetType: StampTargetType;
  targetRinkId: string | null;
  targetVenueId: string | null;
  targetEventId: string | null;
  actorUserId: string;
  actorType: StampActorType;
  subjectUserId: string | null;
  subjectType: StampSubjectType | null;
  context: StampContext | null;
  source: StampSource;
  visibility: StampVisibility;
  status: StampStatus;
  geoLat: number | null;
  geoLng: number | null;
  distanceMeters: number | null;
  stampedAt: string;
}

/**
 * Scan-event audit row (public.scan_events). Internal — never API-exposed.
 */
export interface ScanEventRecord {
  id: string;
  qrIdentifier: string;
  actorUserId: string | null;
  outcome:
    | 'stamp_created'
    | 'duplicate'
    | 'rate_limited'
    | 'flagged_dispute'
    | 'invalid_target'
    | 'error';
  details: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Body of POST /api/passport/stamp.
 * - qrIdentifier: required, opaque UUID (resolved server-side)
 * - subjectUserId: optional, only valid for third_party scans (coach→player)
 * - context: optional, only valid for third_party scans
 * - visibility: optional, defaults to 'private' per WS3 Decision 2
 * - geoLat / geoLng: optional, only stored if the holder opted in to geo on
 *   the confirmation page (per WS3 geo decision — opt-in toggle)
 */
export interface CreateStampRequest {
  qrIdentifier: string;
  subjectUserId?: string;
  context?: StampContext;
  visibility?: StampVisibility;
  geoLat?: number;
  geoLng?: number;
}

/**
 * Response of POST /api/passport/stamp on success.
 */
export interface CreateStampResponse {
  stampId: string;
  targetType: StampTargetType;
  targetName: string;
  visibility: StampVisibility;
  alreadyStampedToday?: boolean; // true if this is a duplicate (rate limit)
}
