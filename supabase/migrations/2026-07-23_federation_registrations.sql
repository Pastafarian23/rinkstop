-- 2026-07-23 — Federation Registrations (Tier 2 workflow)
--
-- Submissions registry for player / coach / referee federation/license numbers.
-- Polymorphic subject via three nullable FK columns + check constraint
-- that exactly one is set. One state machine, clean per-persona RLS.
--
-- Replaces the previous free-text columns:
--   - players.usa_hockey_number       (draft-backed, then admin-verified)
--   - players.hockey_canada_number    (draft-backed, then admin-verified)
--   - coach_profiles.license_number   (draft-backed, then admin-verified)
--   - coach_profiles.license_issuing_authority (now FK to federations)
--
-- Drop of legacy columns is deferred to a follow-up migration after
-- the new workflow is validated end-to-end.
--
-- Admin authorization is enforced at the application layer (see
-- src/lib/admin-auth.ts). The supabaseAdmin service-role client bypasses
-- RLS, so admin queue reads/writes go through /api/admin/federation-registrations
-- routes that call getAdminFromRequest() first. No `admin_users` table needed.
--
-- See workstreams/workstream-2-tier2-federation-plan.md for the full plan.

-- ============================================================
-- 1. Add category column to federations (player / coach / referee / all)
-- ============================================================
ALTER TABLE public.federations
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'all'
    CHECK (category IN ('player', 'coach', 'referee', 'all'));

CREATE INDEX IF NOT EXISTS idx_federations_category
  ON public.federations (category)
  WHERE is_active = true;

-- ============================================================
-- 2. Federation Registrations (polymorphic subject)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.federation_registrations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  federation_id        UUID NOT NULL REFERENCES public.federations(id) ON DELETE RESTRICT,
  registration_number  TEXT NOT NULL,
  submission_status    TEXT NOT NULL DEFAULT 'draft'
    CHECK (submission_status IN ('draft', 'pending', 'approved', 'rejected')),
  submitted_at         TIMESTAMPTZ,
  submitted_by         TEXT,
  verified_at          TIMESTAMPTZ,
  verified_by          TEXT,
  rejection_reason     TEXT,
  expires_at           DATE,

  -- Polymorphic subject: exactly one must be set.
  player_id            UUID REFERENCES public.players(id) ON DELETE CASCADE,
  coach_id             UUID REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  referee_user_id      TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT federation_registrations_exactly_one_subject CHECK (
    (player_id IS NOT NULL)::int +
    (coach_id IS NOT NULL)::int +
    (referee_user_id IS NOT NULL)::int = 1
  )
);

-- One registration per (subject, federation). Partial unique indexes so
-- NULLs don't collide across subjects.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_player_federation
  ON public.federation_registrations (player_id, federation_id)
  WHERE player_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_coach_federation
  ON public.federation_registrations (coach_id, federation_id)
  WHERE coach_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_referee_federation
  ON public.federation_registrations (referee_user_id, federation_id)
  WHERE referee_user_id IS NOT NULL;

-- Admin queue: pending submissions newest-first
CREATE INDEX IF NOT EXISTS idx_federation_reg_pending
  ON public.federation_registrations (submission_status, submitted_at DESC)
  WHERE submission_status = 'pending';

-- Per-subject lookups
CREATE INDEX IF NOT EXISTS idx_federation_reg_player
  ON public.federation_registrations (player_id)
  WHERE player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_federation_reg_coach
  ON public.federation_registrations (coach_id)
  WHERE coach_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_federation_reg_referee
  ON public.federation_registrations (referee_user_id)
  WHERE referee_user_id IS NOT NULL;

ALTER TABLE public.federation_registrations ENABLE ROW LEVEL SECURITY;

-- Public can read APPROVED only (for public passport display).
-- Owners can read their own (any status). Admins read all via service role.
DROP POLICY IF EXISTS "Public read approved federation_registrations" ON public.federation_registrations;
CREATE POLICY "Public read approved federation_registrations"
  ON public.federation_registrations FOR SELECT
  USING (submission_status = 'approved');

DROP POLICY IF EXISTS "Player owner read federation_registrations" ON public.federation_registrations;
CREATE POLICY "Player owner read federation_registrations"
  ON public.federation_registrations FOR SELECT
  USING (player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid()::text));

DROP POLICY IF EXISTS "Coach owner read federation_registrations" ON public.federation_registrations;
CREATE POLICY "Coach owner read federation_registrations"
  ON public.federation_registrations FOR SELECT
  USING (coach_id IN (SELECT id FROM public.coach_profiles WHERE profile_id = auth.uid()::text));

DROP POLICY IF EXISTS "Referee owner read federation_registrations" ON public.federation_registrations;
CREATE POLICY "Referee owner read federation_registrations"
  ON public.federation_registrations FOR SELECT
  USING (referee_user_id = auth.uid()::text);

-- Owner can insert/update own DRAFT only. Once submitted, mutations go
-- through admin-gated API routes using the service-role client.
DROP POLICY IF EXISTS "Player owner write draft federation_registrations" ON public.federation_registrations;
CREATE POLICY "Player owner write draft federation_registrations"
  ON public.federation_registrations FOR INSERT
  WITH CHECK (
    player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid()::text)
    AND submission_status = 'draft'
  );

DROP POLICY IF EXISTS "Player owner update draft federation_registrations" ON public.federation_registrations;
CREATE POLICY "Player owner update draft federation_registrations"
  ON public.federation_registrations FOR UPDATE
  USING (
    player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid()::text)
    AND submission_status = 'draft'
  );

-- Same pattern for coach + referee. Service role bypasses RLS for
-- admin write paths.
DROP POLICY IF EXISTS "Coach owner write draft federation_registrations" ON public.federation_registrations;
CREATE POLICY "Coach owner write draft federation_registrations"
  ON public.federation_registrations FOR INSERT
  WITH CHECK (
    coach_id IN (SELECT id FROM public.coach_profiles WHERE profile_id = auth.uid()::text)
    AND submission_status = 'draft'
  );

DROP POLICY IF EXISTS "Coach owner update draft federation_registrations" ON public.federation_registrations;
CREATE POLICY "Coach owner update draft federation_registrations"
  ON public.federation_registrations FOR UPDATE
  USING (
    coach_id IN (SELECT id FROM public.coach_profiles WHERE profile_id = auth.uid()::text)
    AND submission_status = 'draft'
  );

DROP POLICY IF EXISTS "Referee owner write draft federation_registrations" ON public.federation_registrations;
CREATE POLICY "Referee owner write draft federation_registrations"
  ON public.federation_registrations FOR INSERT
  WITH CHECK (
    referee_user_id = auth.uid()::text
    AND submission_status = 'draft'
  );

DROP POLICY IF EXISTS "Referee owner update draft federation_registrations" ON public.federation_registrations;
CREATE POLICY "Referee owner update draft federation_registrations"
  ON public.federation_registrations FOR UPDATE
  USING (
    referee_user_id = auth.uid()::text
    AND submission_status = 'draft'
  );

-- ============================================================
-- 3. updated_at trigger (per-table, matches the pattern in other migrations)
-- ============================================================
CREATE OR REPLACE FUNCTION public.federation_registrations_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_federation_registrations_updated_at ON public.federation_registrations;
CREATE TRIGGER trg_federation_registrations_updated_at
  BEFORE UPDATE ON public.federation_registrations
  FOR EACH ROW EXECUTE FUNCTION public.federation_registrations_set_updated_at();
