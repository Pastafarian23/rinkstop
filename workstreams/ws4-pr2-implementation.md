# WS4 Chunk 2 — Referee Tools — Implementation Journal

**Author:** KiloClaw
**Date:** 2026-07-22
**Branch:** `ws4-pr2-referee-tools`
**Status:** Feature-complete. tsc clean. Feature flag off; awaiting Arnel greenlight.
**Depends on:** #43 (WS4 PR1) merged ✅.

## What chunk 2 ships

The first piece of the referee account-type experience: read-only dashboards for referees to see their assignments, attendance, and payments. Writes (check-in/check-out, mark-paid) come in a follow-up PR with their own flag.

### New tables (additive, no FK changes to existing)

- `public.referee_game_assignments` — links a referee (user) to a `venue_events` row with role + status.
- `public.referee_attendance` — per-assignment check-in/out state.
- `public.referee_payments` — payment ledger per assignment.

Migrations:
- `2026-07-22_referee_tools_schema.sql` — DDL + indexes.
- `2026-07-22_referee_tools_rls.sql` — RLS policies.

### New code

- `src/lib/passport/15-referee-service.ts` — read service (`listAssignmentsForReferee`, `getAssignmentForCaller`, `getAttendanceForAssignment`, `getPaymentForAssignment`, `listPaymentsForReferee`).
- `src/lib/passport/14-authorization.ts` — extended resolver with `referee: { assignedEventIds }` field.
- `src/lib/passport/types.ts` — `RefereeAssignment*`, `RefereeAttendance*`, `RefereePayment*` types.
- `src/lib/passport/02-feature-flags.ts` — new `REFEREE_TOOLS_ENABLED` flag (default false).

### New pages

- `/dashboard/referee` — overview with hero, summary stats, upcoming assignments (next 5), payment link.
- `/dashboard/referee/games` — full assignment list with pagination (replaces the old stub).
- `/dashboard/referee/games/[assignmentId]` — assignment detail with event meta, attendance, payment cards.
- `/dashboard/referee/payments` — payment ledger with summary tiles.

All four pages:
- Soft-gated on `REFEREE_TOOLS_ENABLED`. When off: render "feature not enabled" notice.
- Re-gated on `authz.isReferee`. When off: render "set your account type to Referee" notice.
- Sign-in required via Clerk session + `resolveCanonicalUserId`.

## Behavior matrix

| Caller | Flag | Account type | Page renders |
|---|---|---|---|
| Anonymous | n/a | n/a | Redirect to /login |
| Signed in, non-referee | OFF | anything | "Feature not enabled" |
| Signed in, non-referee | ON | anything | "Set your account type to Referee" |
| Signed in, referee | OFF | referee | "Feature not enabled" |
| Signed in, referee | ON | referee | Dashboard with data |

When `REFEREE_TOOLS_ENABLED=true`, behavior matches the spec. No data writes happen during chunk 2 — all pages are read-only.

## What chunk 2 does NOT ship (deferred)

- **Check-in/check-out UI** — the assignment detail page displays attendance state but has no buttons to flip it. Future PR adds a POST API route + client form.
- **Mark-paid UI** — same pattern as attendance.
- **Staff-side assignment creation** — staff need a UI to create assignments. Out of scope for chunk 2; staff can use the SQL dashboard or a future PR.
- **League/team admin can create assignments for events they own** — chunk 3 territory.
- **Notifications** — when a referee is assigned, when attendance is recorded, when payment is received. Chunk 3 or a follow-up.

All deferred items can be added without touching chunk 2's code.

## Risk analysis

- **Migration safety:** all three tables are new. No FK changes to existing tables. RLS is enabled but defaults to deny-all until policies are added. Migration runs are reversible (DROP TABLE) without affecting other data.
- **Resolver extended:** the new `referee.assignedEventIds` query only runs when the user has a `referee` account type. Non-referee users don't pay the cost. The added Promise.all entry only fires for the referee case.
- **Pages use supabaseAdmin:** all read paths go through the service role client. RLS policies exist as a backstop but aren't the primary gate (the service re-checks ownership in code). This matches the WS3.5 precedent.
- **Stub replacement:** `/dashboard/referee/games/page.tsx` was a StubPage placeholder. Replaced with real implementation. If the flag is off, both new and old paths render the "feature not enabled" notice.

## Verification

- `npx tsc --noEmit -p tsconfig.json` → exit 0 ✅
- Manual tests when flag is on (reviewer = Arnel):
  1. Sign in as a non-referee → `/dashboard/referee` shows "set account type" notice.
  2. Sign in as a referee with no assignments → empty-state.
  3. Insert a `referee_game_assignments` row via SQL for the referee user_id → assignment shows up on the dashboard and games list.
  4. Click into the assignment → detail page shows event + attendance (null) + payment (null).
  5. Insert `referee_attendance` + `referee_payments` rows → they render.
  6. Sign in as a different user (non-staff, non-assigned-referee) → 403 on the assignment detail page.

## Files changed

```
src/app/dashboard/referee/page.tsx                            | NEW (overview)
src/app/dashboard/referee/games/page.tsx                      | REPLACED stub
src/app/dashboard/referee/games/[assignmentId]/page.tsx       | NEW (detail)
src/app/dashboard/referee/payments/page.tsx                   | NEW (ledger)
src/lib/passport/02-feature-flags.ts                          | +REFEREE_TOOLS_ENABLED
src/lib/passport/14-authorization.ts                          | +referee.assignedEventIds
src/lib/passport/15-referee-service.ts                        | NEW
src/lib/passport/index.ts                                     | +barrel re-exports
src/lib/passport/types.ts                                     | +referee types
supabase/migrations/2026-07-22_referee_tools_schema.sql        | NEW
supabase/migrations/2026-07-22_referee_tools_rls.sql           | NEW
workstreams/ws4-pr2-implementation.md                         | NEW (this file)
```

Total: 4 modified, 8 new. ~1400 net insertions.

## Open questions for Arnel

1. **Where do referee assignments come from?** Right now there's no UI to create them. Options:
   - Staff creates via SQL for v1 (acceptable for <10 active refs)
   - Staff UI in a follow-up PR
   - League/team admins who own the event create them (chunk 3)
2. **Currency defaults to PHP.** Should I add a setting on profiles to let referees set their currency?
3. **Mileage / travel reimbursement.** Not modeled. Should be a separate column on `referee_payments` if you want it.

These can all be answered after chunk 2 ships. None of them block the read-side dashboard.