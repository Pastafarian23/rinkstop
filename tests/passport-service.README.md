# Passport Service Tests (Integration)

**Status: scaffold only — these require a real Supabase instance.**

The pure-logic tests in `tests/passport-id.test.ts` and `tests/feature-flags.test.ts`
run without any external dependencies.

The integration tests below need to run against a Supabase test instance
(local Docker or staging) with the migration `2026-07-16_passports_core.sql`
applied. They are NOT enabled by default.

## To enable integration tests

1. Add `vitest-environment-supabase` (or equivalent) to devDependencies.
2. Create `tests/setup-integration.ts` that bootstraps a Supabase test client.
3. Set env vars: `SUPABASE_TEST_URL`, `SUPABASE_TEST_SERVICE_KEY`.
4. Add a new Vitest config or use `vitest --config vitest.integration.config.ts`.
5. Move this file's contents into `passport-service.test.ts`.

## Test plan

```typescript
describe('PassportService.ensurePassport', () => {
  it('creates a Passport for a new user', async () => { ... });
  it('returns the existing Passport on second call (idempotent)', async () => { ... });
  it('throws PassportDisabledError when PASSPORT_ENABLED=false', async () => { ... });
  it('records PASSPORT_ISSUED event with source=migration', async () => { ... });
  it('records PASSPORT_ISSUED event with source=signup', async () => { ... });
});

describe('PassportService.activatePassport', () => {
  it('transitions pending → active', async () => { ... });
  it('is idempotent (no-op on already-active)', async () => { ... });
  it('records PASSPORT_ACTIVATED event', async () => { ... });
  it('throws PassportNotFoundError for unknown user', async () => { ... });
});

describe('PassportService.updateVerificationLevel', () => {
  it('updates level when Passport exists', async () => { ... });
  it('silent no-op when PASSPORT_ENABLED=false', async () => { ... });
  it('records VERIFICATION_LEVEL_CHANGED event', async () => { ... });
});

describe('PassportLookupService.findByPassportId', () => {
  it('returns the Passport when it exists', async () => { ... });
  it('returns null for invalid format', async () => { ... });
  it('returns null when public lookup flag is off', async () => { ... });
});

describe('IdentityResolver.resolve', () => {
  it('resolves internal_user_id to a view', async () => { ... });
  it('resolves passport_id to a view when public flag is on', async () => { ... });
  it('returns null for non-existent users', async () => { ... });
  it('returns null when feature flags are off', async () => { ... });
  it('round-trip: resolveByPassportId ∘ resolveToPassportId = identity', async () => { ... });
});

describe('PassportMigrationService', () => {
  it('migrates a user with no existing Passport', async () => { ... });
  it('returns already_migrated for users with Passports', async () => { ... });
  it('dry-run does not write to the database', async () => { ... });
  it('re-running full migration is a no-op', async () => { ... });
});
```

## Coverage targets

- All public methods of all 4 services
- Idempotency for every state-mutating operation
- Feature flag gate behavior (master switch + sub-flags)
- Error paths (PassportNotFoundError, PassportDisabledError, etc.)
- Event log entries for every state change

**Target coverage: 80%+ for src/lib/passport/.**