-- Migration: 002_add_indexes
-- Add performance indexes for NHL ingest cross-links.
-- Note: nhl_players.id IS the NHL numeric player ID (no separate player_id column).

BEGIN;

CREATE INDEX IF NOT EXISTS idx_fixtures_nhl_game_id
  ON fixtures ((game_data->>'nhl_game_id'))
  WHERE game_data->>'nhl_game_id' IS NOT NULL;

COMMENT ON INDEX idx_fixtures_nhl_game_id IS
  'Fast lookup of fixtures by NHL game ID. Used by play_by_play and stats cross-links.';

-- nhl_players.id = NHL numeric player ID (used by play_by_play.scorer_player_id)
CREATE INDEX IF NOT EXISTS idx_nhl_players_id
  ON nhl_players (id);

CREATE INDEX IF NOT EXISTS idx_nhl_players_current_team_id
  ON nhl_players (current_team_id);

CREATE INDEX IF NOT EXISTS idx_nhl_players_is_active
  ON nhl_players (is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_nhl_team_season_stats_season_team
  ON nhl_team_season_stats (season, team_id);

CREATE INDEX IF NOT EXISTS idx_ingest_audit_log_entity_season
  ON ingest_audit_log (entity_type, season);

CREATE INDEX IF NOT EXISTS idx_ingest_verify_failed_entity_season
  ON ingest_verify_failed (entity_type, season);

COMMENT ON COLUMN fixtures.game_data IS
  'JSONB: { nhl_game_id, round, gameTypeId, seasonId, awayTeam{abbr,id,name,score}, homeTeam{abbr,id,name,score}, gameState, period, periodTime }';

COMMIT;
