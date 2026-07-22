# WS3.5 PR2 — Operator Dispute Queue — Implementation Journal

**Author:** KiloClaw
**Date:** 2026-07-22
**Status:** Feature-complete. Feature flag off; awaiting Arnel greenlight.

## What this PR does

Operator-dispute-queue UI for rink disputes + the POST adjudication
endpoint. Operators can see which stamps at their rink have been
flagged as disputed, and either uphold (reject the stamp permanently)
or overturn (confirm the stamp).

Venues and events are staff-only in v1 (per WS3.5 spec); the staff
queue is PR3.

## Files changed

### `src/lib/passport/13-stamp-service.ts`

Two new public methods + three new private helpers:

**`listDisputedStampsForOperator(params)`** — paginated list (limit
1-200, default 50) of disputed stamps against one rink target.
Authorization: caller must have an approved claim on the rink (or
be staff). For venue/event targets only staff are accepted.

Enriches each row with:
- Stamper display name + actor role (from `profiles` table)
- Target context (rink/venue/event name + city + country)
- Dispute reason (most-recent `scan_events` row with
  `outcome='flagged_dispute'` for that stamp, parsed from
  `details.reason`)
- Disputed-at time (falls back to `stamped_at` because we can't
  pinpoint the dispute timestamp from the audit trail alone — see
  "open issue" below)

Returns `DisputedStampRow[]` (the type from PR1).

**`adjudicateStamp(params)`** — apply `uphold` or `overturn` to a
disputed stamp. Atomic at the service-layer level:

1. Load stamp + authorization check (operator on target, or staff).
2. Apply status transition:
   - `uphold`: `status='disputed' → 'rejected'`, plus
     `rejected_at`, `rejected_by_user_id`, optional
     `rejected_reason`.
   - `overturn`: `status='disputed' → 'confirmed'`.
3. Write scan_events audit row with `outcome='dispute_upheld'` or
   `'dispute_overturned'`.
