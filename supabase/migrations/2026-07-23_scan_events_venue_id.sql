-- ============================================================
-- scan_events: denormalize venue_id for RLS
-- ============================================================
-- Date: 2026-07-23
-- Problem: partner_passport_activity_rls.sql (2026-07-22) tried to create
--   scan_events_select_venue_operator by joining scan_events.qr_identifier
--   → stamps.qr_identifier. But stamps.qr_identifier does not exist.
--   The entire migration failed (error 42703), so neither the stamps nor
--   the scan_events policy was created.
--
-- Fix:
--   1. Add nullable venue_id column to scan_events.
--   2. Backfill using qr_identifier + details->>'target_type' to resolve
--      the owning venue via the appropriate parent table.
--   3. Recreate stamps_select_venue_operator (rolled back with the
--      rest of the 2026-07-22 migration).
--   4. Create scan_events_select_venue_operator using venue_id → venues.
--
-- venue_id sourcing at INSERT time (stamp-service writes it from target):
--   target_type='rink':   venue_id = ve.parent_venue_id
--     WHERE ve.parent_rink_id = resolved_rink_id  LIMIT 1
--   target_type='venue':  venue_id = target.venueId  (direct)
--   target_type='event':  venue_id = ve.parent_venue_id
--     WHERE ve.id = target.eventId  LIMIT 1
--
-- Safety:
--   IF NOT EXISTS / DROP IF EXISTS on every DDL statement
--   venue_id is nullable — no existing data invalidated
--   Backfill conditional on venue_id IS NULL (idempotent — re-runs are no-ops)
--   No DROP of existing columns or constraints
-- ============================================================

-- ─── 1. Add venue_id column ──────────────────────────────────
ALTER TABLE public.scan_events
  ADD COLUMN IF NOT EXISTS venue_id uuid
  REFERENCES public.venues(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.scan_events.venue_id IS
  'Denormalized venue FK for RLS gating. Populated at insert time from the resolved stamp target. Null for legacy rows and rink/event stamps where no venue link exists.';

-- ─── 2. Backfill venue_id ────────────────────────────────────
-- Rink-target: qr_identifier = rinks.qr_identifier
--   For each scan row targeting a rink, find the first venue_events entry
--   that parents to that rink and take its parent_venue_id.
WITH rink_scans AS (
  SELECT se.id AS scan_id, r.id AS rink_id
  FROM public.scan_events se
  JOIN public.rinks r ON r.qr_identifier = se.qr_identifier
  WHERE se.details->>'target_type' = 'rink'
    AND se.venue_id IS NULL
)
UPDATE public.scan_events se
SET venue_id = (
  SELECT ve2.parent_venue_id
  FROM public.venue_events ve2
  WHERE ve2.parent_rink_id = rink_scans.rink_id
  LIMIT 1
)
FROM rink_scans
WHERE se.id = rink_scans.scan_id
  AND se.venue_id IS NULL;

-- Venue-target: qr_identifier = venues.public_id
--   Direct join — the scan happened at a venue, venue_id = that venue's id.
WITH venue_scans AS (
  SELECT se.id AS scan_id, v.id AS vid
  FROM public.scan_events se
  JOIN public.venues v ON v.public_id = se.qr_identifier
  WHERE se.details->>'target_type' = 'venue'
    AND se.venue_id IS NULL
)
UPDATE public.scan_events se
SET venue_id = vs.vid
FROM venue_scans vs
WHERE se.id = vs.scan_id
  AND se.venue_id IS NULL;

-- Event-target: qr_identifier = venue_events.public_id
--   The event parents to a venue; venue_id = event's parent_venue_id.
WITH event_scans AS (
  SELECT se.id AS scan_id, ve.parent_venue_id
  FROM public.scan_events se
  JOIN public.venue_events ve ON ve.public_id = se.qr_identifier
  WHERE se.details->>'target_type' = 'event'
    AND se.venue_id IS NULL
)
UPDATE public.scan_events se
SET venue_id = es.parent_venue_id
FROM event_scans es
WHERE se.id = es.scan_id
  AND se.venue_id IS NULL;

-- ─── 3. Recreate stamps venue-operator SELECT policy ──────────
-- (partner_passport_activity_rls.sql never applied — rolled back on error)
DROP POLICY IF EXISTS "stamps_select_venue_operator" ON public.stamps;
CREATE POLICY "stamps_select_venue_operator"
  ON public.stamps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = stamps.target_venue_id
        AND v.operator_user_id = (auth.jwt() ->> 'sub')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.venue_events ve
      JOIN public.venues v ON v.id = ve.parent_venue_id
      WHERE ve.id = stamps.target_event_id
        AND v.operator_user_id = (auth.jwt() ->> 'sub')
    )
  );

COMMENT ON POLICY "stamps_select_venue_operator" ON public.stamps IS
  'Venue operators can read stamps at their venues/events. Phase 1 of business passport visibility (2026-07-22).';

-- ─── 4. Create scan_events venue-operator SELECT policy ────────
-- Uses scan_events.venue_id → venues.operator_user_id (direct join).
DROP POLICY IF EXISTS "scan_events_select_venue_operator" ON public.scan_events;
CREATE POLICY "scan_events_select_venue_operator"
  ON public.scan_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = scan_events.venue_id
        AND v.operator_user_id = (auth.jwt() ->> 'sub')
    )
  );

COMMENT ON POLICY "scan_events_select_venue_operator" ON public.scan_events IS
  'Venue operators can read scan events at their venues. venue_id populated at scan time (2026-07-23).';
