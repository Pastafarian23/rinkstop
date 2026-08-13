-- Add index on fixtures.scheduled_at to speed up /api/scores and /directory/games.
-- The query sorts by scheduled_at DESC; without an index this does a sequential
-- scan of all 9,622 rows before limiting to 50.
--
-- Verified 2026-08-13:
--   Pre-index: ~565ms for simple order+limit 50
--   Post-index: expect <50ms
--
-- Idempotent: skip if index already exists.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'fixtures'
      AND indexname = 'idx_fixtures_scheduled_at'
  ) THEN
    CREATE INDEX idx_fixtures_scheduled_at
      ON public.fixtures (scheduled_at DESC);
  END IF;
END $$;
