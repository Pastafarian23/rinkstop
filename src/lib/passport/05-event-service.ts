/**
 * src/lib/passport/05-event-service.ts
 *
 * Append-only event log for Passport state changes.
 *
 * Per the Architecture spec: "Immutable event log as source of truth;
 * aggregates are derived and recalculated."
 *
 * Per Workstream 1: this log captures NEW event types only. Existing
 * hockey_player_team_history events remain in their legacy aggregate.
 * Migration to a fully event-sourced model is deferred to Workstream 2+.
 */

import { passportRepository } from './03-repository';
import { isPassportEventLoggingEnabled } from './02-feature-flags';
import type { PassportEventServiceLike } from './interfaces';
import type { PassportEvent } from './types';

export class PassportEventService implements PassportEventServiceLike {
  /**
   * Append an event to the Passport event log.
   *
   * Returns null if event logging is disabled (flag off). This is the
   * safe no-op path — callers don't need to check the flag.
   */
  async append(input: {
    passportId: string;
    eventType: string;
    payload?: Record<string, unknown>;
    internalUserId: string;
  }): Promise<PassportEvent | null> {
    if (!isPassportEventLoggingEnabled()) {
      // Silent no-op when disabled. Callers don't need flag-aware code.
      return null;
    }
    return passportRepository.appendEvent(input);
  }
}

export const passportEventService = new PassportEventService();