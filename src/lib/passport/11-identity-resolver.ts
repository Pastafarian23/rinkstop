/**
 * src/lib/passport/11-identity-resolver.ts
 *
 * The Identity Resolver — the single recommended entry point for
 * resolving any identity reference.
 *
 * Per Workstream 1 Phase 5: "All future features should query the
 * Passport layer rather than directly depending on user UUIDs."
 *
 * This module is the abstraction layer. It accepts any of:
 *   - Internal Identity Identifier (Clerk user ID, TEXT)
 *   - Public Passport ID (RS1-XXXXXXXXXXXXXXXX)
 *
 * And returns the unified Passport identity view, regardless of which
 * identifier was provided.
 *
 * Per Rule 8: UUIDs and Passport IDs are never interchanged. This
 * resolver is the only place where they're correlated.
 *
 * Per Rule 7: The resolver composes the existing Adapter and Lookup
 * services. It does not duplicate any logic.
 *
 * Future Workstreams (2, 3, 4...) should depend on this resolver,
 * not on raw Clerk user IDs.
 */

import { passportIdentityService } from './08-identity-service';
import { passportLookupService } from './09-lookup-service';
import { passportRepository } from './03-repository';
import { passportAdapter } from './04-adapter';
import { isPassportEnabled, isPublicPassportLookupEnabled } from './02-feature-flags';
import { isValidPassportIdFormat } from './01-passport-id';
import type { PassportUnifiedView, PassportRecord } from './types';

export type IdentityReference =
  | { kind: 'internal'; internalUserId: string }
  | { kind: 'passport'; passportId: string };

export interface ResolvedIdentity {
  /** The unified identity view (always present when found). */
  view: PassportUnifiedView;
  /** The Passport record, or null if the user has no Passport yet. */
  passport: PassportRecord | null;
  /** Which identifier was used to resolve. */
  resolvedBy: 'internal' | 'passport';
}

/**
 * The Identity Resolver. Stateless service.
 *
 * Usage:
 *   const identity = await identityResolver.resolve({ kind: 'passport', passportId: 'RS1-...' });
 *   const identity = await identityResolver.resolve({ kind: 'internal', internalUserId: 'user_abc...' });
 *
 * Returns null when:
 *   - PASSPORT_ENABLED is false
 *   - The identifier doesn't resolve to any user
 *   - The Passport ID is malformed (when given a passport reference)
 */
export class IdentityResolver {
  /**
   * Resolve any identity reference to a unified view.
   */
  async resolve(ref: IdentityReference): Promise<ResolvedIdentity | null> {
    if (!isPassportEnabled()) return null;

    if (ref.kind === 'internal') {
      return this.resolveByInternalUserId(ref.internalUserId);
    }
    return this.resolveByPassportId(ref.passportId);
  }

  /**
   * Resolve by Internal Identity Identifier.
   * Internal-only path. Does not require public lookup flag.
   */
  private async resolveByInternalUserId(
    internalUserId: string
  ): Promise<ResolvedIdentity | null> {
    const view = await passportAdapter.getUnifiedView(internalUserId);
    if (!view) return null;

    const passport = await passportRepository.findByInternalUserId(internalUserId);

    if (passport) {
      view.passportId = passport.passportId;
      view.passportStatus = passport.status;
      view.verificationLevel = passport.verificationLevel;
    }

    return { view, passport, resolvedBy: 'internal' };
  }

  /**
   * Resolve by Public Passport ID.
   * Requires PASSPORT_PUBLIC_LOOKUP flag (external-facing).
   */
  private async resolveByPassportId(
    passportId: string
  ): Promise<ResolvedIdentity | null> {
    if (!isPublicPassportLookupEnabled()) return null;

    if (!isValidPassportIdFormat(passportId)) return null;

    const passport = await passportLookupService.findByPassportId(passportId);
    if (!passport) return null;

    return this.resolveByInternalUserId(passport.internalUserId).then((result) => {
      if (!result) return null;
      return { ...result, resolvedBy: 'passport' as const };
    });
  }

  /**
   * Convenience: resolve to internal_user_id only.
   * Useful when callers want the Clerk user ID but only have a Passport ID.
   */
  async resolveToInternalUserId(ref: IdentityReference): Promise<string | null> {
    const result = await this.resolve(ref);
    return result?.view.internalUserId ?? null;
  }

  /**
   * Convenience: resolve to passport_id only.
   * Useful when callers want the public ID but only have an internal ID.
   * Returns null if the user has no Passport yet.
   */
  async resolveToPassportId(internalUserId: string): Promise<string | null> {
    if (!isPassportEnabled()) return null;
    const passport = await passportRepository.findByInternalUserId(internalUserId);
    return passport?.passportId ?? null;
  }
}

export const identityResolver = new IdentityResolver();