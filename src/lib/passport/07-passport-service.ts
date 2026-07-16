/**
 * src/lib/passport/07-passport-service.ts
 *
 * The main Passport service — Identity Facade.
 *
 * Single responsibility: write-side operations on Passports.
 *   - ensurePassport (idempotent issuance)
 *   - activatePassport (pending → active)
 *   - updateVerificationLevel (cached from Didit)
 *   - deactivate (user request)
 *   - suspend (admin/system)
 *
 * Per Rule 5: every method checks isPassportEnabled() first.
 * Per Rule 6: only writes to the new passports and passport_events tables.
 * Per Rule 7: depends on the Adapter (read) and Repository (DB) — never
 *   queries existing tables directly from this layer.
 */

import { passportRepository } from './03-repository';
import { passportEventService } from './05-event-service';
import { passportIdGenerator } from './06-id-generator';
import { passportAdapter } from './04-adapter';
import { isPassportEnabled } from './02-feature-flags';
import type { PassportServiceLike } from './interfaces';
import type {
  PassportRecord,
  PassportSource,
  VerificationLevel,
} from './types';
import {
  PassportDisabledError,
  PassportNotFoundError,
} from './types';

export class PassportService implements PassportServiceLike {
  /**
   * Ensure a Passport exists for the given Internal Identity Identifier.
   *
   * Idempotent: if a Passport already exists, returns the existing record
   * without modification. Safe to call multiple times.
   *
   * Throws PassportDisabledError if PASSPORT_ENABLED is false.
   * Throws PassportCollisionError if ID generation fails repeatedly.
   */
  async ensurePassport(
    internalUserId: string,
    source: PassportSource
  ): Promise<PassportRecord> {
    if (!isPassportEnabled()) {
      throw new PassportDisabledError();
    }

    // Idempotency guard: if Passport exists, return it.
    const existing = await passportRepository.findByInternalUserId(internalUserId);
    if (existing) return existing;

    // Generate a unique Passport ID with retry on collision.
    const passportId = await passportIdGenerator.generateUnique(
      async (id) => {
        const found = await passportRepository.findByPassportId(id);
        return !!found;
      }
    );

    // Create the Passport record (DB enforces uniqueness on internal_user_id).
    const record = await passportRepository.create({
      passportId,
      internalUserId,
      status: 'pending',
      verificationLevel: 'none',
      source,
    });

    // Append the issuance event (no-op if event logging disabled).
    await passportEventService.append({
      passportId,
      eventType: 'PASSPORT_ISSUED',
      payload: { source },
      internalUserId,
    });

    return record;
  }

  /**
   * Activate a pending Passport.
   *
   * Per Q1 decision: activation triggered by user visiting /dashboard/passport
   * for the first time. Called by the dashboard page on first visit.
   *
   * If the Passport is already active, this is a no-op.
   * If the Passport doesn't exist, throws PassportNotFoundError.
   */
  async activatePassport(internalUserId: string): Promise<PassportRecord> {
    if (!isPassportEnabled()) {
      throw new PassportDisabledError();
    }

    const passport = await passportRepository.findByInternalUserId(internalUserId);
    if (!passport) throw new PassportNotFoundError(internalUserId);
    if (passport.status === 'active') return passport; // no-op

    const updated = await passportRepository.updateStatus(passport.passportId, 'active');

    await passportEventService.append({
      passportId: passport.passportId,
      eventType: 'PASSPORT_ACTIVATED',
      payload: {},
      internalUserId,
    });

    return updated;
  }

  /**
   * Update the verification level (called from Didit webhook handler).
   *
   * Per Q2 decision: the Didit webhook calls this after writing its own
   * session record. This caches the level on the Passport for fast reads.
   *
   * Silent no-op if no Passport exists yet for the user.
   * Silent no-op if PASSPORT_ENABLED is false.
   */
  async updateVerificationLevel(
    internalUserId: string,
    level: VerificationLevel
  ): Promise<void> {
    if (!isPassportEnabled()) return;

    const updated = await passportRepository.updateVerificationLevel(
      internalUserId,
      level
    );
    if (!updated) return; // no Passport yet — caller may retry later

    await passportEventService.append({
      passportId: updated.passportId,
      eventType: 'VERIFICATION_LEVEL_CHANGED',
      payload: { level },
      internalUserId,
    });
  }

  /**
   * Deactivate a Passport (user request).
   */
  async deactivate(internalUserId: string): Promise<void> {
    if (!isPassportEnabled()) {
      throw new PassportDisabledError();
    }
    const passport = await passportRepository.findByInternalUserId(internalUserId);
    if (!passport) throw new PassportNotFoundError(internalUserId);
    if (passport.status === 'deactivated') return;

    await passportRepository.updateStatus(passport.passportId, 'deactivated');

    await passportEventService.append({
      passportId: passport.passportId,
      eventType: 'PASSPORT_DEACTIVATED',
      payload: {},
      internalUserId,
    });
  }

  /**
   * Suspend a Passport (admin or system action).
   *
   * Note: we don't change the adapter contract here; this is a service-level
   * operation that admin tooling calls.
   */
  async suspend(internalUserId: string, reason: string): Promise<void> {
    if (!isPassportEnabled()) {
      throw new PassportDisabledError();
    }
    const passport = await passportRepository.findByInternalUserId(internalUserId);
    if (!passport) throw new PassportNotFoundError(internalUserId);

    await passportRepository.updateStatus(passport.passportId, 'suspended');

    await passportEventService.append({
      passportId: passport.passportId,
      eventType: 'PASSPORT_SUSPENDED',
      payload: { reason },
      internalUserId,
    });
  }

  /**
   * Convenience: has this user been issued a Passport?
   * Exposed for the adapter and migration service.
   */
  async hasPassport(internalUserId: string): Promise<boolean> {
    return passportAdapter.hasPassport(internalUserId);
  }

  /**
   * Read-only dashboard state for a user.
   *
   * Workstream 2 (Phase 2A — Passport Dashboard): composed read for the
   * /dashboard/passport page. Returns the unified identity view, the
   * Passport record (if any), and recent events.
   *
   * All data flows through this service and the Identity Resolver. No
   * direct queries to passport* tables from UI components.
   *
   * Returns null if PASSPORT_ENABLED is false (so the page can fall back
   * to the existing editor without leaking flag state).
   */
  async getDashboardState(internalUserId: string, eventLimit = 5): Promise<PassportDashboardState | null> {
    if (!isPassportEnabled()) return null;

    const view = await passportAdapter.getUnifiedView(internalUserId);
    const passport = await passportRepository.findByInternalUserId(internalUserId);
    const recentEvents = passport
      ? await passportRepository.getEventsForPassport(passport.passportId, eventLimit)
      : [];

    return {
      view,
      passport,
      recentEvents,
    };
  }
}

export interface PassportDashboardState {
  view: import('./types').PassportUnifiedView;
  passport: import('./types').PassportRecord | null;
  recentEvents: import('./types').PassportEvent[];
}

export const passportService = new PassportService();