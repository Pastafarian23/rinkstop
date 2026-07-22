-- ============================================================
-- WS4 PR2 — Referee Tools schema
-- ============================================================
-- Adds three tables supporting the referee account-type experience:
--
--   referee_game_assignments — links a referee (user) to a venue_events row
--   referee_attendance       — per-assignment check-in/out and status
--   referee_payments         — payment ledger per assignment
--
-- All additive. No FK changes to existing tables. Production behavior
-- unchanged until REFEREE_TOOLS_ENABLED is flipped on.
--
-- Per Workstream 1 Rule 9 (No Existing Foreign Keys Change): this
-- migration only ADDS FKs from new tables TO existing tables. The new
-- tables reference profiles.user_id and venue_events.id.
--
-- Per Rule 6 (Zero Data Mutation): no rows are inserted; only DDL.

-- ─── referee_game_assignments ────────────────────────────────
-- A referee is assigned to officiate a venue_event. The assignment row
-- is created by staff (or a league/team admin who owns the event — out
-- of scope for chunk 2; chunk 3 will wire that).
--
-- role: 'head_ref' / 'linesman' / 'standby' — multiple refs per event
-- are supported by allowing multiple rows per (event_id, role). Status
-- transitions:
--   assigned    → referee was invited but hasn't responded
--   confirmed   → referee accepted the assignment
--   declined    → referee declined
--   completed   → event happened, attendance was recorded
--   cancelled   → event was cancelled or referee was replaced
CREATE TABLE IF NOT EXISTS public.referee_game_assignments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referee_user_id      text NOT NULL,        -- Clerk user_id (matches profiles.user_id)
  venue_event_id       uuid NOT NULL REFERENCES public.venue_events(id) ON DELETE CASCADE,
  role                 text NOT NULL CHECK (role IN ('head_ref', 'linesman', 'standby')),
  status               text NOT NULL DEFAULT 'assigned'
                       CHECK (status IN ('assigned', 'confirmed', 'declined', 'completed', 'cancelled')),
  assigned_at          timestamptz NOT NULL DEFAULT NOW(),
  assigned_by_user_id  text,                 -- staff user_id who created the assignment
  confirmed_at         timestamptz,
  declined_at          timestamptz,
  decline_reason       text,
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT NOW(),
  updated_at           timestamptz NOT NULL DEFAULT NOW()
);

-- An event can have at most one head_ref. Linesmen and standby slots
-- are not uniquely constrained at the DB level (chunk 2 keeps it loose;
-- chunk 3 or a follow-up can enforce slot caps if needed).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_referee_head_ref_per_event
  ON public.referee_game_assignments (venue_event_id)
  WHERE role = 'head_ref';

CREATE INDEX IF NOT EXISTS idx_referee_assignments_referee
  ON public.referee_game_assignments (referee_user_id);
CREATE INDEX IF NOT EXISTS idx_referee_assignments_event
  ON public.referee_game_assignments (venue_event_id);
CREATE INDEX IF NOT EXISTS idx_referee_assignments_status
  ON public.referee_game_assignments (status);

-- ─── referee_attendance ──────────────────────────────────────
-- One row per assignment. Referee self-records check-in / check-out.
-- For chunk 2 the only writer is the referee themselves; staff can
-- read all rows (for payroll / dispute review).
--
-- attendance_status:
--   pending  → referee hasn't checked in yet
--   present  → checked in (and not yet checked out)
--   absent   → referee confirmed but didn't show up
--   no_show  → referee never confirmed AND didn't show up
--   completed→ checked in AND checked out (event done)
CREATE TABLE IF NOT EXISTS public.referee_attendance (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referee_user_id     text NOT NULL,
  assignment_id       uuid NOT NULL REFERENCES public.referee_game_assignments(id) ON DELETE CASCADE,
  attendance_status   text NOT NULL DEFAULT 'pending'
                      CHECK (attendance_status IN ('pending', 'present', 'absent', 'no_show', 'completed')),
  checked_in_at       timestamptz,
  checked_out_at      timestamptz,
  notes               text,
  recorded_by_user_id text,                 -- who set the status (referee self or staff override)
  created_at          timestamptz NOT NULL DEFAULT NOW(),
  updated_at          timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(assignment_id)                     -- one attendance row per assignment
);

CREATE INDEX IF NOT EXISTS idx_referee_attendance_referee
  ON public.referee_attendance (referee_user_id);
CREATE INDEX IF NOT EXISTS idx_referee_attendance_status
  ON public.referee_attendance (attendance_status);

-- ─── referee_payments ───────────────────────────────────────
-- One row per assignment capturing the referee's pay for that game.
-- Mirrors the team_payments pattern (2026-06-20 migration) but scoped
-- to referee accounts. Currency defaults to PHP (PH market) but the
-- column accepts any ISO 4217 — referees in other markets may use USD
-- or EUR.
--
-- status:
--   pending  → assignment created, amount not yet confirmed
--   owed     → amount confirmed by staff, awaiting payment
--   paid     → referee marked as paid (or staff confirmed wire received)
--   waived   → staff waived the fee
--   disputed → under review
CREATE TABLE IF NOT EXISTS public.referee_payments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referee_user_id       text NOT NULL,
  assignment_id         uuid NOT NULL REFERENCES public.referee_game_assignments(id) ON DELETE CASCADE,
  amount                numeric(10,2) NOT NULL CHECK (amount >= 0),
  currency              text NOT NULL DEFAULT 'PHP',
  status                text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'owed', 'paid', 'waived', 'disputed')),
  paid_at               timestamptz,
  paid_via              text,                -- 'gcash' | 'paymaya' | 'cash' | 'bank' | 'other' | free text
  reference_number      text,
  receipt_url           text,                -- storage URL to screenshot/PDF
  notes                 text,
  created_by_user_id    text,                -- staff user who set the amount
  marked_paid_by_user_id text,               -- who flipped status to paid (referee or staff)
  created_at            timestamptz NOT NULL DEFAULT NOW(),
  updated_at            timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_referee_payments_referee
  ON public.referee_payments (referee_user_id);
CREATE INDEX IF NOT EXISTS idx_referee_payments_status
  ON public.referee_payments (status);
CREATE INDEX IF NOT EXISTS idx_referee_payments_assigned_at
  ON public.referee_payments (created_at DESC);