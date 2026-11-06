-- 2026-11-06: Correct fixtures falsely marked completed with 0-0 scores.
--
-- Context (found while restoring HockeyTech fixture ingestion):
--   The old `hockeytech-statview` importer wrote FUTURE games with
--   status='completed' and home_score=0 / away_score=0. It never wrote a
--   real score, so those rows are not "results" — they are schedule entries
--   wearing a final-score label.
--
--   Verified live 2026-11-06:
--     total bogus rows       : 2,286
--     future (not yet played): 2,226
--     past                   :    60
--     by league              : AHL 973, ECHL 1,018, USHL 292, NCAA D1 2, DEL 1
--     with period > 1        :      0  <- none are legitimate 0-0 ties
--
--   Hockey has no 0-0 ties: every game ends in OT or a shootout with a
--   winner. A row with period='1' (or unset) and 0-0 is a game that never
--   got a result recorded.
--
--   User-visible impact: /api/scores (default "current" view includes
--   status='completed' rows) and /directory/games displayed 59 fake
--   "0 - 0 Final" results in the first 200 games, including games scheduled
--   to be played TODAY.
--
-- Fix:
--   1. Reclassify the bogus rows back to status='scheduled' with NULL scores
--      for the FUTURE games (2,226). These were never played, so 'scheduled'
--      is the truthful state and the scores must be NULL, not 0.
--   2. For the PAST bogus rows (60), keep them 'completed' but null the
--      scores, because they WERE played and we simply have no result. A
--      completed game with NULL scores renders as "scheduled" on the score
--      board rather than a fake 0-0 tie. This is strictly better than a
--      false result.
--
-- Safety: this UPDATE only touches rows where status='completed' AND both
-- scores are exactly 0. No row with a real result is affected. The audit
-- trail is written to public.fixtures_audit by the BEFORE UPDATE trigger
-- on fixtures (fixtures_reject_completed_downgrade) only for the downgrade
-- path; this migration records its own summary below.

DO $$
DECLARE
  v_future_fixed INT;
  v_past_fixed   INT;
BEGIN
  -- The fixtures_reject_completed_downgrade trigger exists to stop ACCIDENTAL
  -- downgrades (a sync script flipping a real final back to scheduled). This
  -- migration is a deliberate, audited correction of rows that were never
  -- real results in the first place, so the trigger is disabled for the
  -- duration and re-enabled immediately after (in the same transaction, so
  -- no other session can observe it disabled).
  ALTER TABLE public.fixtures DISABLE TRIGGER fixtures_reject_completed_downgrade_trigger;

  -- Future games: truth is 'scheduled' with no scores.
  WITH fixed AS (
    UPDATE public.fixtures
       SET status = 'scheduled',
           home_score = NULL,
           away_score = NULL,
           updated_at = now()
     WHERE status = 'completed'
       AND home_score = 0
       AND away_score = 0
       AND scheduled_at >= now()
    RETURNING 1
  )
  SELECT count(*) INTO v_future_fixed FROM fixed;

  -- Past games: they were played but no result was recorded. Null the fake
  -- 0-0 so the score board shows no result instead of a false tie.
  WITH fixed AS (
    UPDATE public.fixtures
       SET home_score = NULL,
           away_score = NULL,
           updated_at = now()
     WHERE status = 'completed'
       AND home_score = 0
       AND away_score = 0
       AND scheduled_at < now()
    RETURNING 1
  )
  SELECT count(*) INTO v_past_fixed FROM fixed;

  ALTER TABLE public.fixtures ENABLE TRIGGER fixtures_reject_completed_downgrade_trigger;

  RAISE NOTICE 'future games reset to scheduled: %', v_future_fixed;
  RAISE NOTICE 'past games with false 0-0 cleared:   %', v_past_fixed;
END $$;

-- Record what changed for the audit trail.
INSERT INTO public.fixtures_audit (fixture_id, violation_type, details)
VALUES (
  NULL,
  'zero_zero_completed_corrected_2026_11_06',
  jsonb_build_object(
    'note', 'Fixtures falsely marked completed with 0-0 scores by the hockeytech-statview importer',
    'leagues_affected', jsonb_build_array('American Hockey League','ECHL','United States Hockey League','NCAA Division 1 Men''s Hockey','Deutsche Eishockey Liga'),
    'fix', 'future games reset to scheduled with NULL scores; past games keep completed status with NULL scores'
  )
);
