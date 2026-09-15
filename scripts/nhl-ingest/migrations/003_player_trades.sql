-- Migration: 003_player_trades
-- Phase 7: trade tracking before dedupe
-- Records player team changes detected during reconciliation between sources.
-- Used by ingest scripts to audit known trades and prevent them from being
-- flagged as data inconsistencies.

BEGIN;

CREATE TABLE IF NOT EXISTS player_trade_log (
  id BIGSERIAL PRIMARY KEY,
  player_nhl_id BIGINT NOT NULL,           -- NHL.com numeric player ID (nhl_players.id)
  player_full_name TEXT NOT NULL,
  from_team TEXT,                           -- triCode (3-letter) before trade
  to_team TEXT,                             -- triCode (3-letter) after trade
  from_team_id BIGINT,                      -- NHL.com teamId before (numeric)
  to_team_id BIGINT,                        -- NHL.com teamId after (numeric)
  source_1 TEXT NOT NULL,                   -- 'nhl.com'
  source_2 TEXT,                            -- 'highlightly' or other
  detected_at TIMESTAMPTZ DEFAULT now(),
  trade_date_estimate DATE,                 -- best guess of actual trade date
  notes TEXT,
  UNIQUE (player_nhl_id, from_team, to_team)
);

COMMENT ON TABLE player_trade_log IS
  'Player trade events detected during cross-source reconciliation. Used to preserve trade history when deactivating duplicate legacy rows.';

CREATE INDEX IF NOT EXISTS idx_player_trade_log_player
  ON player_trade_log (player_nhl_id);

COMMIT;
