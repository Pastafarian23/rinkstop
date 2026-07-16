/**
 * src/lib/passport/08-identity-service.ts
 *
 * Read-side identity queries for the Identity Facade.
 *
 * Returns the unified view across all existing RinkStop tables plus
 * the Passport record. Used by dashboard personalization, access control,
 * and the public Passport view.
 */

import { passportAdapter } from './04-adapter';
import { passportRepository } from './03-repository';
import { isPassportEnabled } from './02-feature-flags';
import type { PassportIdentityServiceLike } from './interfaces';
import type { PassportUnifiedView } from './types';

export class PassportIdentityService implements PassportIdentityServiceLike {
  /**
   * Get the unified view of a user's identity across all existing systems.
   *
   * Returns null if PASSPORT_ENABLED is false OR if the user has no profile.
   *
   * The returned view includes:
   *   - Passport ID and status (from new passports table)
   *   - Coach/Player/Parent/OrgAdmin flags (from existing tables)
   *   - Verification level (cached from Didit)
   *   - Hockey history summary (from legacy aggregate)
   *   - Federation affiliations (placeholder for Phase E)
   */
  async getIdentity(internalUserId: string): Promise<PassportUnifiedView | null> {
    if (!isPassportEnabled()) return null;

    const view = await passportAdapter.getUnifiedView(internalUserId);
    if (!view) return null;

    // Augment with Passport record (if one exists).
    const passport = await passportRepository.findByInternalUserId(internalUserId);
    if (passport) {
      view.passportId = passport.passportId;
      view.passportStatus = passport.status;
      view.verificationLevel = passport.verificationLevel;
    }

    return view;
  }
}

export const passportIdentityService = new PassportIdentityService();