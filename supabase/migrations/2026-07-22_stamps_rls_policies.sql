-- RinkStop Hockey Passport — Workstream 3 PR2: RLS Policies + Notification Kind
-- Date: 2026-07-22
-- Author: KiloClaw (per Arnel directive; plan in workstreams/workstream-3-stamps.md)
--
-- Purpose: Add the row-level-security policies that WS3 PR2 needs, plus the
-- 'stamp_received' notification kind so coach→player stamps surface in the
-- /dashboard/notifications inbox. PR1 created the tables with RLS enabled
-- but no policies (so reads/writes were denied except service_role). This
-- migration opens the paths the PR2 endpoints need.
--
-- Per Workstream 1 Rule 5 (Feature Flags Mandatory): runtime gate is
-- PASSPORT_ENABLED && STAMPS_ENABLED. Migration itself ships unconditionally;
-- flags gate app behavior — meaning even with these policies in place, no
-- /stamp/[qrIdentifier] page or /api/passport/stamp handler exists unless
-- STAMPS_ENABLED is on.
--
-- Per Rule 9 (No Existing Foreign Keys Change): only ADDS FKs from new tables
-- TO existing tables. Does not modify FKs on existing tables.
--
-- Policies summary:
--   - public.stamps: holder reads own actor stamps + own subject stamps;
--                    service-role writes (via supabaseAdmin client);
--                    visibility=public stamps are readable by anyone
--                    (powers future public Passport attendance aggregates in PR3).
--   - public.venues / public.venue_events: public read (venues and events are
--                                          not PII — they are directory entries);
--                                          service-role writes.
--   - public.qr_revocations / public.scan_events: service-role only. Internal
--                                                 audit, never API-exposed in v1.
--   - public.consumer_notifications.kind CHECK: extend to include 'stamp_received'.

BEGIN;

-- ============================================================
-- 1. Extend consumer_notifications.kind CHECK to include 'stamp_received'
-- ============================================================
-- Postgres CHECK constraints can't be ALTER-ed in place; the safe pattern is
-- DROP + ADD. The constraint name is the auto-generated one from
-- 2026-07-09_consumer_notifications.sql — Supabase uses
-- "<table>_<column>_check" by default for inline CHECKs. Verify by inspecting
-- the catalog; if your project uses a different name, update accordingly.
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
      'stamp_received'
    ));
END $$;

-- ============================================================
-- 2. RLS policies on public.venues
-- ============================================================
-- Venues are directory entries (tournament hotels, training facilities, school
-- gyms). They are NOT PII — public read is the default. Only service-role
-- writes in v1 (admin-curated; no self-serve mint per WS3 Decision 1).

DROP POLICY IF EXISTS "venues_public_read" ON public.venues;
CREATE POLICY "venues_public_read" ON public.venues
  FOR SELECT
  USING (status = 'active');

-- No INSERT / UPDATE / DELETE policies — service_role bypasses RLS.

-- ============================================================
-- 3. RLS policies on public.venue_events
-- ============================================================
DROP POLICY IF EXISTS "venue_events_public_read" ON public.venue_events;
CREATE POLICY "venue_events_public_read" ON public.venue_events
  FOR SELECT
  USING (status = 'active');

-- No write policies — service_role bypasses RLS.

-- ============================================================
-- 4. RLS policies on public.stamps
-- ============================================================
-- Holder-centric privacy model (per WS3 plan):
--   - A user can read stamps where they are the actor (their own scans).
--   - A user can read stamps where they are the subject (someone scanned
--     THEM — coach stamping a player). Subject_user_id is never publicly
--     surfaced; this policy exists so the player sees coach-stamped rows
--     and can dispute them (PR4).
--   - Public-visibility stamps are readable by anyone (powers public
--     Passport attendance aggregates in PR3).
--   - All writes go through service-role (supabaseAdmin client). The API
--     route validates actor / subject / target before INSERT.

DROP POLICY IF EXISTS "stamps_select_own_actor" ON public.stamps;
CREATE POLICY "stamps_select_own_actor" ON public.stamps
  FOR SELECT
  USING (actor_user_id = current_user_id());

DROP POLICY IF EXISTS "stamps_select_own_subject" ON public.stamps;
CREATE POLICY "stamps_select_own_subject" ON public.stamps
  FOR SELECT
  USING (subject_user_id = current_user_id());

DROP POLICY IF EXISTS "stamps_select_public" ON public.stamps;
CREATE POLICY "stamps_select_public" ON public.stamps
  FOR SELECT
  USING (visibility = 'public');

-- No INSERT / UPDATE / DELETE policies — service_role bypasses RLS.
-- Disputes (PR4) will add a holder UPDATE policy scoped to status flips
-- on rows where the holder is the actor or subject.

-- ============================================================
-- 5. RLS policies on public.qr_revocations
-- ============================================================
-- Internal audit table. Never API-exposed in v1. Service-role only.

-- No SELECT policy — owner reads via service_role. No INSERT/UPDATE/DELETE
-- policies — service_role bypasses RLS. This means the table is effectively
-- unreadable to authenticated users, which is the intended v1 posture.

-- ============================================================
-- 6. RLS policies on public.scan_events
-- ============================================================
-- Internal audit table. Never API-exposed in v1. Service-role only.

-- Same posture as qr_revocations: no policies = unreadable to non-service.

COMMIT;

-- ============================================================
-- End of migration
-- ============================================================