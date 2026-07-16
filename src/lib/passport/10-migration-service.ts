/**
 * src/lib/passport/10-migration-service.ts
 *
 * Migration service for moving existing RinkStop users to Passport.
 *
 * Idempotent: safe to run multiple times. The guard check via the adapter
 * prevents duplicate Passport creation.
 *
 * Per Q1-Q4 decisions:
 *   - Q1: Activation triggered by user visiting /dashboard/passport (handled by service)
 *   - Q2: Didit webhook calls updateVerificationLevel (additive)
 *   - Q3: Profile row creation happens in Clerk webhook
 *   - Q4: New signups get Passport via Clerk webhook calling ensurePassport
 *
 * Per Rule 6: this service only WRITES to the new tables. Existing records
 * are read but never modified.
 */

import { passportService } from './07-passport-service';
import { passportAdapter } from './04-adapter';
import { passportRepository } from './03-repository';
import { isPassportMigrationEnabled } from './02-feature-flags';
import type { PassportMigrationServiceLike } from './interfaces';
import type { MigrationResult } from './types';

export class PassportMigrationService implements PassportMigrationServiceLike {
  /**
   * Migrate a single existing user to Passport.
   *
   * Idempotency guarantees:
   *   - If user has no Passport → create one, return 'migrated'.
   *   - If user already has a Passport → return 'already_migrated' with existing ID.
   *   - If migration flag is off → return 'skipped'.
   *   - On error → return 'error' with the error message.
   *
   * Does NOT touch existing hockey history. That stays in hockey_player_team_history.
   */
  async migrateUser(internalUserId: string): Promise<MigrationResult> {
    if (!isPassportMigrationEnabled()) {
      return { status: 'skipped', reason: 'PASSPORT_MIGRATION=false (or PASSPORT_ENABLED=false)' };
    }

    try {
      // Guard: check if user already has a Passport.
      const hasPassport = await passportAdapter.hasPassport(internalUserId);
      if (hasPassport) {
        const existing = await passportRepository.findByInternalUserId(internalUserId);
        return {
          status: 'already_migrated',
          passportId: existing?.passportId,
        };
      }

      // Issue the Passport. ensurePassport checks isPassportEnabled() too.
      const passport = await passportService.ensurePassport(internalUserId, 'migration');
      return { status: 'migrated', passportId: passport.passportId };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { status: 'error', error };
    }
  }

  /**
   * Dry-run migration for a single user.
   * Returns what would happen without making changes.
   *
   * Note: We can't truly "dry run" ensurePassport without generating an ID.
   * Instead, we report the predicted outcome based on current state.
   */
  async dryRunMigration(internalUserId: string): Promise<MigrationResult> {
    if (!isPassportMigrationEnabled()) {
      return { status: 'skipped', reason: 'PASSPORT_MIGRATION=false' };
    }

    const hasPassport = await passportAdapter.hasPassport(internalUserId);
    if (hasPassport) {
      const existing = await passportRepository.findByInternalUserId(internalUserId);
      return {
        status: 'already_migrated',
        passportId: existing?.passportId,
      };
    }
    return { status: 'migrated' }; // would migrate
  }

  /**
   * Batch migration with progress reporting.
   *
   * Used by: admin migration runbook (Phase 4 deliverable).
   *
   * @param userIds - Array of Internal Identity Identifiers to migrate.
   * @param onProgress - Optional callback invoked after each user.
   * @returns Summary of the batch operation.
   */
  async migrateBatch(
    userIds: string[],
    onProgress?: (n: number) => void
  ): Promise<{
    migrated: number;
    alreadyMigrated: number;
    skipped: number;
    errors: number;
    total: number;
  }> {
    let migrated = 0;
    let alreadyMigrated = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < userIds.length; i++) {
      const result = await this.migrateUser(userIds[i]);
      switch (result.status) {
        case 'migrated':
          migrated++;
          break;
        case 'already_migrated':
          alreadyMigrated++;
          break;
        case 'skipped':
          skipped++;
          break;
        case 'error':
          errors++;
          break;
      }
      onProgress?.(i + 1);
    }

    return {
      migrated,
      alreadyMigrated,
      skipped,
      errors,
      total: userIds.length,
    };
  }
}

export const passportMigrationService = new PassportMigrationService();