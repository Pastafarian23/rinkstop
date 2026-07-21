/**
 * src/lib/passport/index.ts
 *
 * Public re-exports for the Passport identity layer.
 *
 * Importers should depend on this barrel file, not the individual modules.
 * This gives us a stable surface for the Workstream 1 API.
 */

// Types
export * from './types';

// Services
export { passportService, PassportService } from './07-passport-service';
export { passportIdentityService, PassportIdentityService } from './08-identity-service';
export { passportLookupService, PassportLookupService } from './09-lookup-service';
export { passportMigrationService, PassportMigrationService } from './10-migration-service';
export { identityResolver, IdentityResolver } from './11-identity-resolver';
export type {
  IdentityReference,
  ResolvedIdentity,
} from './11-identity-resolver';

// Lower-level (exported for advanced/internal use)
export { passportAdapter, PassportAdapter } from './04-adapter';
export { passportRepository, PassportRepository } from './03-repository';
export { passportEventService, PassportEventService } from './05-event-service';
export { passportIdGenerator, PassportIdGenerator } from './06-id-generator';
export { passportAssetsService, type PassportAssetsService, type PassportQrAsset } from './12-assets-service';

// Feature flags (re-export)
export {
  isPassportEnabled,
  isPassportInternalApiEnabled,
  isPublicPassportLookupEnabled,
  isPassportMigrationEnabled,
  isPassportEventLoggingEnabled,
  isPassportQrResolveEnabled,
  isPassportAssetsApiEnabled,
  isPassportFlagEnabled,
  PASSPORT_FLAGS,
  type PassportFlag,
} from './02-feature-flags';

// ID generation (re-export)
export {
  generatePassportId,
  isValidPassportIdFormat,
  normalizePassportId,
} from './01-passport-id';

// Interfaces (re-export for type-only imports)
export type {
  PassportIdGenerator as IPassportIdGenerator,
  PassportRepositoryLike,
  PassportAdapterLike,
  PassportEventServiceLike,
  PassportServiceLike,
  PassportIdentityServiceLike,
  PassportLookupServiceLike,
  PassportMigrationServiceLike,
  PassportAssetsServiceLike,
} from './interfaces';