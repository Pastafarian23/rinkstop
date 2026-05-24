-- Highantly Data Sync Tables
-- Stores non-NHL hockey data from Highantly API

-- League registry
CREATE TABLE IF NOT EXISTS highlightly_leagues (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  country_name TEXT,
  logo TEXT,
  type TEXT,
  seasons INTEGER[],
  last_synced TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Teams
CREATE TABLE IF NOT EXISTS highlightly_teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  logo TEXT,
  country_code TEXT NOT NULL,
  league_id TEXT REFERENCES highlightly_leagues(id),
  league_name TEXT,
  last_synced TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Standings (per league, per season)
CREATE TABLE IF NOT EXISTS highlightly_standings (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL,
  league_name TEXT NOT NULL,
  season TEXT,
  rank INTEGER,
  team_id TEXT,
  team_name TEXT,
  team_logo TEXT,
  played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  overtime_losses INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  last_synced TIMESTAMP DEFAULT NOW(),
  UNIQUE(league_id, season, team_id)
);

-- Matches (schedules + results)
CREATE TABLE IF NOT EXISTS highlightly_matches (
  id TEXT PRIMARY KEY,
  date TIMESTAMP NOT NULL,
  status TEXT,
  home_team_id TEXT,
  home_team_name TEXT,
  home_team_logo TEXT,
  away_team_id TEXT,
  away_team_name TEXT,
  away_team_logo TEXT,
  home_score TEXT,
  away_score TEXT,
  period TEXT,
  league_id TEXT,
  league_name TEXT,
  country_code TEXT,
  venue TEXT,
  last_synced TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sync log (track what was updated when)
CREATE TABLE IF NOT EXISTS highlightly_sync_log (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'league', 'team', 'standings', 'matches'
  entity_id TEXT,
  action TEXT NOT NULL, -- 'created', 'updated', 'failed'
  details JSONB,
  api_calls_used INTEGER DEFAULT 0,
  synced_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leagues_country ON highlightly_leagues(country_code);
CREATE INDEX IF NOT EXISTS idx_teams_league ON highlightly_teams(league_id);
CREATE INDEX IF NOT EXISTS idx_standings_league ON highlightly_standings(league_id);
CREATE INDEX IF NOT EXISTS idx_matches_league ON highlightly_matches(league_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON highlightly_matches(date);
CREATE INDEX IF NOT EXISTS idx_sync_log_type ON highlightly_sync_log(entity_type);

-- Enable RLS
ALTER TABLE highlightly_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlightly_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlightly_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlightly_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlightly_sync_log ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read leagues" ON highlightly_leagues FOR SELECT USING (true);
CREATE POLICY "Public read teams" ON highlightly_teams FOR SELECT USING (true);
CREATE POLICY "Public read standings" ON highlightly_standings FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON highlightly_matches FOR SELECT USING (true);
CREATE POLICY "Public read sync log" ON highlightly_sync_log FOR SELECT USING (true);