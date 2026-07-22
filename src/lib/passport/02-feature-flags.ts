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

  // WS3.5 PR1 — Dispute adjudication UI. Gates /dashboard/manage/.../disputes
  // (operator queue), /admin/stamps/disputes (staff queue), and the POST
  // adjudication endpoints. Requires STAMPS_ENABLED too. Per Workstream 1
  // Rule 5, defaults off; the underlying schema (rejected_at, rejected_by_*
  // columns; rejected status value; staff/operator RLS policies) ships with
  // this PR — the flag gates behavior, not data.
  STAMPS_ADMIN_ENABLED: false,

  // WS3.5 PR5 — Family Hub Multi-Stamp Passport picker UI on
  // /stamp/[qrIdentifier]. When enabled, the confirmation page shows a
  // picker when the caller has 2+ eligible Passports (own + linked
  // kids via managed_profiles). When disabled, the page uses single-
  // Passport behavior (the current WS3 PR2 path). Requires STAMPS_ENABLED.
  // Defaults false — production stays unchanged until Arnel enables it.
  STAMPS_FAMILY_PICKER_ENABLED: false,

  // WS4 Chunk 1 — Account-type-aware permission resolver.
  //
  // Gates the cutover from the binary `isStaff: boolean` parameter (used
  // by WS3.5 PR2/PR3/PR4) to the structured AuthorizationContext returned
  // by getAuthorizationContext(). When false, dispute service methods use
  // the legacy isStaff path exactly as today. When true, service methods
  // resolve permissions internally from callerUserId.
  //
  // Chunk 1 is purely additive: when this flag is on, behavior is
  // bit-for-bit identical to today (rink-operator via approved claim,
  // staff via profiles.role). Future chunks (2 referee tools, 3 per-type
  // dashboard tiles) extend the resolver without touching this flag.
  //
  // Defaults false — production stays unchanged until Arnel enables it
  // and verifies chunk 1's resolver on real dispute traffic.
  STAMPS_PERMISSIONS_V2_ENABLED: false,

  // WS4 Chunk 2 — Referee tools.
  //
  // Gates /dashboard/referee, /dashboard/referee/games/[assignmentId],
  // /dashboard/referee/payments, and the corresponding API routes.
  // Also gates the WS4 PR2 referee tables (referee_game_assignments,
  // referee_attendance, referee_payments) for application code; the
  // tables themselves ship unconditionally (data, not behavior).
  //
  // Requires PASSPORT_ENABLED (per Workstream 1 Rule 5).
  // Defaults false — production stays unchanged until Arnel enables it.
  REFEREE_TOOLS_ENABLED: false,
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

/**
 * WS3 PR2 — Stamp system gate.
 *
 * Gates /stamp/[qrIdentifier] confirmation page, /api/passport/stamp endpoint,
 * and the QR-resolver dispatch on stamp targets (rink/venue/event). Per
 * Workstream 1 Rule 5, every stamp capability check MUST go through this
 * function. Never read process.env directly elsewhere.
 *
 * Default false — production stays unchanged until this is enabled.
 */
export function isStampsEnabled(): boolean {
  return (
    isPassportEnabled() && isPassportFlagEnabled('STAMPS_ENABLED')
  );
}

/**
 * WS3.5 PR1 — Dispute adjudication gate.
 *
 * Gates /dashboard/manage/.../disputes (operator queue),
 * /admin/stamps/disputes (staff queue), and the POST adjudication endpoints.
 * Requires isStampsEnabled() too — dispute workflow is meaningless without
 * the stamp workflow itself.
 *
 * Per WS3.5 spec: this is the load-bearing addition behind WS3.5 PR1.
 * Family Hub picker uses a separate flag (STAMPS_FAMILY_PICKER_ENABLED,
 * added in PR5).
 *
 * Default false — production stays unchanged until this is enabled.
 */
export function isStampsAdminEnabled(): boolean {
  return (
    isStampsEnabled() && isPassportFlagEnabled('STAMPS_ADMIN_ENABLED')
  );
}

/**
 * WS3.5 PR5 — Family Hub Multi-Stamp picker UI.
 *
 * Gates the Passport picker on /stamp/[qrIdentifier] when caller has
 * 2+ eligible Passports. When disabled, the page uses the single-
 * Passport WS3 PR2 behavior (no picker, the actor's own Passport is
 * used; subjectUserId via ?subject= query param still works for
 * coach→player scans).
 *
 * Requires isStampsEnabled() too — the picker is meaningless without
 * the stamp workflow itself. PR6's subject_passport_id column ships
 * unconditionally (data, not behavior); this flag gates the picker UI.
 */
export function isStampsFamilyPickerEnabled(): boolean {
  return (
    isStampsEnabled() &&
    isPassportFlagEnabled('STAMPS_FAMILY_PICKER_ENABLED')
  );
}

/**
 * WS4 Chunk 1 — Permissions V2 resolver gate.
 *
 * Gates the cutover from the WS3.5 binary `isStaff: boolean` parameter
 * to the structured AuthorizationContext returned by getAuthorizationContext().
 *
 * When false, dispute service methods use the legacy isStaff path exactly
 * as today (zero behavior change). When true, service methods resolve
 * permissions internally from callerUserId.
 *
 * Default false — production stays unchanged until Arnel enables it and
 * verifies chunk 1's resolver on real dispute traffic.
 */
export function isStampsPermissionsV2Enabled(): boolean {
  return (
    isStampsEnabled() &&
    isPassportFlagEnabled('STAMPS_PERMISSIONS_V2_ENABLED')
  );
}

/**
 * WS4 Chunk 2 — Referee tools gate.
 *
 * Gates /dashboard/referee (calendar + recent attendance + payment summary),
 * /dashboard/referee/games/[assignmentId] (assignment detail with check-in/out),
 * /dashboard/referee/payments (payment ledger), and the corresponding API
 * routes.
 *
 * Requires PASSPORT_ENABLED (the referee dashboard is a Passport feature
 * surfacing the user's officiating history). Per Workstream 1 Rule 5,
 * defaults false — production stays unchanged until Arnel enables it.
 */
export function isRefereeToolsEnabled(): boolean {
  return isPassportEnabled() && isPassportFlagEnabled('REFEREE_TOOLS_ENABLED');
}