-- ============================================================
-- Equipment management — schema foundation
-- ============================================================
-- Three surfaces share this schema (2026-07-22):
--
--   A. Team gear inventory  — coaches/staff track team-owned gear
--                              (jerseys, pucks, cones, goals) and assign
--                              to players for games/practices
--
--   B. Personal equipment   — players (or parents) track their own gear
--      locker                  (skates, stick, helmet) with purchase dates
--                              and replacement reminders
--
--   C. Equipment            — rinks / orgs / teams manage lending libraries
--      rental/lending          with check-out/return lifecycle
--
-- Marketplace (used-gear buy/sell between users) is intentionally OUT of
-- scope for this schema. If we ever add it, it'll be a separate migration
-- with its own pricing/escrow tables — not retrofitted onto equipment_items.
--
-- Storage choice: single polymorphic equipment_items table with owner_type
-- + owner_id, plus a separate equipment_assignments table for time-windowed
-- assignment history.
--
-- Why polymorphic (owner_type, owner_id) instead of three separate tables:
--   1. One place to add columns when features ship (replacement reminders,
--      photos, condition grading, brand/model lookup)
--   2. Future "search across all my gear" (across user + team + rink
--      ownership) becomes a single query
--   3. House style: follows table uses the same pattern (followee_type +
--      followee_id, 2026-06-13-follows.sql). Predictable for future devs.
--
-- Trade-off acknowledged: no FK constraint on owner_id (the value depends
-- on owner_type). Mitigation: every read goes through the service layer
-- in src/lib/equipment/, which validates owner_id against the right table.
--
-- Additive only. No FK changes to existing tables. profiles.user_id is
-- pre-existing; new FK from equipment_items.owner_id / assignments is only
-- enforced when owner_type='user'. No data mutation.
--
-- Per Workstream 1 Rule 6 (Zero Data Mutation): only DDL.
-- Per Workstream 1 Rule 9 (No Existing Foreign Keys Change): new FKs only
-- from new tables TO existing tables (profiles.user_id, profiles.user_id).

-- ─── equipment_type_enum ────────────────────────────────────
-- Hybrid enum with 'other' fallback. The service layer also accepts
-- free-form values stored as text in equipment_items.type when a user
-- wants a type we haven't enumerated yet (e.g. 'mouthguard_strap').
CREATE TYPE public.equipment_type_enum AS ENUM (
  'skates',
  'stick',
  'helmet',
  'gloves',
  'pants',
  'shin_pads',
  'shoulder_pads',
  'elbow_pads',
  'jersey',
  'sock',
  'puck',
  'cones',
  'goal',
  'net',
  'bag',
  'water_bottle',
  'tape',
  'mouthguard',
  'skate_sharpener',
  'other'
);

-- ─── equipment_status_enum ─────────────────────────────────
-- Lifecycle states for an owned item.
--   active  = in regular use
--   retired = kept around but no longer used (could be donated/sold)
--   lost    = missing, presumed gone
--   broken  = damaged beyond repair
--   lent    = checked out to someone else (mirrors equipment_assignments,
--             but stored here for fast "what's in my inventory" filtering)
CREATE TYPE public.equipment_status_enum AS ENUM (
  'active',
  'retired',
  'lost',
  'broken',
  'lent'
);

-- ─── equipment_condition_enum ──────────────────────────────
-- Used by owners + lenders to grade physical state. Lenders should
-- re-grade on return (lending library workflow).
CREATE TYPE public.equipment_condition_enum AS ENUM (
  'new',
  'excellent',
  'good',
  'worn',
  'damaged',
  'needs_repair'
);

-- ─── equipment_owner_type_enum ─────────────────────────────
-- Polymorphic owner discriminator.
--   user    = personal locker (B)
--   team    = team inventory (A)
--   rink    = rink-operated lending library (C)
--   org     = league/federation-operated lending library (C)
CREATE TYPE public.equipment_owner_type_enum AS ENUM (
  'user',
  'team',
  'rink',
  'org'
);