4. Send inbox notification to the stamper (subject_user_id preferred,
   falls back to actor_user_id) with kind matching the outcome.
   Self-adjudication is silently skipped (don't notify yourself).

Idempotent on re-call. Throws `StampNotFoundError` /
`StampForbiddenError` for the route to translate to HTTP codes.

**Private helpers** (all `private` on `StampService`):
- `writeAdjudicationScanEvent()` — audit row writer, mirrors the
  `writeScanEventForDispute()` pattern but with the new outcomes.
- `notifyStamperOnAdjudication()` — best-effort inbox notification
  writer via `consumer_notifications` insert with
  `(user_id, source_key, kind)` UNIQUE for idempotency.
- `resolveTargetName()` — small helper for "stamp at Rink X"
  notifications; deduplicates the rink/venue/event lookup chain
  that's already in `writeScanEventForDispute`.

### `src/app/api/passport/stamp/[stampId]/adjudicate/route.ts` (NEW)

POST endpoint that:
1. Gates on `isStampsAdminEnabled()` (returns 403 if off).
2. Rate-limits at 60/min per IP.
3. Validates Clerk auth, body shape (`action` ∈ `{uphold, overturn}`,
   optional `reason` ≤ 1000 chars with control chars stripped).
4. Resolves `isStaff` from `profiles.role`.
5. Calls `stampService.adjudicateStamp()`.
6. Translates errors to HTTP codes:
   - `StampNotFoundError` → 404 `{error: 'stamp_not_found'}`
   - `StampForbiddenError` → 403 `{error: 'forbidden', message}`
   - Other → 500 `{error: 'server_error'}`

### `src/app/dashboard/manage/rink/[id]/disputes/page.tsx` (NEW)

Server component. Mirrors the existing
`/dashboard/manage/rink/[id]/page.tsx` layout: header card +
content area, with a "back to rink" link and a similar guard-band
when the caller doesn't have an approved claim.

Reads disputed stamps via the service-layer method, hands them off
to the client component for action handling.

Behavior when flag is off:
- Renders a "Dispute adjudication is currently disabled" notice.
- Shows the rink header so support can link operators to the page
  even before the flag is on.

Behavior when flag is on:
- 0 disputes → success empty-state ("No disputed stamps").
- 1+ disputes → rendered through `DisputeActions` client component.

### `src/app/dashboard/manage/rink/[id]/disputes/dispute-actions.tsx` (NEW)

Client wrapper. One card per dispute row with:
- Stamper name + role + timestamp
- Dispute reason quote (if present)
- Optional 1000-char textarea for the operator's reason
- Two action buttons (overturn: teal; uphold: red)
- After adjudication: a "Rejected" or "Confirmed" pill replaces
  the buttons (visual confirmation). The page revalidates via
  `router.refresh()` so the row drops from the queue.

Disabled states: while a request is in flight, both buttons for
that row are disabled. The server is also idempotent so concurrent
clicks for the same stamp return 200 without side effects.

## Out of scope (per spec)

- ✅ Pagination — single-digit disputes per rink in v1; revisit if
  any rink sees 100+ active disputes.
- ✅ Venue/event operator queue — venues don't have a `claims` row,
  events are admin-curated. Both go through the staff queue
  (PR3).
- ✅ Free-text reason surfaced to stamper — per spec open question
  #2 default ("don't require or surface operator free-text in v1").
  The `stamps.rejected_reason` column is captured for future use.
- ✅ Notification copy polish — generic placeholders today. PR4
  (notifications PR) builds the full templates.

## Open issue surfaced during implementation

The `disputeFlaggedAt` field on `DisputedStampRow` falls back to
`stamped_at` because we can't pinpoint the dispute-filed time from
the audit trail alone. `scan_events.created_at` IS available, but we
don't have a direct index from `stamp_id` to the dispute scan_event
row without scanning the whole table for matching jsonb details.

Two options for PR4+:
1. Add a `disputed_at` column to `stamps` (set when the dispute is
   filed via PR4 disputeStamp update).
2. Add a denormalized `latest_dispute_scan_event_id` on `stamps`
   that the dispute endpoint writes.

Low priority — the UI sorts by stampedAt which is close enough for
the operator's workflow. Will not block this PR.

## tsc + Verification done

- `tsc --noEmit` exits 0.
- All routes gated on `isStampsAdminEnabled()` — flag off means
  no behavior change.
- All authorization paths checked: operator must have an approved
  claim; staff can act on any rink; venue/event access is staff-only.
- Idempotency: re-adjudicating an already-adjudicated stamp is a
  no-op (server) and the client renders a "Rejected/Confirmed"
  pill so the user sees feedback without depending on the network.

## How to verify after merge to main

1. Apply no migrations (PR2 has no SQL).
2. `tsc --noEmit` clean.
3. After deploy, with `STAMPS_ENABLED=true && STAMPS_ADMIN_ENABLED=true`:
   - Flag a stamp via `/api/passport/stamp/[stampId]/dispute`.
   - Sign in as the operator and visit
     `/dashboard/manage/rink/[id]/disputes`. The dispute appears.
   - Click "Uphold" — row disappears, `stamps.status='rejected'`,
     stamper gets `dispute_upheld` inbox row.
   - Click "Overturn" on another — row disappears,
     `stamps.status='confirmed'`, stamper gets
     `dispute_overturned` inbox row.

## Rollback

Revert the commit. No DB changes to roll back (PR1 already shipped
the schema; PR2 only adds code).

## What's next (PR3)

- `/admin/stamps/disputes` page (staff-only, all targets)
- AdminActions client component (mirror of `DisputeActions` but
  with staff bulk-action affordances)
- `/api/admin/stamps/disputes/...` endpoints if separate audit
  channel needed

Estimated 1 day of work. Same gating pattern.
