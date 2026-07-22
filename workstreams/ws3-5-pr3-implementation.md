# WS3.5 PR3 — Admin Staff Dispute Queue — Implementation Journal

**Author:** KiloClaw
**Date:** 2026-07-22
**Status:** Feature-complete. Feature flag off; awaiting Arnel greenlight before merging (PR2+PR3 batch).

## What this PR does

Cross-target dispute queue for RinkStop staff (Clerk role='admin' or
OWNER_EMAILS bypass). Lists ALL disputed stamps across all targets
(rinks, venues, events) with a target-type filter, and lets staff
adjudicate any row. Reuses the exact same POST endpoint as the
operator queue (PR2).

## Files changed

### `src/lib/passport/13-stamp-service.ts`

**`listDisputedStampsForStaff(params)`** — paginated cross-target
dispute list (limit 1-500, default 100). Authorization: caller must
be staff (PR2's `listDisputedStampsForOperator` requires a target; this
one doesn't, because staff need cross-target visibility).

Accepts optional `targetType` and `targetId` filters. When no filter,
returns all disputed stamps system-wide.

Returns rows enriched with:
- `targetType`, `targetId` — so the UI can deep-link
- `targetDisplay` — "United Center" or "SM Skating – SM Megamall" or
  "U14 Tryout @ Johnny's IceHouse" (event names are concatenated
  with parent name for context)
- `targetLocation` — "Chicago, IL" or "Mandaluyong, Philippines"
- Stamper display name + actor role (from `profiles`)
- Dispute reason + flag timestamp (from most-recent `scan_events`
  row with `outcome='flagged_dispute'`)

Performance: parallel batch enrichment, single roundtrip per
dependency (rinks, venues, venue_events, profiles, scan_events).

### `src/app/admin/stamps/disputes/page.tsx` (NEW)

Server component. Auth: `requireAdmin()` (the canonical admin guard
that checks Clerk publicMetadata.role + OWNER_EMAILS bypass + profiles.role
fallback). Filter chips via search params (`?targetType=rink|venue|event`).
Pagination via `?offset=N`.

When `STAMPS_ADMIN_ENABLED=false`, renders a "feature disabled"
notice instead of the queue. When the flag is on but no disputes
exist, renders a friendly empty state ("No disputed stamps" or
"No rink disputes right now" depending on filter).

### `src/app/admin/stamps/disputes/staff-dispute-actions.tsx` (NEW)

Client wrapper. Mirrors the PR2 `DisputeActions` UX with two
additions specific to staff:
- Target-type badge (color-coded: rink=blue, venue=purple, event=orange)
- Target name + city/country as a header line above each row

Same POST endpoint, same response handling, same idempotency pattern.

### `src/components/AdminShell.tsx`

One-line addition: `{ href: '/admin/stamps/disputes', label: 'Disputes', icon: '⚖️' }`
to the NAV array so staff can navigate here from the admin shell.

## Out of scope (per spec)

- Bulk adjudication — single-row workflow only in v1. WS4+ scope.
- Cross-rink fraud-pattern detection — would need aggregation by
  actor_user_id across many disputes. WS4+ scope.
- Staff notes per adjudication — current model stores the operator's
  reason in `stamps.rejected_reason` but doesn't surface a separate
  staff-note field. Could add later.
- Real-time queue updates (websocket/polling) — uses `router.refresh()`
  after adjudication, which is fine for v1 volume.

## Smoke-test path (post-deploy + flag flip)

1. Create 2 disputed stamps in prod (different targets: rink + venue
   + event). The existing `/api/passport/stamp/[stampId]/dispute`
   endpoint can do this with a valid clerk session acting as each
   stamp's subject.
2. Sign in as Arnel → `/admin/stamps/disputes` → see all 3 rows.
3. Filter "Venues" → see only the venue dispute.
4. Click "Uphold" on the rink row → row disappears, stamp →
   `rejected`, stamper gets `dispute_upheld`.
5. Click "Overturn" on the venue row → same shape, becomes
   `confirmed`.
6. Event dispute remains in queue (untouched).
7. After all adjudicated: empty state with "system-wide queue is clear".

## How this composes with PR1 + PR2

- PR1 added the schema (`rejected_*` columns, `rejected` status,
  `dispute_*` notification kinds, `stamps_operator_dispute_read` +
  `stamps_staff_dispute_read` RLS policies).
- PR2 added the operator queue + adjudication endpoint + service
  methods (`listDisputedStampsForOperator`, `adjudicateStamp`).
- PR3 (this) adds the staff queue view that spans all targets and
  shares the same adjudication endpoint.

The PR2 endpoint is staff-or-operator agnostic at the URL level
(it routes based on the `isStaff` lookup inside the handler). No
new endpoint in PR3.

## tsc + verification done

- `tsc --noEmit` exits 0.
- No DB migrations (PR1 + PR2 cover everything).
- All routes gated on `isStampsAdminEnabled()` — flag off means
  no behavior change.
- Authorization: `requireAdmin()` for the page, `isStaff=true`
  passed explicitly to the service-layer method. Throws
  `StampForbiddenError` if a non-staff caller reaches the method.

## Rollback

Revert the commit. No DB changes to roll back.

## Merge plan

Per Arnel's instruction (msg #42757): "merge together later". PR3
was branched from PR2's branch (`ws3-5-pr2-dispute-queue-ui`) so
both PRs are stacked. Merge order:
1. Merge PR #35 (PR2) into main first.
2. Merge PR #36 (this PR) into main.

After both merge, `STAMPS_ADMIN_ENABLED=true` becomes live-ready
in one flag flip.
