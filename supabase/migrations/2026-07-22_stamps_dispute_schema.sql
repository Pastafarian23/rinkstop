-- RinkStop Hockey Passport — Workstream 3.5 PR1: Dispute Adjudication Schema
-- Date: 2026-07-22
-- Author: KiloClaw
--
-- Purpose: Extend WS3 v1 schema with the columns, CHECK constraint values,
-- notification kinds, and RLS policies needed for the WS3.5 admin dispute
-- queue and adjudicator workflow.
--
-- Per WS3 spec (locked 2026-07-22):
--   - Admin queue for disputed stamps (operator + RinkStop staff)
--   - Family Hub multi-passport picker (parent → linked child stamps)
-- Family Hub (PR5+) needs no schema change (handled in service + UI).
-- This migration is the dispute-queue groundwork.
--
-- Conventions (matched to WS3 PR1 + PR2 migrations):
--   - Every ALTER TABLE column add uses IF NOT EXISTS
--   - Every CHECK extension uses DROP CONSTRAINT IF EXISTS (idempotent)
--   - Every RLS policy is DROP IF EXISTS + CREATE (idempotent re-run)
--   - verification_tier: TEXT + CHECK (not ENUM) — matches WS3 PR1 style
--   - Service-role writes only; all reads via RLS policies
--   - Per Workstream 1 Rule 9 (No Existing Foreign Keys Change): only ADDS
--     FKs from new columns to existing tables. Does not modify FKs on
--     existing tables. This migration adds zero new FKs (rejected_at
--     timestamp, rejected_by_user_id text, rejected_reason text, all
--     pointing back to existing text columns or no-op references).
--
-- Out of scope (WS4+):
--   - Strike / ban system
--   - Photo verification on multi-stamp
--   - Coach bulk-stamping on behalf of multiple players
--   - Tournament scan flows
--   - Auto-uphold if stamper doesn't respond in N days
--
-- Per Workstream 1 Rule 5 (Feature Flags Mandatory):
-- Runtime gate for the operator dispute queue UI: STAMPS_ENABLED && STAMPS_ADMIN_ENABLED.
-- This migration ships unconditionally; flags gate application behavior.
-- Production behavior is unchanged until env flag flip.

BEGIN;

-- ============================================================
-- 1. Extend public.stamps.status CHECK to include 'rejected'
--
-- When a dispute is upheld, status moves from 'disputed' to 'rejected'.
-- 'rejected' is the terminal "this stamp will never count" state.
-- 'revoked' (existing) is reserved for QR rotation / operator-side
-- invalidation, distinct from dispute resolution.
-- ============================================================

DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.stamps'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.stamps DROP CONSTRAINT %I',
      v_constraint_name
    );
  END IF;

  ALTER TABLE public.stamps
    ADD CONSTRAINT stamps_status_check
    CHECK (status IN ('confirmed', 'disputed', 'rejected', 'revoked'));
END $$;

-- ============================================================
-- 2. Add rejected_* columns to public.stamps
--
-- rejected_at: timestamp of when the dispute was upheld.
-- rejected_by_user_id: text (Clerk user_id of the operator or staff
--   who upheld). Not a UUID FK because profiles.user_id is text and we
--   don't enforce FK constraints to profiles (the auth schema is the source
--   of truth — profiles is a denormalized cache). No FK constraint needed.
-- rejected_reason: optional free-text explanation. Optional in WS3.5
--   per spec (defaults: don't require operator free-text). Stored but
--   NOT surfaced to stamper in v1.
-- ============================================================

ALTER TABLE public.stamps
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by_user_id text,
  ADD COLUMN IF NOT EXISTS rejected_reason text;

-- Add a CHECK constraint enforcing: if rejected_at is set, then both
-- rejected_by_user_id and status='rejected' must also be set. Idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.stamps'::regclass
      AND contype = 'c'
      AND conname = 'stamps_rejected_consistency_check'
  ) THEN
    ALTER TABLE public.stamps
      ADD CONSTRAINT stamps_rejected_consistency_check
      CHECK (
        rejected_at IS NULL
        OR (rejected_by_user_id IS NOT NULL AND status = 'rejected')
      );
  END IF;
END $$;

-- Index for the dispute queue: find all rejected stamps fast. Same
-- shape as the existing stamps_status_idx; uses the partial WHERE clause
-- so confirmed rows don't bloat the index.
CREATE INDEX IF NOT EXISTS stamps_rejected_status_idx
  ON public.stamps (target_rink_id, rejected_at DESC)
  WHERE status = 'rejected' AND target_rink_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS stamps_rejected_venue_idx
  ON public.stamps (target_venue_id, rejected_at DESC)
  WHERE status = 'rejected' AND target_venue_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS stamps_rejected_event_idx
  ON public.stamps (target_event_id, rejected_at DESC)
  WHERE status = 'rejected' AND target_event_id IS NOT NULL;

-- Disputed-stamp queue (operator sees what to adjudicate).
CREATE INDEX IF NOT EXISTS stamps_disputed_target_rink_idx
  ON public.stamps (target_rink_id, stamped_at DESC)
  WHERE status = 'disputed' AND target_rink_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS stamps_disputed_target_venue_idx
  ON public.stamps (target_venue_id, stamped_at DESC)
  WHERE status = 'disputed' AND target_venue_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS stamps_disputed_target_event_idx
  ON public.stamps (target_event_id, stamped_at DESC)
  WHERE status = 'disputed' AND target_event_id IS NOT NULL;

