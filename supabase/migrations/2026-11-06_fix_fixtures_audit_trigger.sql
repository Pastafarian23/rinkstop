-- 2026-11-06: Fix all three fixtures integrity triggers — audit insert failing
-- with `relation "fixtures_audit" does not exist`.
--
-- Context (found while restoring HockeyTech fixture ingestion):
--   The HockeyTech ingest for AHL failed on 973 of 1,152 games with
--   `relation "fixtures_audit" does not exist`. All three integrity triggers
--   on `fixtures` write an audit row when they reject a row:
--
--     fixtures_reject_zero_score_past   (BEFORE INSERT)
--     fixtures_reject_null_teams        (BEFORE INSERT)
--     fixtures_reject_completed_downgrade(BEFORE UPDATE)
--
--   All three did an UNQUALIFIED `INSERT INTO fixtures_audit`. Under the
--   `search_path="pg_catalog, public"` they declared, the reference resolves
--   normally in a direct SQL session — but when invoked through PostgREST the
--   role/search_path combination differs and the reference fails, surfacing
--   as "relation does not exist". The triggers are also NOT SECURITY DEFINER,
--   so they execute as the invoking role (anon/authenticated), and
--   `fixtures_audit` has RLS enabled with FOR ALL deny policies for exactly
--   those roles.
--
--   The net effect: whenever a trigger needed to REJECT a row, the error the
--   operator saw was "relation does not exist" instead of the intended,
--   actionable rejection message — and the audit row was never written.
--
-- Fix: make all three functions SECURITY DEFINER (so they execute as their
-- owner, `postgres`, which bypasses RLS) and qualify every table reference
-- with `public.`. The search_path change and the body rewrite ship in the
-- SAME migration — required, because changing search_path alone would break
-- the unqualified references.
--
-- Verification (live, before/after):
--   before: INSERT past scheduled 0-0 -> ERROR: relation "fixtures_audit" does not exist
--   after:  INSERT past scheduled 0-0 -> rejected with the intended message
--           AND the audit row IS written to public.fixtures_audit.

-- ---------------------------------------------------------------------------
-- 1. Zero-score past scheduled guard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fixtures_reject_zero_score_past()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.status = 'scheduled'
     AND NEW.home_score = 0
     AND NEW.away_score = 0
     AND NEW.scheduled_at < NOW() THEN
    INSERT INTO public.fixtures_audit (fixture_id, violation_type, details)
    VALUES (NEW.id, 'zero_score_past_scheduled', jsonb_build_object(
      'home_team_id', NEW.home_team_id,
      'away_team_id', NEW.away_team_id,
      'league_id', NEW.league_id,
      'scheduled_at', NEW.scheduled_at
    ));
    RAISE EXCEPTION 'Cannot insert past game with 0-0 score and status=scheduled. This is the "0 - 0 parser" bug — set scores to NULL, not 0. See fixtures_audit for details.';
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. NULL team_id guard on protected leagues
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fixtures_reject_null_teams()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.league_id IN (
    '2b5f2b9d-84b9-4edb-8373-a732b72f4e40', -- NHL
    'b05d6d26-d5d6-4cfd-a48b-f5646fa7d611', -- AHL
    '425ae95a-db13-499a-96f4-a859a437b15c', -- PWHL
    'a08f6dac-eb1f-48b6-a11b-56fbb5642752'  -- KHL
  ) THEN
    IF NEW.home_team_id IS NULL OR NEW.away_team_id IS NULL THEN
      INSERT INTO public.fixtures_audit (fixture_id, violation_type, details)
      VALUES (NEW.id, 'null_team_ids', jsonb_build_object(
        'home_team_id', NEW.home_team_id,
        'away_team_id', NEW.away_team_id,
        'league_id', NEW.league_id,
        'scheduled_at', NEW.scheduled_at
      ));
      RAISE EXCEPTION 'Cannot insert fixture with NULL team_id on protected league %. Use abbrev→team_id lookup in sync script. See fixtures_audit for details.', NEW.league_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Completed -> scheduled downgrade guard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fixtures_reject_completed_downgrade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF OLD.status = 'completed'
     AND NEW.status = 'scheduled' THEN
    INSERT INTO public.fixtures_audit (fixture_id, violation_type, details)
    VALUES (NEW.id, 'completed_downgrade', jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'old_home_score', OLD.home_score,
      'old_away_score', OLD.away_score,
      'scheduled_at', NEW.scheduled_at
    ));
    RAISE EXCEPTION 'Cannot downgrade fixture from completed to scheduled. Use fill-gaps-only logic or delete+reinsert. See fixtures_audit for details.';
  END IF;
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.fixtures_reject_zero_score_past() IS
  'Rejects past fixtures with status=scheduled and 0-0 scores. SECURITY DEFINER + public.-qualified body so the fixtures_audit insert resolves and passes RLS when invoked via PostgREST.';
COMMENT ON FUNCTION public.fixtures_reject_null_teams() IS
  'Rejects fixtures with NULL team_id on protected leagues. SECURITY DEFINER + public.-qualified body so the fixtures_audit insert resolves and passes RLS when invoked via PostgREST.';
COMMENT ON FUNCTION public.fixtures_reject_completed_downgrade() IS
  'Rejects downgrading a completed fixture to scheduled. SECURITY DEFINER + public.-qualified body so the fixtures_audit insert resolves and passes RLS when invoked via PostgREST.';
