/**
 * src/lib/passport/02-feature-flags.ts
 *
 * Centralized feature flag gating for all Passport code.
 *
 * Per Workstream 1 Rule 5: All Passport functionality must be behind
 * server-side feature flags. Even after implementation finishes, production
 * behavior remains identical because the flags are off. This enables
 * emergency rollback without reverting code.
 *
 * Per Rule 6 (Zero Data Mutation): even with flags enabled, this code never
 * mutates existing production records except to attach Passport metadata.
 *
 * Flag naming convention: PASSPORT_<capability> in UPPER_SNAKE_CASE.
 * Each flag has a default of `false` so production stays unchanged.
 *
 * Env var lookup: process.env.PASSPORT_<flag> === 'true'
 */

export const PASSPORT_FLAGS = {
  // Master switch. All Passport features off if false.
  PASSPORT_ENABLED: false,

  // Internal API routes accessible.
  PASSPORT_INTERNAL_API: false,

  // Public Passport ID → data lookup.
  PASSPORT_PUBLIC_LOOKUP: false,

  // Migration layer active.
  PASSPORT_MIGRATION: false,

  // Append events to passport_events.
  PASSPORT_EVENT_LOGGING: false,

  // Dashboard Passport section visible.
  PASSPORT_DASHBOARD: false,

  // PR2 Step 1.9 — Public QR resolver at /qr/[qrIdentifier].
  PASSPORT_QR_RESOLVE: false,

  // PR2 Step 1.9 — Internal QR asset API at /api/internal/passport/qr/[passportId].
  PASSPORT_ASSETS_API: false,

  // WS3 PR1 — Stamp system. Gates /stamp/[qrIdentifier], /api/passport/stamp,
  // the QR-resolver dispatch on stamp targets, and the public Passport
  // attendance section. Defaults off; per Workstream 1 Rule 5, production
  // behavior stays unchanged until flag is enabled.
  STAMPS_ENABLED: false,
} as const;

export type PassportFlag = keyof typeof PASSPORT_FLAGS;

/**
 * Read a feature flag from env. Defaults to false if not set.
 *
 * Per Rule 5: every Passport capability check MUST go through this function.
 * Never read process.env directly elsewhere.
 */
export function isPassportFlagEnabled(flag: PassportFlag): boolean {
  const v = process.env[flag];
  return v === 'true';
}

/**
 * Master switch — short-circuit all Passport code if this returns false.
 */
export function isPassportEnabled(): boolean {
  return isPassportFlagEnabled('PASSPORT_ENABLED');
}

/**
 * Internal API gate — checked by all routes under /api/internal/passport/*.
 */
export function isPassportInternalApiEnabled(): boolean {
  return (
    isPassportEnabled() && isPassportFlagEnabled('PASSPORT_INTERNAL_API')
  );
}

/**
 * Public Passport lookup gate.
 */
export function isPublicPassportLookupEnabled(): boolean {
  return (
    isPassportEnabled() && isPassportFlagEnabled('PASSPORT_PUBLIC_LOOKUP')
  );
}

/**
 * Migration layer gate.
 */
export function isPassportMigrationEnabled(): boolean {
  return (
    isPassportEnabled() && isPassportFlagEnabled('PASSPORT_MIGRATION')
  );
}

/**
 * Event logging gate.
 */
export function isPassportEventLoggingEnabled(): boolean {
  return (
    isPassportEnabled() && isPassportFlagEnabled('PASSPORT_EVENT_LOGGING')
  );
}

/**
 * PR2 Step 1.9 — Public QR resolver gate.
 * Gates GET /qr/[qrIdentifier].
 */
export function isPassportQrResolveEnabled(): boolean {
  return (
    isPassportEnabled() && isPassportFlagEnabled('PASSPORT_QR_RESOLVE')
  );
}

/**
 * PR2 Step 1.9 — Internal QR asset API gate.
 * Gates POST/GET /api/internal/passport/qr/[passportId].
 * Defense in depth: the route is already gated by isPassportInternalApiEnabled;
 * this is the second gate the plan requires.
 */
export function isPassportAssetsApiEnabled(): boolean {
  return (
    isPassportEnabled()
    && isPassportFlagEnabled('PASSPORT_INTERNAL_API')
    && isPassportFlagEnabled('PASSPORT_ASSETS_API')
  );
}