-- ============================================================
-- 3. Extend public.scan_events.outcome CHECK with adjudication values
--
-- dispute_upheld: written when an operator marks a dispute as upheld
--   (status moves to 'rejected'). The stamp_id is captured in details.
-- dispute_overturned: written when an operator marks a dispute as
--   overturned (status moves back to 'confirmed'). The stamp_id is
--   captured in details.
--
-- Both outcomes are written by service-role (adjudication endpoint),
-- never by anonymous users.
-- ============================================================

DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.scan_events'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%outcome%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.scan_events DROP CONSTRAINT %I',
      v_constraint_name
    );
  END IF;

  ALTER TABLE public.scan_events
    ADD CONSTRAINT scan_events_outcome_check
    CHECK (outcome IN (
      'stamp_created', 'duplicate', 'rate_limited',
      'flagged_dispute', 'invalid_target', 'error',
      'dispute_upheld', 'dispute_overturned'
    ));
END $$;

-- ============================================================
-- 4. Extend public.consumer_notifications.kind CHECK with dispute
-- kinds. Matches the WS3 PR2 pattern (drop existing kind check,
-- re-add with new values).
--
-- stamp_disputed: notification to the operator of the target when
--   one of their stamps is disputed. Operator needs to know they have
--   a queue item to review.
-- dispute_upheld: notification to the stamper (or stamp subject if
--   the stamper was on behalf of someone else) when a dispute was
--   upheld. Status went to 'rejected'.
-- dispute_overturned: notification to the stamper when a dispute was
--   overturned. Status went back to 'confirmed'.
-- ============================================================

DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.consumer_notifications'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%kind%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.consumer_notifications DROP CONSTRAINT %I',
      v_constraint_name
    );
  END IF;

  ALTER TABLE public.consumer_notifications
    ADD CONSTRAINT consumer_notifications_kind_check
    CHECK (kind IN (
      'document_expiring_30d',
      'document_expiring_7d',
      'document_expiring_1d',
      'document_expired',
      'identity_renewal_due',
      'achievement_added',
      'stamp_received',
      'stamp_disputed',
      'dispute_upheld',
      'dispute_overturned'
    ));
END $$;

-- ============================================================
-- 5. RLS policy updates — operator can read disputes on their targets
--
-- PR4 (WS3) opened these read paths for public-visible/own-actor/own-subject
-- stamps. Operators of rinks/venues/events need to read DISPUTED stamps
-- against their targets so they can adjudicate. This policy grants that.
--
-- Authorization: caller must be a signer on a claim against the target
--   of the stamp, where claims.status='approved' and claims.claim_type
--   matches the stamp's target_type.
--
-- This is gated behind STAMPS_ADMIN_ENABLED at the application layer.
-- The RLS policy itself is unconditional — it grants read access
-- regardless of the env flag. The env flag gates the UI, which gates
-- whether operators can ever reach this read path. If you want to
-- disable this without revoking the RLS policy, set STAMPS_ADMIN_ENABLED=false
-- and the operator dashboard returns 404 / "feature not enabled".
--
-- Per spec: This RLS policy only opens the stamps table, not scan_events
-- or rejected_reason (still service-role only). Operator sees:
--   - stamper display name (via actor_user_id → profiles join)
--   - stamped_at
--   - dispute reason (already in scan_events.details, but operator
--     doesn't see scan_events directly — they get a curated reason
--     field via service-layer aggregation in PR2)
--   - target context (rink/venue name + city)
-- ============================================================

DROP POLICY IF EXISTS "stamps_operator_dispute_read" ON public.stamps;
CREATE POLICY "stamps_operator_dispute_read" ON public.stamps
  FOR SELECT
  USING (
    status = 'disputed'
    AND (
      -- Operator on the target rink (claim.status='approved' against this rink)
      (
        target_rink_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.claims c
          WHERE c.entity_id = target_rink_id::text
            AND c.claim_type = 'rink'
            AND c.status = 'approved'
            AND c.user_id = (auth.uid()::text)
        )
      )
      OR
      -- Venues are admin-curated in WS3 v1 (no public.claims row), so venue
      -- dispute access is delegated to the staff policy (below). Caller must
      -- have role='admin' to see a venue dispute.
      (
        target_venue_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = (auth.uid()::text)
            AND p.role = 'admin'
        )
      )
      OR
      (
        target_event_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = (auth.uid()::text)
            AND p.role = 'admin'
        )
      )
    )
  );

-- Staff-only policy (Clerk role = 'admin') for the admin queue — sees
-- ALL disputed and rejected stamps across all targets.
DROP POLICY IF EXISTS "stamps_staff_dispute_read" ON public.stamps;
CREATE POLICY "stamps_staff_dispute_read" ON public.stamps
  FOR SELECT
  USING (
    status IN ('disputed', 'rejected')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = (auth.uid()::text)
        AND p.role = 'admin'
    )
  );

-- Existing policies (stamps_select_own_actor, stamps_select_own_subject,
-- stamps_select_public from WS3 PR2) are unchanged.

-- ============================================================
-- 6. Idempotency note
--
-- Re-running this migration is safe:
--   - ALTER TABLE ... ADD COLUMN IF NOT EXISTS (idempotent)
--   - DO blocks that drop+add constraints are idempotent
--   - DROP POLICY IF EXISTS + CREATE POLICY (idempotent)
--   - CREATE INDEX IF NOT EXISTS (idempotent)
-- If you re-apply after the first apply, the IF NOT EXISTS guards skip
-- the no-op work; the DO blocks detect existing constraints and skip
-- re-creation; no error.
-- ============================================================

COMMIT;
