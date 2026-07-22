# Workstream 4 — Account-Type-Aware Permissions

**Author:** KiloClaw
**Date:** 2026-07-22
**Status:** Planning. Chunk 1 in flight.
**Supersedes:** WS3.5 PR2/PR3/PR4 binary `isStaff` model.

## Why

WS3.5 shipped a binary permission model: `isStaff: true | false`. Staff = `profiles.role IN ('admin', 'super_admin')`. Operators are recognized only via an approved `claims` row against a target rink. Everything else (`league_admin`, `team_admin`, `referee`, `coach`, `scout`, `parent`, `fan`, `business`) is invisible to the dispute/stamp system.

This blocks:
- League admins adjudicating disputes on their own league's events
- Team admins adjudicating disputes tied to their teams
- Referees tracking games worked / attendance / payments (the use case Arnel called out 2026-07-22 20:01 UTC)
- Coaches and parents getting permission-aware views of stamp/attendance data

## Strategy

Three chunks, each shippable behind a feature flag:

- **Chunk 1 (this PR): Permission resolver.** New `getAuthorizationContext(userId)` returns a structured authorization object. Service methods consume it instead of `isStaff: boolean`. No behavior change when flag is off. Foundation for everything else.
- **Chunk 2 (next PR): Referee tools.** `/dashboard/referee` with game calendar, attendance attach, payment ledger. Depends on chunk 1.
- **Chunk 3 (after that): Per-type dashboard tiles.** Each role's home tile surfaces the right CTA based on resolver output. Depends on chunk 1.

Each chunk ships behind its own flag so we can roll back independently.

## Account type → permission mapping

| account_type | Permission scope (chunks 1+) |
|---|---|
| `player` | Read/write own stamps; dispute own stamps |
| `parent` | Read/write managed kids' stamps; dispute on their behalf |
| `coach` | Stamp players via shared `team_members`; dispute own-team stamps |
| `scout` | Read public stamps; no write |
| `referee` | (chunk 2) claim games worked; attendance auto-attach; payment tracking |
| `rink_operator` | Adjudicate disputes on **claimed** rinks; same as today's claim-gated path |
| `league_admin` | Adjudicate disputes on events for leagues they admin |
| `team_admin` | Adjudicate disputes on events for teams they admin |
| `business` | Read public stamps; no write (B2B directory use case) |
| `fan` | Read public stamps; no write |

Plus the existing `profiles.role` staff column still grants system-wide admin access for backwards compat.

## Chunk 1 — Permission resolver

### Files

- **NEW** `src/lib/passport/14-authorization.ts` — the resolver.
- `src/lib/passport/02-feature-flags.ts` — add `STAMPS_PERMISSIONS_V2_ENABLED` flag (default false).
- `src/lib/passport/13-stamp-service.ts` — replace 3 `isStaff: boolean` parameters with `authz: AuthorizationContext` (or pass `callerUserId` and let the service call the resolver).
- `src/lib/passport/types.ts` — add `AuthorizationContext` type.
- `src/app/api/passport/stamp/[stampId]/adjudicate/route.ts` — call resolver instead of inline `profile.role === 'admin'` check.
- `src/app/admin/stamps/disputes/page.tsx` — drop `isStaff: true` hardcoded literal.
- `src/app/dashboard/manage/rink/[id]/disputes/page.tsx` — drop `isStaff: false` hardcoded literal; let resolver decide based on operator's claim status.

### AuthorizationContext shape

```ts
interface AuthorizationContext {
  userId: string;
  isStaff: boolean;                // profiles.role IN ('admin', 'super_admin') — system-wide
  isRinkOperator: {
    rinkIds: string[];             // approved claims on these rinks
  };
  isLeagueAdmin: {
    leagueIds: string[];           // leagues they admin (from team_workspaces or similar)
  };
  isTeamAdmin: {
    teamIds: string[];             // teams they admin
  };
  isReferee: boolean;              // chunk 2 will use this; today just exposed
  isCoach: {
    teamIds: string[];             // teams they coach via team_members
  };
  isParent: {
    managedUserIds: string[];      // managed_profiles rows they own
  };
}
```

