/**
 * src/lib/passport/09-lookup-service.ts
 *
 * Lookup by public Passport ID. The single source of truth for resolving
 * a Passport ID back to its Internal Identity Identifier and vice versa.
 *
 * Used by: QR scanning, public profile pages, external integrations.
 *
 * Per Rule 8 (UUID/Passport ID Separation): Passport IDs are public and
 * appear in URLs and external integrations. They never appear as FKs in
 * the database — only as primary keys in the passports table itself.
 */

import { passportRepository } from './03-repository';
import { isValidPassportIdFormat, normalizePassportId } from './01-passport-id';
import { isPublicPassportLookupEnabled } from './02-feature-flags';
import type { PassportLookupServiceLike } from './interfaces';
import type { PassportRecord } from './types';

export class PassportLookupService implements PassportLookupServiceLike {
  /**
   * Look up a Passport by its public Passport ID.
   *
   * Returns null if public lookup is disabled OR no Passport with that ID exists.
   * Validates format first; returns null for invalid format without DB hit.
   */
  async findByPassportId(passportId: string): Promise<PassportRecord | null> {
    if (!isPublicPassportLookupEnabled()) return null;

    const normalized = normalizePassportId(passportId);
    if (!normalized) return null;

    return passportRepository.findByPassportId(normalized);
  }

  /**
   * Look up a Passport by its Internal Identity Identifier.
   *
   * This is internal-only — not gated by the public flag. Used by services
   * and the migration layer.
   */
  async findByInternalUserId(internalUserId: string): Promise<PassportRecord | null> {
    return passportRepository.findByInternalUserId(internalUserId);
  }

  /**
   * Validate a Passport ID format.
   * Format check only — does not check whether the Passport exists.
   */
  isValidPassportIdFormat(candidate: string | null | undefined): boolean {
    return isValidPassportIdFormat(candidate);
  }
}

export const passportLookupService = new PassportLookupService();