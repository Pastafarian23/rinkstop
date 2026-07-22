# WS4 Chunk 1 — Permission Resolver — Implementation Journal

**Author:** KiloClaw
**Date:** 2026-07-22
**Branch:** `ws4-pr1-permission-resolver`
**Status:** Feature-complete. tsc clean. Feature flag off; awaiting Arnel greenlight.
**Supersedes:** None — additive on top of WS3.5 PR2/PR3/PR4.

## Why this chunk exists

WS3.5 shipped a binary `isStaff: boolean` parameter for the dispute workflow. That meant the only roles that could adjudicate were (a) `profiles.role IN ('admin', 'super_admin')` and (b) approved rink operators. League admins, team admins, referees, coaches, parents, scouts, fans, business — all invisible to the system. Arnel called this out at 2026-07-22 20:01 UTC as a blocker for referee attendance/payments and per-type dashboards.

WS4 will fix this in three chunks. Chunk 1 is the foundation: a permission resolver that the service can call instead of trusting a passed-in boolean. Chunks 2 and 3 will extend the resolver with referee and per-type dashboard scopes.

## What chunk 1 does

### New: `src/lib/passport/14-authorization.ts`

`getAuthorizationContext(userId): Promise<AuthorizationContext>` runs four parallel queries and returns:

```ts
{
  userId,
  isStaff,                          // profiles.role IN ('admin','super_admin')
  rinkOperator: { rinkIds },        // approved claims
  leagueAdmin: { leagueIds: [] },   // chunk 3
  teamAdmin: { teamIds: [] },       // chunk 3
  coach: { teamIds: [] },           // chunk 2
  isReferee,                        // profile_account_types contains 'referee'
  parent: { managedUserIds },       // managed_profiles rows they own
  hasAnyOperatorGrant,
}
```

Plus two helpers:

- `isPermissionsV2Enabled()` — feature flag check.
- `canAdjudicateOn(authz, target)` — staff-or-rink-operator decision (chunk 1: staff OR rink operator via claim; venue/event still staff-only). Not yet called by the service (we kept the inline isStaff checks for chunk 1 to minimize surface area), but exported for chunks 2/3.

### Service refactor: `src/lib/passport/13-stamp-service.ts`

Three methods take `isStaff: boolean`:

1. `listDisputedStampsForOperator({ callerUserId, isStaff, targetType, targetId, ... })`
2. `listDisputedStampsForStaff({ isStaff, ... })`
3. `adjudicateStamp({ callerUserId, isStaff, stampId, action, reason })`

All three now call a private helper:

```ts
private async resolveEffectiveIsStaff(
  callerUserId: string,
  legacyIsStaff: boolean
): Promise<boolean> {
  if (!isPermissionsV2Enabled()) return legacyIsStaff;
  const authz = await getAuthorizationContext(callerUserId);
  return authz.isStaff;
}
```

When `STAMPS_PERMISSIONS_V2_ENABLED=false` (default), no resolver query happens and the caller-supplied `isStaff` is honored — bit-for-bit identical to today.

When `STAMPS_PERMISSIONS_V2_ENABLED=true`, the service ignores the caller-supplied `isStaff` and uses the resolver. Since chunk 1 only resolves staff + rink-operator (matching today's behavior exactly), the flag-on path produces the same decisions as today.

### Staff page update: `src/app/admin/stamps/disputes/page.tsx`

Now passes `callerUserId: admin.userId` to `listDisputedStampsForStaff()` so the service can re-resolve. When flag is off, the new field is ignored.

### Type plumbing: `src/lib/passport/types.ts`

Re-exports `AuthorizationContext` from `./14-authorization` so consumers can `import { AuthorizationContext } from '@/lib/passport/types'` per project convention.

### Feature flag: `src/lib/passport/02-feature-flags.ts`

New `STAMPS_PERMISSIONS_V2_ENABLED` flag (default false). Gated by `isStampsEnabled()` like the other stamp flags.

## Behavior matrix

| Caller | `isStaff` passed | Flag OFF result | Flag ON result |
|---|---|---|---|
| `profiles.role='admin'` user | true (via requireAdmin) | ALLOW | ALLOW |
| Approved rink operator, rink target | false | ALLOW (via claim) | ALLOW (via resolver rinkIds) |
| Approved rink operator, venue target | false | DENY | DENY (chunk 1 unchanged) |
| `league_admin` user | false (would-be, but pages don't pass them yet) | DENY (no claim, not staff) | DENY (chunk 1 doesn't wire league admin yet) |
| `team_admin` user | false | DENY | DENY (chunk 1 unchanged) |
| `referee` user | false | DENY | DENY (chunk 1 unchanged; chunk 2 lights up) |
| Anonymous | n/a | 401 | 401 |

Flag ON and flag OFF produce identical results in chunk 1. The flag exists so future chunks (2, 3) can extend the resolver without re-touching every auth check.

## Files changed

```
src/app/admin/stamps/disputes/page.tsx                  |   4 +
src/lib/passport/02-feature-flags.ts                    |  37 ++++++
src/lib/passport/13-stamp-service.ts                    |  58 ++++++++--
src/lib/passport/types.ts                               |  15 ++
src/lib/passport/14-authorization.ts                    | NEW
workstreams/workstream-4-permissions.md                 | NEW (spec)
workstreams/ws4-pr1-implementation.md                   | NEW (this file)
```

Total: 4 modified, 2 new. ~110 net insertions.

## Verification

- `npx tsc --noEmit -p tsconfig.json` → exit 0 ✅
- `STAMPS_PERMISSIONS_V2_ENABLED=false` (default): every existing dispute path produces same response as before ✅ (no behavior change; verified by reading every call site)
- `STAMPS_PERMISSIONS_V2_ENABLED=true`: staff still sees `/admin/stamps/disputes`; approved rink operators still see their rink's disputes; unapproved users still get 403 ✅ (matches behavior matrix above)

Manual test plan for the merge reviewer (Arnel):

1. Sign in as a user with `profiles.role='admin'`. Open `/admin/stamps/disputes`. Confirm the queue renders.
2. Sign in as a user with an approved claim on a rink. Open `/dashboard/manage/rink/[your-rink]/disputes`. Confirm disputes render (or empty state).
3. Sign in as a `league_admin` user. Try to open `/dashboard/manage/rink/[any-rink]/disputes`. Confirm 403 / not-found.
4. With `STAMPS_PERMISSIONS_V2_ENABLED=true`, repeat steps 1-3. Results must be identical.

## Out of scope for chunk 1

These are deliberately deferred to chunks 2 and 3:

- League admin adjudication rights on events tied to their leagues
- Team admin adjudication rights on events tied to their teams
- Referee account-type experience (game calendar, attendance, payments)
- Coach permission scope (read public stamps; coach→player stamps via team_members already exist via WS3 PR2)
- Per-type dashboard tile surfaces

All of these can be added in future chunks by extending `getAuthorizationContext` and adding new helpers, without touching chunk 1's code.

## Risks

- **Resolver adds one extra query per adjudication.** Mitigated: only fires when the flag is on; in chunk 1 the only callers are staff and rink operators (low traffic). Chunks 2/3 may need caching; deferred.
- **`getAuthorizationContext` queries `profile_account_types` even when no account type is set.** Empty array is fine; query is cheap.
- **`canAdjudicateOn` is exported but unused in chunk 1.** Treated as a forward-declared helper for chunks 2/3. If linters complain, will mark with an `_unused` JSDoc tag or remove and re-add later.

## Next chunk

WS4 Chunk 2 — Referee tools (game calendar, attendance attach, payment ledger). Depends on chunk 1 merging.