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
 * Per WS3.5 PR1: 'rejected' is added as the terminal state for upheld
 * disputes. Once a stamp is rejected, it stays rejected — no reversal path.
 */
export type StampStatus = 'confirmed' | 'disputed' | 'rejected' | 'revoked';

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
  // WS3.5 PR6 — the public Passport id this stamp attaches to. NULL on
  // legacy WS3 rows that pre-date the column (backfilled on read).
  subjectPassportId: string | null;
  subjectType: StampSubjectType | null;
  context: StampContext | null;
  source: StampSource;
  visibility: StampVisibility;
  status: StampStatus;
  geoLat: number | null;
  geoLng: number | null;
  distanceMeters: number | null;
  stampedAt: string;
  // WS3.5 PR1 fields. All nullable — only set after a dispute is adjudicated.
  rejectedAt: string | null;
  rejectedByUserId: string | null;
  rejectedReason: string | null;
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
    | 'error'
    // WS3.5 PR1: written by the adjudication endpoint when an operator or
    // staff upholds/overturns a dispute. The affected stamp_id goes in
    // details; the adjudicator's user_id goes in actor_user_id.
    | 'dispute_upheld'
    | 'dispute_overturned';
  details: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * WS3.5 PR1 — request body for POST /api/passport/stamp/[stampId]/adjudicate.
 * Endpoint planned for PR2.
 *
 * action: 'uphold' moves status='disputed' → 'rejected'. The stamp will
 *   never count. Stamper (or subject) gets a `dispute_upheld` notification.
 * action: 'overturn' moves status='disputed' → 'confirmed'. The stamp
 *   counts normally. Stamper (or subject) gets a `dispute_overturned`
 *   notification.
 *
 * reason: optional free-text, stored on stamps.rejected_reason. Not
 *   surfaced to stamper in WS3.5 v1 (per spec open question #2, default = no).
 *
 * Authorization: caller must be (a) the operator of the target (approved
 * claim against the target of the stamp), OR (b) RinkStop staff (Clerk role =
 * 'admin'). Service-layer enforces; never trust the client.
 */
export interface AdjudicateStampRequest {
  action: 'uphold' | 'overturn';
  reason?: string;
}

/**
 * WS3.5 PR1 — shape of an adjudication row as returned from the
 * dispute queue UI. Operator dashboard calls the service-layer
 * `listDisputedStampsForOperator()` (PR2 adds) which returns these.
 */
export interface DisputedStampRow {
  stampId: string;
  targetType: StampTargetType;
  targetName: string;
  targetCity: string | null;
  targetCountry: string | null;
  stamperDisplayName: string | null;
  stamperRole: StampActorType;
  stampedAt: string;
  disputeReason: string | null;
  disputeFlaggedAt: string;
}

/**
 * WS3.5 PR3 — staff cross-target dispute row. Same shape as
 * DisputedStampRow but adds targetId (so the UI can link to the public
 * directory page) and uses a single targetDisplay + targetLocation string
 * pair for compact rendering across mixed target types.
 */
export interface StaffDisputedStampRow {
  stampId: string;
  targetType: StampTargetType;
  targetId: string;
  targetDisplay: string;
  targetLocation: string | null;
  stamperDisplayName: string | null;
  stamperRole: StampActorType;
  stampedAt: string;
  disputeReason: string | null;
}

/**
 * WS3.5 PR1 — notification kinds for the dispute workflow. Matches the
 * migration's CHECK extension on consumer_notifications.kind.
 *   stamp_disputed      → sent to the operator of the target
 *   dispute_upheld      → sent to the stamper (or subject) when upheld
 *   dispute_overturned  → sent to the stamper (or subject) when overturned
 */
export type DisputeNotificationKind =
  | 'stamp_disputed'
  | 'dispute_upheld'
  | 'dispute_overturned';

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
  /**
   * WS3.5 PR6 — the public Passport ID the stamp attaches to. When
   * caller is on their own Passport, this equals the caller's passport
   * id (self-scan). When caller is a parent picking a kid's Passport
   * (Family Hub Multi-Stamp), this equals the kid's passport id and
   * subjectUserId is the kid's internal_user_id (third-party scan
   * from the parent's device).
   *
   * Optional in the type for backward compat with WS3 clients, but the
   * service layer requires it for new stamps (resolves it from the
   * actor's or subject's passport when not provided).
   */
  subjectPassportId?: string;
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
