-- 2026-07-23 — WS8 PR4: Drop legacy coach license columns
--
-- Replaces coach_profiles.license_number, license_issuing_authority, and
-- license_expires_at with public.federation_registrations (added in
-- 2026-07-23_federation_registrations.sql). Same pattern as WS8 PR3
-- (drop_player_federation_columns.sql).
--
-- Why drop instead of keep:
--   - Dual-write path is a data-integrity footgun (one row out of sync = which
--     one is canonical?)
--   - New code never reads these columns; they're dead weight
--   - Future readers won't know they're deprecated
--
-- Safe to drop because (verified 2026-07-23):
--   - 0 coach_profiles rows have non-null values in any of these columns
--     (live DB query, all env, all branches)
--   - PATCH /api/coach/credentials (new flow) writes to federation_registrations
--     via federation_slug + registration_number — never touches coach_profiles
--   - POST /api/coaches still had legacy writes; WS8 PR4 removes them
--   - WS8 PR4 also removes the form fields from CoachProfileFormClient and
--     points coaches at /dashboard/coach/credentials for registration editing
--
-- Pre-flight checks: the migration logs row counts at apply time so the
-- operator can abort if they're not zero. RAISE NOTICE shows up in Supabase
-- logs. If pre-flight fails (any row has non-null data), drop is aborted
-- and operators are instructed to consult the PR description / Arnel.

DO $$
DECLARE
  legacy_row_count INT;
  total_coach_count INT;
BEGIN
  -- Count coach_profiles rows with any non-null value in the legacy columns.
  SELECT COUNT(*) INTO legacy_row_count
    FROM public.coach_profiles
    WHERE license_number IS NOT NULL
       OR license_issuing_authority IS NOT NULL
       OR license_expires_at IS NOT NULL;

  -- Also count total coach_profiles rows so operator sees scale of the table.
  SELECT COUNT(*) INTO total_coach_count FROM public.coach_profiles;

  RAISE NOTICE '[ws8pr4] coach_profiles.total_rows = %', total_coach_count;
  RAISE NOTICE '[ws8pr4] coach_profiles.rows_with_legacy_license_data = %', legacy_row_count;

  IF legacy_row_count > 0 THEN
    RAISE EXCEPTION
      '[ws8pr4] ABORT: % coach_profiles rows still have non-null values in '
      'license_number/license_issuing_authority/license_expires_at. '
      'Backfill into federation_registrations first, then re-run. '
      'See PR #XX description for the backfill plan.',
      legacy_row_count;
  END IF;

  ALTER TABLE public.coach_profiles
    DROP COLUMN IF EXISTS license_number,
    DROP COLUMN IF EXISTS license_issuing_authority,
    DROP COLUMN IF EXISTS license_expires_at;

  RAISE NOTICE '[ws8pr4] Dropped 3 columns. coach_profiles is now slim.';
END $$;
