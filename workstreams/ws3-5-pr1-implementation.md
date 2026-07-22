# WS3.5 PR1 — Dispute Adjudication Schema — Implementation Journal

**Author:** KiloClaw
**Date:** 2026-07-22
**Status:** Feature-complete. Feature flag off; awaiting Arnel greenlight before merging to main.

## What this PR does

Adds the schema, RLS policies, feature flag, and types for the WS3.5
dispute adjudication workflow (operator + RinkStop staff queue to
uphold / overturn disputed stamps). Does NOT add the UI — that's PR2.

Production behavior is unchanged until `STAMPS_ADMIN_ENABLED=true` is
set in Vercel.

## Files changed

### `supabase/migrations/2026-07-22_stamps_dispute_schema.sql` (NEW)

Six sections:

1. **Extend `public.stamps.status` CHECK** to include `'rejected'`.
   Uses the same DO-block drop-constraint pattern as WS3 PR2.
   `rejected` is the terminal "this stamp will never count" state after
   a dispute is upheld.

2. **Add `rejected_at`, `rejected_by_user_id`, `rejected_reason` columns
   to `public.stamps`.** All nullable. Plus a CHECK constraint enforcing
   `rejected_at IS NULL OR (rejected_by_user_id IS NOT NULL AND status='rejected')`
   so we never have inconsistent rejected rows.
   Six new partial indexes (3 rejected, 3 disputed) for the queue
   query patterns per target type.

3. **Extend `public.scan_events.outcome` CHECK** with `'dispute_upheld'`
   and `'dispute_overturned'`. Written by service-role from the
   adjudication endpoint in PR2.

4. **Extend `public.consumer_notifications.kind` CHECK** with three new
   values:
   - `stamp_disputed` → operator inbox (someone disputed a stamp at my venue)
   - `dispute_upheld` → stamper inbox (your dispute was upheld, stamp gone)
   - `dispute_overturned` → stamper inbox (dispute was overturned, stamp counts)

5. **RLS policies on `public.stamps`:**
   - `stamps_operator_dispute_read`: operator sees disputed stamps
     against their claimed rink targets. (Venue/event disputes go through
     the staff policy since venues don't have a claims table in WS3 v1 —
     admin-curated per spec Decision 1.)
   - `stamps_staff_dispute_read`: Clerk role='admin' sees all disputed
     and rejected stamps across all targets.

   Both policies gated behind `STAMPS_ADMIN_ENABLED` at the application
   layer; the RLS policy itself is unconditional — env flag gates which
   routes the operator can reach, which transitively gates which reads
   happen.

6. **Idempotency footer** documenting that re-running this migration
   is safe (every ALTER TABLE ADD uses IF NOT EXISTS, every CHECK
   extension uses drop-constraint pattern, every RLS policy uses DROP IF EXISTS).

### `src/lib/passport/02-feature-flags.ts`

Added `STAMPS_ADMIN_ENABLED` to PASSPORT_FLAGS (default `false`).
Added `isStampsAdminEnabled()` helper that requires both `isStampsEnabled()`
AND `STAMPS_ADMIN_ENABLED=true`. Per WS3 spec, dispute workflow is
meaningless without stamps.

### `src/lib/passport/index.ts`

Re-exported `isStampsAdminEnabled` from the barrel so PR2 consumers
can `import { isStampsAdminEnabled } from '@/lib/passport'`.

### `src/lib/passport/types.ts`

- `StampStatus` extended with `'rejected'`.
- `StampRecord` extended with `rejectedAt`, `rejectedByUserId`, `rejectedReason`
  (all nullable).
- `ScanEventRecord.outcome` extended with `'dispute_upheld'` and
  `'dispute_overturned'`.
- New `AdjudicateStampRequest` interface for the PR2 endpoint body.
- New `DisputedStampRow` interface for the PR2 queue list response.
- New `DisputeNotificationKind` type matching the migration enum.

### `src/lib/passport/13-stamp-service.ts`

Extended `stampRowToRecord()` mapper to read the three new rejected_*
columns off the raw supabase row. Default null. No new methods added —
those land in PR2.

## What this PR does NOT do

- No PR2 UI (operator dispute queue page)
- No PR2 POST endpoint (`/api/passport/stamp/[stampId]/adjudicate`)
- No PR2 notification writer helper (uses existing
  `consumerNotifications` insert pattern, planned in PR4)
- No PR3 admin staff queue page
- No PR5 Family Hub picker
- No PR6 multi-passport service validation

## Pre-flight checks done

- `tsc --noEmit` exits 0 after all type changes.
- Migration file has been inspected line-by-line for:
  - All `ADD COLUMN IF NOT EXISTS` (no destructive changes)
  - All CHECK extensions via DO-block drop pattern
  - RLS policies use DROP IF EXISTS + CREATE
  - No DROP, no ALTER on existing columns
  - WS3 Rule 9 honored — no existing FKs modified

## How to verify after merge to main

1. Apply migration via Management API (same pattern as
   `_HAND_APPLIED.md` 2026-07-22 entry).
2. Verify column count on `public.stamps` increased by 3.
3. Verify CHECK constraints on `public.stamps.status` and
   `public.scan_events.outcome` include new values.
4. Verify CHECK constraint on `public.consumer_notifications.kind`
   includes the 3 new values.
5. Verify RLS policies `stamps_operator_dispute_read` and
   `stamps_staff_dispute_read` exist via `pg_policies`.
6. Verify indexes via `pg_indexes`.
7. `tsc --noEmit` clean on main.

## Rollback plan

```sql
-- Drop new columns
ALTER TABLE public.stamps
  DROP COLUMN IF EXISTS rejected_at,
  DROP COLUMN IF EXISTS rejected_by_user_id,
  DROP COLUMN IF EXISTS rejected_reason;

-- Drop new RLS policies
DROP POLICY IF EXISTS "stamps_operator_dispute_read" ON public.stamps;
DROP POLICY IF EXISTS "stamps_staff_dispute_read" ON public.stamps;

-- Drop new indexes
DROP INDEX IF EXISTS public.stamps_rejected_status_idx;
DROP INDEX IF EXISTS public.stamps_rejected_venue_idx;
DROP INDEX IF EXISTS public.stamps_rejected_event_idx;
DROP INDEX IF EXISTS public.stamps_disputed_target_rink_idx;
DROP INDEX IF EXISTS public.stamps_disputed_target_venue_idx;
DROP INDEX IF EXISTS public.stamps_disputed_target_event_idx;

-- Revert CHECK constraints to their WS3 PR1/2 values
-- (Requires recreating without 'rejected' / 'dispute_upheld' / 'dispute_overturned'.
-- Use the DO-block drop pattern from the migration in reverse.)
```

Application rollback: revert the commit. No data loss — existing rows
are unchanged because the migration only ADDS columns/enum values.

## Open questions resolved

Per Arnel's "yes permission to start" msg #42659, defaults accepted:

1. ✅ Notification shape: same as existing consumer_notifications (badge +
   inbox page).
2. ✅ Reject reason: optional, stored but not surfaced to stamper in v1.
3. ✅ Admin role: use existing Clerk `role: 'admin'` (only Arnel today).
4. ✅ Multi-stamp eligibility: 2+ eligible Passports (own + managed kids).
5. ✅ Coach flow: multi-stamp picker hidden when in coach mode.

## What's next (PR2)

- `/api/passport/stamp/[stampId]/adjudicate` POST endpoint
- `/dashboard/manage/[entityType]/[id]/disputes` operator page
- Service-layer `listDisputedStampsForOperator()` method
- `adjudicateStamp()` method that does status transition + scan_events
  log + notifications