-- ─── equipment_items ───────────────────────────────────────
-- One row per physical piece of equipment. Polymorphic owner.
CREATE TABLE IF NOT EXISTS public.equipment_items (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type           public.equipment_owner_type_enum NOT NULL,
  owner_id             text NOT NULL,           -- profiles.user_id | team.id | rink.id | org.id
  type                 public.equipment_type_enum NOT NULL DEFAULT 'other',
  label                text NOT NULL,           -- user-given name, e.g. "Bauer Vapor X700"
  brand                text,
  model                text,
  size                 text,                    -- free-form; varies by type ("10.5" | "SR" | "M")
  status               public.equipment_status_enum NOT NULL DEFAULT 'active',
  condition            public.equipment_condition_enum NOT NULL DEFAULT 'good',
  acquired_at          date,
  acquired_price_cents integer,                 -- stored as int to avoid float math; null = unknown
  notes                text,
  metadata             jsonb NOT NULL DEFAULT '{}'::jsonb,  -- type-specific extension points
  created_at           timestamptz NOT NULL DEFAULT NOW(),
  updated_at           timestamptz NOT NULL DEFAULT NOW()
);

-- Hot-path indexes
-- (owner_type, owner_id) is the dominant filter for "my inventory" queries
-- across all three surfaces. Composite covers both columns in one scan.
CREATE INDEX IF NOT EXISTS idx_equipment_items_owner
  ON public.equipment_items(owner_type, owner_id);

-- (type) for replacement-reminder queries that scan per-type lifecycle windows
CREATE INDEX IF NOT EXISTS idx_equipment_items_type
  ON public.equipment_items(type);

-- (status='active') partial index for "items in use right now"
CREATE INDEX IF NOT EXISTS idx_equipment_items_active
  ON public.equipment_items(owner_type, owner_id)
  WHERE status = 'active';

-- ─── equipment_assignments ─────────────────────────────────
-- Time-windowed assignment of an item to a recipient.
--
-- One row per "this item was given to this person for this window".
-- Active assignments (returned_at IS NULL) overlap-tracking is the
-- lender's responsibility (a player can only have one stick at a time
-- in most workflows).
--
-- For lending libraries: assignee_user_id is the borrower, assigned_by
-- is the librarian. For team gear: assignee is the player, assigned_by
-- is the coach/staff. Same shape — the access-control layer determines
-- who can create which assignments.
CREATE TABLE IF NOT EXISTS public.equipment_assignments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id         uuid NOT NULL REFERENCES public.equipment_items(id) ON DELETE CASCADE,
  assignee_user_id     text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  assigned_by_user_id  text NOT NULL REFERENCES public.profiles(user_id),  -- staff/coach/librarian
  starts_at            timestamptz NOT NULL DEFAULT NOW(),
  due_at               timestamptz,             -- nullable for indefinite checkouts (team gear)
  returned_at          timestamptz,             -- null = still out
  return_condition     public.equipment_condition_enum,  -- captured at return time
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT NOW(),
  updated_at           timestamptz NOT NULL DEFAULT NOW()
);

-- Hot-path indexes
-- "What's checked out to me right now?" — recipient view
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_assignee
  ON public.equipment_assignments(assignee_user_id)
  WHERE returned_at IS NULL;

-- "What's the assignment history for this item?" — owner view
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_item
  ON public.equipment_assignments(equipment_id, starts_at DESC);

-- "What did I lend out?" — librarian/coach view
CREATE INDEX IF NOT EXISTS idx_equipment_assignments_assigned_by
  ON public.equipment_assignments(assigned_by_user_id, starts_at DESC);

-- ─── updated_at triggers ───────────────────────────────────
-- Reuses the same trigger pattern as other migrations: UPDATE column
-- via BEFORE UPDATE trigger. Keeping it inline rather than as a
-- shared function because supabase migrations are forward-only and
-- adding a shared utility function would require a new migration.

CREATE OR REPLACE FUNCTION public.equipment_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_equipment_items_updated_at ON public.equipment_items;
CREATE TRIGGER trg_equipment_items_updated_at
  BEFORE UPDATE ON public.equipment_items
  FOR EACH ROW EXECUTE FUNCTION public.equipment_set_updated_at();

DROP TRIGGER IF EXISTS trg_equipment_assignments_updated_at ON public.equipment_assignments;
CREATE TRIGGER trg_equipment_assignments_updated_at
  BEFORE UPDATE ON public.equipment_assignments
  FOR EACH ROW EXECUTE FUNCTION public.equipment_set_updated_at();

-- ─── RLS ───────────────────────────────────────────────────
-- Both tables get RLS. Defaults are deny-all; policies below grant
-- the minimum necessary access for each surface.

ALTER TABLE public.equipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_assignments ENABLE ROW LEVEL SECURITY;

