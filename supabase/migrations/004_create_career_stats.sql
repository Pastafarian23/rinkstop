-- Career stats table for players
-- Stores per-season, per-league player statistics from Highlightly NHL/NCAAH API

CREATE TABLE IF NOT EXISTS highlightly_career_stats (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  player_name TEXT,
  league_id TEXT,
  league_name TEXT,
  season TEXT NOT NULL,
  season_type TEXT DEFAULT 'regular' CHECK (season_type IN ('regular', 'playoffs', 'combined')),
  -- General stats
  games_played INTEGER DEFAULT 0,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  penalty_minutes INTEGER DEFAULT 0,
  plus_minus INTEGER DEFAULT 0,
  -- Goalie stats (nullable - only for goalies)
  wins INTEGER,
  losses INTEGER,
  overtime_losses INTEGER,
  goals_against INTEGER,
  saves INTEGER,
  save_percentage NUMERIC(5,3),
  goals_against_average NUMERIC(5,2),
  shutouts INTEGER,
  -- JSON for additional stats per season
  additional_stats JSONB DEFAULT '{}',
  last_synced TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, season, season_type)
);

-- Enable RLS
ALTER TABLE highlightly_career_stats ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read career stats" ON highlightly_career_stats FOR SELECT USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_career_stats_player ON highlightly_career_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_career_stats_league ON highlightly_career_stats(league_id);
CREATE INDEX IF NOT EXISTS idx_career_stats_season ON highlightly_career_stats(season);
CREATE INDEX IF NOT EXISTS idx_career_stats_player_season ON highlightly_career_stats(player_id, season DESC);