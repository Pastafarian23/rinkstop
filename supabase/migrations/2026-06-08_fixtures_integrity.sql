-- 2026-06-08_fixtures_integrity.sql
-- Data integrity defenses for the /fixtures table
-- Prevents NULL team_ids, NULL scores on past games, and other regressions
-- that broke the NHL historical database.

-- ─── 1. Audit log table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fixtures_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id UUID,
  violation_type TEXT NOT NULL,
  details JSONB,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  blocked_by TEXT DEFAULT current_user
);

CREATE INDEX IF NOT EXISTS idx_fixtures_audit_blocked_at ON fixtures_audit (blocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_fixtures_audit_violation_type ON fixtures_audit (violation_type);

-- ─── 2. Trigger: reject NULL team_ids on protected leagues ───────────────────
-- Protects: NHL, AHL, PWHL, KHL (the leagues that have complete team data)
-- WHL/OHL/QMJHL/NCAA are excluded because they don't have full team data yet
CREATE OR REPLACE FUNCTION fixtures_reject_null_teams()
RETURNS TRIGGER AS $$
BEGIN
  -- Protected league IDs (verified against /leagues table 2026-06-08)
  IF NEW.league_id IN (
    '2b5f2b9d-84b9-4edb-8373-a732b72f4e40', -- NHL
    'b05d6d26-d5d6-4cfd-a48b-f5646fa7d611', -- AHL
    '425ae95a-db13-499a-96f4-a859a437b15c', -- PWHL
    'a08f6dac-eb1f-48b6-a11b-56fbb5642752'  -- KHL
  ) THEN
    IF NEW.home_team_id IS NULL OR NEW.away_team_id IS NULL THEN
      INSERT INTO fixtures_audit (fixture_id, violation_type, details)
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fixtures_reject_null_teams_trigger ON fixtures;
CREATE TRIGGER fixtures_reject_null_teams_trigger
  BEFORE INSERT ON fixtures
  FOR EACH ROW
  EXECUTE FUNCTION fixtures_reject_null_teams();

-- ─── 3. Trigger: reject 0-0 scores on past games ─────────────────────────────
-- Prevents the "0 - 0" parser bug that created 20 phantom playoff games
-- Pattern: status='scheduled' + home_score=0 + away_score=0 + scheduled_at < now
CREATE OR REPLACE FUNCTION fixtures_reject_zero_score_past()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'scheduled'
     AND NEW.home_score = 0
     AND NEW.away_score = 0
     AND NEW.scheduled_at < NOW() THEN
    INSERT INTO fixtures_audit (fixture_id, violation_type, details)
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fixtures_reject_zero_score_past_trigger ON fixtures;
CREATE TRIGGER fixtures_reject_zero_score_past_trigger
  BEFORE INSERT ON fixtures
  FOR EACH ROW
  EXECUTE FUNCTION fixtures_reject_zero_score_past();

-- ─── 4. Trigger: reject downgrade from completed to scheduled ───────────────
-- Once a game is marked completed, it should never go back to scheduled
-- (unless the original insert was wrong, in which case it should be deleted and re-inserted)
CREATE OR REPLACE FUNCTION fixtures_reject_completed_downgrade()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'completed' AND NEW.status = 'scheduled' THEN
    INSERT INTO fixtures_audit (fixture_id, violation_type, details)
    VALUES (NEW.id, 'completed_to_scheduled_downgrade', jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'old_home_score', OLD.home_score,
      'old_away_score', OLD.away_score,
      'league_id', NEW.league_id
    ));
    RAISE EXCEPTION 'Cannot downgrade fixture from completed to scheduled. Use fill-gaps-only logic or delete+reinsert. See fixtures_audit for details.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fixtures_reject_completed_downgrade_trigger ON fixtures;
CREATE TRIGGER fixtures_reject_completed_downgrade_trigger
  BEFORE UPDATE ON fixtures
  FOR EACH ROW
  EXECUTE FUNCTION fixtures_reject_completed_downgrade();

-- ─── 5. Helper view: violations by day ───────────────────────────────────────
CREATE OR REPLACE VIEW fixtures_audit_daily AS
SELECT
  DATE_TRUNC('day', blocked_at)::DATE AS day,
  violation_type,
  COUNT(*) AS count
FROM fixtures_audit
GROUP BY day, violation_type
ORDER BY day DESC, violation_type;

COMMENT ON TABLE fixtures_audit IS 'Records every rejected fixture insert/update due to integrity violations. Check this table to find sync bugs.';
COMMENT ON VIEW fixtures_audit_daily IS 'Daily count of integrity violations by type. Use this to monitor sync script health.';

-- ─── 6. Permissions ──────────────────────────────────────────────────────────
-- The service role key bypasses RLS, so the trigger will fire even from sync scripts.
-- If you want only the trigger to bypass, you'd need to adjust RLS policies.
-- For now, the trigger fires for ALL inserts, including from service role.

-- Test: this should FAIL on the protected leagues
-- INSERT INTO fixtures (id, league_id, home_team_id, away_team_id, scheduled_at, status)
-- VALUES (gen_random_uuid(), '2b5f2b9d-84b9-4edb-8373-a732b72f4e40', NULL, NULL, NOW(), 'scheduled');
-- Expected error: "Cannot insert fixture with NULL team_id on protected league"

-- Test: this should FAIL (the 0-0 bug)
-- INSERT INTO fixtures (id, league_id, home_team_id, away_team_id, scheduled_at, status, home_score, away_score)
-- VALUES (gen_random_uuid(), '2b5f2b9d-84b9-4edb-8373-a732b72f4e40', gen_random_uuid(), gen_random_uuid(), NOW() - INTERVAL '1 day', 'scheduled', 0, 0);
-- Expected error: "Cannot insert past game with 0-0 score and status=scheduled"
