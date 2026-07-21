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