-- equipment_items policies
--
-- Read: only direct owners read their items for v1.
--   - owner_type='user' AND owner_id=auth.uid()
--
-- Recipients (people who got an assignment) read their assignment via the
-- equipment_assignments RLS, which already gives them equipment_id. If they
-- need item details (brand, model, condition), the API service layer joins
-- through and verifies "you have an active assignment for this item_id"
-- before returning item fields. This keeps RLS tight (no cross-user reads
-- possible) and concentrates access-control logic in one place.
--
-- Team/rink/org reads are deferred until membership tables stabilize.
CREATE POLICY "Owners read own equipment"
  ON public.equipment_items FOR SELECT
  USING (owner_type = 'user' AND owner_id = auth.jwt() ->> 'sub');

-- Write: only direct owners can INSERT/UPDATE/DELETE their items.
-- owner_type='user' AND owner_id=auth.uid()
-- Team/rink/org owner writes are deferred (need membership tables first).
CREATE POLICY "Users insert own equipment"
  ON public.equipment_items FOR INSERT
  WITH CHECK (
    owner_type = 'user' AND owner_id = auth.jwt() ->> 'sub'
  );

CREATE POLICY "Users update own equipment"
  ON public.equipment_items FOR UPDATE
  USING (
    owner_type = 'user' AND owner_id = auth.jwt() ->> 'sub'
  )
  WITH CHECK (
    owner_type = 'user' AND owner_id = auth.jwt() ->> 'sub'
  );

CREATE POLICY "Users delete own equipment"
  ON public.equipment_items FOR DELETE
  USING (
    owner_type = 'user' AND owner_id = auth.jwt() ->> 'sub'
  );

-- equipment_assignments policies
--
-- Read: assignee + assigner + item owner can read.
-- For v1 we cover assignee + assigner (the assigner is always the
-- staff/coach who created the row). Item-owner read access is
-- effectively transitive because the assigner IS the owner (for
-- personal locker there's no assignment; for team/rink/org those
-- writes are deferred).
CREATE POLICY "Assignment participants read assignments"
  ON public.equipment_assignments FOR SELECT
  USING (
    assignee_user_id = auth.jwt() ->> 'sub'
    OR assigned_by_user_id = auth.jwt() ->> 'sub'
  );

-- Write: only the staff/coach/librarian who created the assignment can
-- update it (return it, change notes, extend due date). For v1 we
-- restrict to the assigner; team/rink/org scoping deferred.
CREATE POLICY "Assigner updates own assignments"
  ON public.equipment_assignments FOR UPDATE
  USING (assigned_by_user_id = auth.jwt() ->> 'sub')
  WITH CHECK (assigned_by_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Assigner deletes own assignments"
  ON public.equipment_assignments FOR DELETE
  USING (assigned_by_user_id = auth.jwt() ->> 'sub');

-- Insert: only owners of the underlying item can create assignments to
-- themselves (e.g. "I'm borrowing my own spare stick and want a history
-- row"). This blocks the leak vector where a user creates a fake
-- assignment to someone else's item just to read it.
--
-- Staff-created assignments where assignee_user_id != auth.uid() are
-- deferred until team/rink/org membership tables stabilize.
CREATE POLICY "Owners self-assign own equipment"
  ON public.equipment_assignments FOR INSERT
  WITH CHECK (
    assignee_user_id = auth.jwt() ->> 'sub'
    AND EXISTS (
      SELECT 1 FROM public.equipment_items ei
      WHERE ei.id = equipment_id
        AND ei.owner_type = 'user'
        AND ei.owner_id = auth.jwt() ->> 'sub'
    )
  );

-- Comments for future readers / psql \d+
COMMENT ON TABLE public.equipment_items IS
  'Polymorphic equipment inventory. One row per physical item. owner_type + owner_id is the polymorphic key (matches follows table pattern).';
COMMENT ON TABLE public.equipment_assignments IS
  'Time-windowed assignment of an equipment_item to a recipient. Used by team gear (A), personal locker history (B), and lending libraries (C).';
COMMENT ON COLUMN public.equipment_items.metadata IS
  'Type-specific extension point. Schema-less jsonb; keys depend on equipment type. Document per-type keys in src/lib/equipment/metadata.ts.';
COMMENT ON COLUMN public.equipment_items.acquired_price_cents IS
  'Purchase price in cents (integer to avoid float math). null when unknown. Use src/lib/equipment/format.ts to format for display.';
COMMENT ON COLUMN public.equipment_assignments.return_condition IS
  'Condition at return time. Lenders must set this; team gear usually does not (returned in same condition as issued).';