### Service-layer decision tree (chunk 1)

Replacing the binary `isStaff` checks:

```
adjudicateStamp(target):
  if isStaff → ALLOW
  if target.rinkId ∈ isRinkOperator.rinkIds → ALLOW
  if target.venueId ∈ isRinkOperator.rinkIds (claim spans venue?) → defer to PR (not in v1)
  if target.eventId and event.leagueId ∈ isLeagueAdmin.leagueIds → ALLOW
  if target.eventId and event.teamId ∈ isTeamAdmin.teamIds → ALLOW
  → DENY (403)
```

For chunk 1, we only implement the rink-operator path (already exists, just refactored) and the staff path (already exists). League/team admin paths return DENY in chunk 1; they light up when chunk 3 (or a follow-up) wires `league_admin`/`team_admin` claims into the system.

That keeps chunk 1 truly additive: same behavior as today when the flag is off, same behavior as today when the flag is on (since league/team admin paths just return DENY either way, which matches current state).

### Flag behavior

- `STAMPS_PERMISSIONS_V2_ENABLED=false` (default): service uses old `isStaff: boolean` parameter signature. No resolver call. Bit-for-bit identical to today's behavior.
- `STAMPS_PERMISSIONS_V2_ENABLED=true`: service calls resolver internally based on `callerUserId`; `isStaff` parameter is ignored. Same external behavior (rink-operator and staff paths produce same results), but now structured for chunk 2/3 to extend.

### Why a flag and not a hard cutover

Per Rule (no name) in TOOLS.md: when introducing a permission model that touches every auth check, gate the cutover. If chunk 1 has a bug, flipping the flag back to false reverts to the binary check instantly. No migration to roll back. No data to clean up.

## Chunk 2 — Referee tools

**Not in this workstream doc — drafted later.** Depends on chunk 1 being merged and the flag flipped.

## Chunk 3 — Per-type dashboard tiles

**Not in this workstream doc — drafted later.** Depends on chunk 1 being merged.

## Open questions

1. **Where does "leagues I admin" come from?** `team_workspaces` is per-team; there's no `league_workspaces` table. Need to either reuse `team_workspaces` keyed on league entities (if the data model treats leagues as a workspace-type) or add a `league_admins` table. **Defer to chunk 3** — chunk 1 just exposes the type.

2. **Same question for teams.** `team_members` covers coaches and players; admins are probably in `team_workspaces.members` with a role. Need to confirm before chunk 3.

3. **Referee → game assignment.** Is it self-claim ("I worked this game"), assignment from a league/tournament director, or both? **Defer to chunk 2.**

4. **Referee payment tracking.** Stripe Connect? External (off-platform invoice)? Just a ledger? **Defer to chunk 2.**

## Verification (chunk 1)

- `npx tsc --noEmit` → exit 0
- `STAMPS_PERMISSIONS_V2_ENABLED=false`: every existing dispute path produces same response as before
- `STAMPS_PERMISSIONS_V2_ENABLED=true`: staff still sees `/admin/stamps/disputes`; approved rink operators still see their rink's disputes; unapproved users still get 403
- Manual test: log in as a user with `league_admin` account type → confirm they STILL get 403 on rink adjudication (since chunk 1 doesn't wire league admin yet)

## Risks

- **Resolver call adds a query per adjudication.** Mitigated: cache `AuthorizationContext` on the request scope; or join in a single query in the service layer. Chunk 2 will need this anyway.
- **`profile_account_types` is a join table; profile.role is a column.** Resolver must read both. Single roundtrip is feasible via a JOIN; can refactor in chunk 2 if perf matters.
- **Backwards compat.** The `isStaff: boolean` parameter stays in the type for chunk 1 to avoid breaking chunk 2/3 code paths that import the type. Just becomes unused when flag is on.