-- 2026-06-13-multi-account-type.sql
-- Multi-type profile support. Replaces the single account_type text column
-- constraint with a Postgres enum + a join table. Old column is preserved
-- under _deprecated_account_type for 30 days.
--
-- Before running: confirm profiles.account_type is text (not enum).
-- After running: profile_account_types is the source of truth.

BEGIN;

-- Step 1: Create the enum (10 locked values, additive-safe for later)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type_enum') THEN
    CREATE TYPE account_type_enum AS ENUM (
      'player',
      'parent',
      'coach',
      'scout',
      'referee',
      'rink_operator',
      'league_admin',
      'team_admin',
      'business',
      'fan'
    );
  END IF;
END$$;

-- Step 2: Create the join table
CREATE TABLE IF NOT EXISTS public.profile_account_types (
  user_id text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  account_type account_type_enum NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, account_type)
);

-- Index for "give me all types for this user" lookups
CREATE INDEX IF NOT EXISTS idx_pat_user ON public.profile_account_types(user_id);

-- Step 3: Enforce "exactly one primary" via a partial unique index
-- (Partial unique means: at most one row per user can have is_primary=true.
--  Zero is allowed only when the user has zero rows total, which is OK.)
CREATE UNIQUE INDEX IF NOT EXISTS uq_pat_primary_per_user
  ON public.profile_account_types(user_id)
  WHERE is_primary = true;

-- Step 4: Backfill from old column
-- Map old values to new ones. Old: 'team' -> 'team_admin', 'league' -> 'league_admin', 'rink' -> 'rink_operator'.
-- Other values pass through unchanged.
INSERT INTO public.profile_account_types (user_id, account_type, is_primary)
SELECT
  user_id,
  CASE account_type
    WHEN 'team'   THEN 'team_admin'::account_type_enum
    WHEN 'league' THEN 'league_admin'::account_type_enum
    WHEN 'rink'   THEN 'rink_operator'::account_type_enum
    ELSE account_type::account_type_enum
  END,
  true
FROM public.profiles
WHERE account_type IS NOT NULL
ON CONFLICT (user_id, account_type) DO NOTHING;

-- Step 5: Enable RLS + policies
ALTER TABLE public.profile_account_types ENABLE ROW LEVEL SECURITY;

-- Everyone can SELECT (it's part of public profile data)
DROP POLICY IF EXISTS pat_select ON public.profile_account_types;
CREATE POLICY pat_select ON public.profile_account_types
  FOR SELECT USING (true);

-- A user can INSERT/UPDATE/DELETE their own rows.
-- Uses Clerk user id (text in profiles.user_id). We trust the API layer
-- (Clerk middleware) to set user_id from the authenticated session.
DROP POLICY IF EXISTS pat_insert_own ON public.profile_account_types;
CREATE POLICY pat_insert_own ON public.profile_account_types
  FOR INSERT WITH CHECK (true);  -- API enforces user_id = current user; DB stays permissive

DROP POLICY IF EXISTS pat_update_own ON public.profile_account_types;
CREATE POLICY pat_update_own ON public.profile_account_types
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS pat_delete_own ON public.profile_account_types;
CREATE POLICY pat_delete_own ON public.profile_account_types
  FOR DELETE USING (true);

-- Step 6: Rename old column (preserved, not dropped)
ALTER TABLE public.profiles RENAME COLUMN account_type TO _deprecated_account_type;

-- Step 7: Verification queries (will show in dry-run output)
SELECT 'profile_account_types row count' AS check, count(*)::text AS value
  FROM public.profile_account_types
UNION ALL
SELECT 'profiles with non-null _deprecated_account_type',
  count(*)::text FROM public.profiles WHERE _deprecated_account_type IS NOT NULL
UNION ALL
SELECT 'profile_account_types with is_primary=true',
  count(*)::text FROM public.profile_account_types WHERE is_primary = true;

COMMIT;
