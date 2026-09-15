-- Migration: 001_ingest_audit_tables
-- Phase 1 of NHL 2025-26 data ingest
-- Creates audit + verification tables for the multi-source reconciliation framework.

BEGIN;

-- =============================================================================
-- ingest_audit_log: one row per ingest batch
-- =============================================================================
CREATE TABLE IF NOT EXISTS ingest_audit_log (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,            -- 'schedule' | 'roster' | 'skater_stats' | ...
  season TEXT NOT NULL,                -- '2025-26'
  phase INT NOT NULL,                  -- 1=schedule, 2=standings, 3=rosters, 4=stats, etc.
  source_1 TEXT NOT NULL,              -- 'nhl.com'
  source_2 TEXT NOT NULL,             -- 'wikipedia' | 'hockey-reference' | 'highlightly'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  rows_pulled_s1 INT,
  rows_pulled_s2 INT,
  rows_matched INT,                    -- inserted with source agreement
  rows_flagged INT,                    -- inserted with source flag (present in 1 source only)
  rows_rejected INT,                   -- rejected (source disagreement)
  rows_inserted INT,                   -- total rows actually inserted into target table
  flag_details JSONB,                  -- array of { key, source, diff } for rejected/flagged rows
  status TEXT NOT NULL DEFAULT 'running',  -- 'running' | 'completed' | 'failed'
  error_message TEXT
);

COMMENT ON TABLE ingest_audit_log IS
  'Audit trail for every NHL ingest batch. One row per ingest run per entity type per season.';

-- =============================================================================
-- ingest_verify_failed: rows that disagreed between sources (manual review queue)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ingest_verify_failed (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  season TEXT NOT NULL,
  phase INT NOT NULL,
  canonical_key TEXT NOT NULL,           -- e.g. 'game:2025020014', 'player:8475791'
  source_1_name TEXT NOT NULL,
  source_2_name TEXT NOT NULL,
  source_1_data JSONB,
  source_2_data JSONB,
  diff JSONB,                            -- { fieldName: { source_1: value, source_2: value } }
  failed_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,                      -- 'arnel' | 'kiloclw'
  resolution_notes TEXT
);

COMMENT ON TABLE ingest_verify_failed IS
  'Manual review queue for rows where sources disagreed. DO NOT auto-insert these. Review each one.';

-- =============================================================================
-- nhl_team_season_stats: per-season team statistics
-- Decoupled from team_workspaces so each season can have its own stat snapshot.
-- =============================================================================
CREATE TABLE IF NOT EXISTS nhl_team_season_stats (
  id BIGSERIAL PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES team_workspaces(id) ON DELETE CASCADE,
  season TEXT NOT NULL,                  -- '2025-26'
  season_id INT,                         -- NHL.com seasonId: 20252026
  games_played INT,
  wins INT,
  losses INT,
  overtime_losses INT,
  points INT,
  goals_for INT,
  goals_against INT,
  pp_pct NUMERIC(5,2),
  pk_pct NUMERIC(5,2),
  shots_for_per_game NUMERIC(6,2),
  shots_against_per_game NUMERIC(6,2),
  faceoff_win_pct NUMERIC(5,2),
  shutouts INT,
  -- Source tracking
  source_1 TEXT,                        -- 'nhl.com'
  source_2 TEXT,                        -- 'wikipedia' | 'hockey-reference'
  cross_verify_status TEXT DEFAULT 'pending',  -- 'pending' | 'verified' | 'flagged' | 'rejected'
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Natural key
  UNIQUE (season, team_id)
);

COMMENT ON TABLE nhl_team_season_stats IS
  'Per-season NHL team statistics. Populated by multi-source reconciliation: NHL.com primary + Wikipedia/Hockey-Reference cross-check.';

-- =============================================================================
-- Add nhl_game_id index to fixtures (for fast cross-link lookups)
-- =============================================================================
-- This is a generated column that extracts nhl_game_id from game_data if present.
-- PostgreSQL doesn't support generated columns that reference JSON in all versions,
-- so we use a functional index instead.

CREATE INDEX IF NOT EXISTS idx_fixtures_nhl_game_id
  ON fixtures ((game_data->>'nhl_game_id'))
  WHERE game_data->>'nhl_game_id' IS NOT NULL;

COMMENT ON INDEX idx_fixtures_nhl_game_id IS
  'Fast lookup of fixtures by NHL game ID. Used by play_by_play and stats cross-links.';

-- =============================================================================
-- Add nhl_player_id index to nhl_players (for cross-links from play_by_play)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_nhl_players_player_id
  ON nhl_players (player_id);

CREATE INDEX IF NOT EXISTS idx_nhl_players_current_team
  ON nhl_players (current_team_id);

CREATE INDEX IF NOT EXISTS idx_nhl_players_is_active
  ON nhl_players (is_active) WHERE is_active = true;

-- =============================================================================
-- Add season + team_id index to nhl_team_season_stats
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_nhl_team_season_stats_season_team
  ON nhl_team_season_stats (season, team_id);

-- =============================================================================
-- Update fixtures.game_data comment to document the expected structure
-- =============================================================================
COMMENT ON COLUMN fixtures.game_data IS
  'JSONB containing: { nhl_game_id, round (preseason|regular-season|post-season), gameTypeId, seasonId, awayTeam { abbr, id, name, score }, homeTeam { abbr, id, name, score }, gameState, period, periodTime }';

COMMIT;
