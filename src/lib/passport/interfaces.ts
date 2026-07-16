/**
 * src/lib/passport/interfaces.ts
 *
 * Service interfaces for the Passport identity layer.
 *
 * Kept separate from implementation files so callers can depend on the
 * interface and tests can mock implementations.
 */

import type {
  PassportRecord,
  PassportEvent,
  PassportLink,
  PassportStatus,
  VerificationLevel,
  PassportEntityType,
  PassportUnifiedView,
  MigrationResult,
} from './types';

/**
 * Generates Passport IDs in RS1 format.
 */
export interface PassportIdGenerator {
  generate(): string;
  generateUnique(existingExists: (id: string) => Promise<boolean>): Promise<string>;
}

/**
 * Database access for the three Passport tables.
 */
export interface PassportRepositoryLike {
  findByPassportId(passportId: string): Promise<PassportRecord | null>;
  findByInternalUserId(internalUserId: string): Promise<PassportRecord | null>;
  create(input: {
    passportId: string;
    internalUserId: string;
    status?: PassportStatus;
    verificationLevel?: VerificationLevel;
    source?: string;
  }): Promise<PassportRecord>;
  updateStatus(
    passportId: string,
    status: PassportStatus
  ): Promise<PassportRecord>;
  updateVerificationLevel(
    internalUserId: string,
    level: VerificationLevel
  ): Promise<PassportRecord | null>;
  appendEvent(input: {
    passportId: string;
    eventType: string;
    payload?: Record<string, unknown>;
    internalUserId: string;
  }): Promise<PassportEvent>;
  addLink(input: {
    passportId: string;
    entityType: PassportEntityType;
    entityId: string;
    linkedBy: string;
  }): Promise<PassportLink | null>;
  hasPassport(internalUserId: string): Promise<boolean>;
  count(): Promise<number>;
}

/**
 * Read-only facade over existing RinkStop tables.
 */
export interface PassportAdapterLike {
  getUnifiedView(internalUserId: string): Promise<PassportUnifiedView | null>;
  hasPassport(internalUserId: string): Promise<boolean>;
}

/**
 * Event append-only service.
 */
export interface PassportEventServiceLike {
  append(input: {
    passportId: string;
    eventType: string;
    payload?: Record<string, unknown>;
    internalUserId: string;
  }): Promise<PassportEvent | null>;
}

/**
 * The main Passport service (Identity Facade).
 */
export interface PassportServiceLike {
  ensurePassport(
    internalUserId: string,
    source: 'migration' | 'signup' | 'admin' | 'system'
  ): Promise<PassportRecord>;
  activatePassport(internalUserId: string): Promise<PassportRecord>;
  updateVerificationLevel(
    internalUserId: string,
    level: VerificationLevel
  ): Promise<void>;
  deactivate(internalUserId: string): Promise<void>;
  suspend(internalUserId: string, reason: string): Promise<void>;
}

/**
 * Identity queries.
 */
export interface PassportIdentityServiceLike {
  getIdentity(internalUserId: string): Promise<PassportUnifiedView | null>;
}

/**
 * Lookup by public Passport ID.
 */
export interface PassportLookupServiceLike {
  findByPassportId(passportId: string): Promise<PassportRecord | null>;
  findByInternalUserId(internalUserId: string): Promise<PassportRecord | null>;
  isValidPassportIdFormat(candidate: string | null | undefined): boolean;
}

/**
 * Migration service.
 */
export interface PassportMigrationServiceLike {
  migrateUser(internalUserId: string): Promise<MigrationResult>;
  dryRunMigration(internalUserId: string): Promise<MigrationResult>;
}