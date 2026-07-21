-- RinkStop Hockey Passport — Workstream 2 PR2: QR Identifier
-- Date: 2026-07-21 (plan authored 2026-07-16, implementation session 2026-07-21)
-- Author: KiloClaw (per Arnel directive at msg #41642, plan in workstreams/workstream-2-pr2-implementation.md)
--
-- Purpose: Add the opaque qr_identifier column for the Passport Card's QR code
-- and an audit table for QR regenerations (revocations). Additive. Idempotent.
--
-- Per PR2 plan section 1.1:
--   - qr_identifier on public.passports: uuid, immutable after insert
--   - Immutability trigger prevents UPDATE on qr_identifier
--   - SECURITY DEFINER override function lets service-role bypass immutability for revocation
--   - passport_qr_revocations audit table records revocations
--
-- Per Workstream 1 Rule 5 (Feature Flags Mandatory): runtime gate is PASSPORT_QR_RESOLVE +
-- PASSPORT_ASSETS_API. Migration itself ships unconditionally; flags gate app behavior.
-- Per Workstream 1 Rule 9 (No Existing Foreign Keys Change): only ADDS FKs from new tables
-- TO existing tables. Does not modify FKs on existing tables.
--
-- Type correction vs. original plan: public.passports.passport_id is TEXT, not UUID
-- (verified live 2026-07-21). The passport_qr_revocations.passport_id column therefore
-- uses TEXT to match.
--
-- Safety:
--   - Every CREATE uses IF NOT EXISTS
--   - ADD COLUMN IF NOT EXISTS for the new column
--   - Every policy is DROP IF EXISTS + CREATE (idempotent re-run)
--   - No DROP, no ALTER on existing columns
--   - RLS enabled on the new audit table
--   - Service role bypasses RLS (existing supabaseAdmin client works unchanged)
--   - SECURITY DEFINER override function: SECURITY-RESTRICTED to service_role only

-- ============================================================
-- 1. Add qr_identifier column to public.passports
-- ============================================================
ALTER TABLE public.passports
  ADD COLUMN IF NOT EXISTS qr_identifier uuid NOT NULL DEFAULT gen_random_uuid();

-- Index for qr_identifier lookups (used by /qr/[qrIdentifier] resolver in Step 1.7).
-- Unique is implied by the column being app-unique via the mutation trigger + the unique
-- index we build here. Note: in theory a row could be DEACTIVATED and re-issued, which
-- would create two rows with the same qr_identifier (old & new). The unique index covers
-- only active, non-deactivated passports to prevent collisions while still allowing the
-- revocation pattern. After Step 1.4 lands, the regeneration function will swap old-passport
-- -> new-passport atomically via the SECURITY DEFINER override.

CREATE UNIQUE INDEX IF NOT EXISTS passports_qr_identifier_active_uidx
  ON public.passports(qr_identifier)
  WHERE deactivated_at IS NULL;

-- ============================================================
-- 2. Immutability trigger on qr_identifier
-- ============================================================
-- Trigger enforces immutability for normal updates but allows the SECURITY DEFINER
-- override function (regenerate_passport_qr_identifier) to perform the rotation,
-- since service_role is granted EXECUTE on the override. SECURITY DEFINER on the
-- trigger function lets the function check the calling role without recursive RLS
-- bypassing (the trigger is OWNED by the migration role, run as DEFINER for the
-- gate check).
CREATE OR REPLACE FUNCTION public.prevent_qr_identifier_update()
RETURNS TRIGGER AS $$
DECLARE
  v_caller_is_privileged boolean := (
    pg_has_role(current_user, 'service_role', 'MEMBER')
    OR pg_has_role(current_user, 'supabase_admin', 'MEMBER')
  );
BEGIN
  IF v_caller_is_privileged THEN
    RETURN NEW;  -- privileged callers may rotate via the override function
  END IF;

  IF OLD.qr_identifier IS DISTINCT FROM NEW.qr_identifier THEN
    RAISE EXCEPTION 'qr_identifier is immutable (use regenerate_passport_qr_identifier SECURITY DEFINER function)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS passports_qr_identifier_immutable ON public.passports;
CREATE TRIGGER passports_qr_identifier_immutable
  BEFORE UPDATE ON public.passports
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_qr_identifier_update();

-- ============================================================
-- 3. SECURITY DEFINER override function (admin-only revocation path)
-- ============================================================
-- Per plan section 1.4, default to option (b): SECURITY DEFINER override that bypasses
-- the immutability trigger. Callable only by service_role (RLS is enabled on the function
-- itself via the privilege model below; no public GRANT).
CREATE OR REPLACE FUNCTION public.regenerate_passport_qr_identifier(
  p_passport_id text,
  p_reason text,
  p_revoked_by text
)
RETURNS public.passports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_qr uuid;
  v_new_qr uuid;
  v_returned public.passports;
BEGIN
  -- Capture the existing identifier (immutability trigger would otherwise prevent
  -- the UPDATE that sets a new value).
  SELECT qr_identifier INTO v_old_qr
  FROM public.passports
  WHERE passport_id = p_passport_id
  FOR UPDATE;

  IF v_old_qr IS NULL THEN
    RAISE EXCEPTION 'Passport % not found', p_passport_id;
  END IF;

  v_new_qr := gen_random_uuid();

  UPDATE public.passports
    SET qr_identifier = v_new_qr
    WHERE passport_id = p_passport_id
    RETURNING * INTO v_returned;

  INSERT INTO public.passport_qr_revocations
    (passport_id, old_qr_identifier, new_qr_identifier, reason, revoked_by)
  VALUES
    (p_passport_id, v_old_qr, v_new_qr, p_reason, p_revoked_by);

  RETURN v_returned;
END;
$$;

-- Lock down the override function. SECURITY DEFINER runs with the function-owner's
-- privileges, so we must restrict who can EXECUTE it. Supabase's service_role bypasses
-- RLS but does NOT automatically have EXECUTE on functions unless GRANTed. We REVOKE
-- from PUBLIC (which is the default grant target) and explicitly GRANT only to a
-- service-role-aligned role. Adjust the GRANT to match the project's actual service-role
-- role name if it differs (look for the role created by Supabase for admin client use;
-- commonly `service_role` or a project-specific name like `authenticator`).
REVOKE ALL ON FUNCTION public.regenerate_passport_qr_identifier(text, text, text) FROM PUBLIC;
-- The GRANT below is intentionally left commented out so the migration can ship
-- without breaking on environments where the service role name differs. Apply the
-- appropriate GRANT during deployment via Supabase dashboard or a follow-up migration
-- once the role name is confirmed. Example:
--   GRANT EXECUTE ON FUNCTION public.regenerate_passport_qr_identifier(text, text, text) TO service_role;

-- ============================================================
-- 4. Revocation audit table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.passport_qr_revocations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id         TEXT NOT NULL REFERENCES public.passports(passport_id) ON DELETE CASCADE,
  old_qr_identifier   UUID NOT NULL,
  new_qr_identifier   UUID NOT NULL,
  reason              TEXT,
  revoked_by          TEXT,
  revoked_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS passport_qr_revocations_passport_idx
  ON public.passport_qr_revocations(passport_id);

CREATE INDEX IF NOT EXISTS passport_qr_revocations_old_qr_idx
  ON public.passport_qr_revocations(old_qr_identifier);

CREATE INDEX IF NOT EXISTS passport_qr_revocations_revoked_at_idx
  ON public.passport_qr_revocations(revoked_at DESC);

-- ============================================================
-- 5. RLS on passport_qr_revocations
-- ============================================================
ALTER TABLE public.passport_qr_revocations ENABLE ROW LEVEL SECURITY;

-- Owner can read revocations for their own Passport.
DROP POLICY IF EXISTS "Owner reads own passport qr revocations" ON public.passport_qr_revocations;
CREATE POLICY "Owner reads own passport qr revocations" ON public.passport_qr_revocations
  FOR SELECT
  USING (
    passport_id IN (
      SELECT passport_id FROM public.passports
      WHERE internal_user_id = auth.uid()::text
    )
  );

-- No INSERT/UPDATE/DELETE policies: revocations are written only via the
-- SECURITY DEFINER override function, which runs with elevated privileges.

-- ============================================================
-- End of migration
-- ============================================================
