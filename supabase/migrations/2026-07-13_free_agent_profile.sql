-- 2026-07-13 — Free Agent profile fields (Phase 3 dashboard wedge #2)
--
-- Adds opt-in fields to public.profiles so adult players can mark themselves
-- as a free agent and be searchable in /directory/free-agents.
--
-- Design rules (per safety audit 2026-07-13):
--   - ALL fields nullable + defaulted to 'off' / NULL → no row breaks.
--   - Opt-in only: status default is 'off', so profiles do not appear in
--     search unless the user explicitly turns the flag on.
--   - PII-safe: search results expose display_name + position + skill + notes
--     only — never email, phone, or Clerk user_id (those stay private).
--   - ENUM status has only 3 values, defined inline so we don't depend on a
--     shared enum that may be renamed.

BEGIN;

-- 1. ENUM type for free_agent_status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t
                 JOIN pg_namespace n ON t.typnamespace = n.oid
                 WHERE n.nspname = 'public' AND t.typname = 'free_agent_status_enum') THEN
    CREATE TYPE public.free_agent_status_enum AS ENUM ('off', 'looking', 'sub_needed_today');
  END IF;
END
$$;

-- 2. ENUM type for free_agent_skill_level
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t
                 JOIN pg_namespace n ON t.typnamespace = n.oid
                 WHERE n.nspname = 'public' AND t.typname = 'free_agent_skill_level_enum') THEN
    CREATE TYPE public.free_agent_skill_level_enum AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
  END IF;
END
$$;

-- 3. Columns on profiles — all nullable, all defaulted to safe values
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_agent_status            public.free_agent_status_enum        NOT NULL DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS free_agent_position          text,
  ADD COLUMN IF NOT EXISTS free_agent_skill_level       public.free_agent_skill_level_enum,
  ADD COLUMN IF NOT EXISTS free_agent_radius_km         integer CHECK (free_agent_radius_km IS NULL OR (free_agent_radius_km > 0 AND free_agent_radius_km <= 500)),
  ADD COLUMN IF NOT EXISTS free_agent_notes             text CHECK (free_agent_notes IS NULL OR length(free_agent_notes) <= 500),
  ADD COLUMN IF NOT EXISTS free_agent_show_location     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_agent_updated_at        timestamptz;

-- 4. Index for the public directory query (status='looking' or 'sub_needed_today')
--    The directory will query WHERE status IN ('looking', 'sub_needed_today')
--    ORDER BY free_agent_updated_at DESC.
CREATE INDEX IF NOT EXISTS idx_profiles_free_agent_status
  ON public.profiles (free_agent_status, free_agent_updated_at DESC)
  WHERE free_agent_status <> 'off';

-- 5. Trigger: keep free_agent_updated_at fresh on any change to the 6 fields
CREATE OR REPLACE FUNCTION public.fn_free_agent_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only fire the touch if a free-agent-relevant column actually changed.
  IF (NEW.free_agent_status         IS DISTINCT FROM OLD.free_agent_status)         OR
     (NEW.free_agent_position       IS DISTINCT FROM OLD.free_agent_position)       OR
     (NEW.free_agent_skill_level    IS DISTINCT FROM OLD.free_agent_skill_level)    OR
     (NEW.free_agent_radius_km      IS DISTINCT FROM OLD.free_agent_radius_km)      OR
     (NEW.free_agent_notes          IS DISTINCT FROM OLD.free_agent_notes)          OR
     (NEW.free_agent_show_location  IS DISTINCT FROM OLD.free_agent_show_location)  THEN
    NEW.free_agent_updated_at := now();
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_profiles_free_agent_touch ON public.profiles;
CREATE TRIGGER trg_profiles_free_agent_touch
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_free_agent_touch_updated_at();

-- 6. RLS — readable by anyone (directory is public), writable by own user only
--    public.profiles already has RLS enabled; this adds the explicit policies.
--    Skip if existing policies already cover these operations to avoid
--    duplicate-policy errors.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='free_agents readable by all'
  ) THEN
    EXECUTE $POLICY$
      CREATE POLICY "free_agents readable by all"
        ON public.profiles FOR SELECT
        USING (free_agent_status IN ('looking', 'sub_needed_today'))
    $POLICY$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='free_agents writable by own user'
  ) THEN
    EXECUTE $POLICY$
      CREATE POLICY "free_agents writable by own user"
        ON public.profiles FOR UPDATE
        USING (user_id = (auth.jwt() ->> 'sub')::text)
        WITH CHECK (user_id = (auth.jwt() ->> 'sub')::text)
    $POLICY$;
  END IF;
END
$$;

COMMIT;
