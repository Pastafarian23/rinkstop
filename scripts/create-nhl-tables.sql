-- NHL & NCAAH Tables for RinkStop
-- Run this in Supabase Dashboard → SQL Editor

-- 1. NHL Teams (NCAA and NHL teams)
CREATE TABLE IF NOT EXISTS nhl_teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  logo TEXT,
  country_code TEXT DEFAULT 'US',
  league_id TEXT NOT NULL,  -- 'NCAA' or 'NHL'
  league_name TEXT NOT NULL, -- conference name or 'NHL'
  last_synced TIMESTAMPTZ DEFAULT NOW()
);

-- 2. NHL/NCAAM Standings
CREATE TABLE IF NOT EXISTS nhl_standings (
  id TEXT PRIMARY KEY, -- `${leagueName}-${teamId}-${season}`
  league_name TEXT NOT NULL,
  season TEXT NOT NULL,
  rank INTEGER,
  team_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  team_logo TEXT,
  played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  overtime_losses INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  last_synced TIMESTAMPTZ DEFAULT NOW()
);

-- 3. NHL/NCAA Matches
CREATE TABLE IF NOT EXISTS nhl_matches (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ,
  status TEXT,
  home_team_id TEXT,
  home_team_name TEXT,
  home_team_logo TEXT,
  home_score INTEGER,
  away_team_id TEXT,
  away_team_name TEXT,
  away_team_logo TEXT,
  away_score INTEGER,
  period INTEGER,
  clock TEXT,
  league_name TEXT NOT NULL,
  venue TEXT,
  last_synced TIMESTAMPTZ DEFAULT NOW()
);

-- 4. NHL Sync Log
CREATE TABLE IF NOT EXISTS nhl_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  details JSONB,
  api_calls_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_nhl_teams_league ON nhl_teams(league_id, league_name);
CREATE INDEX IF NOT EXISTS idx_nhl_standings_league ON nhl_standings(league_name);
CREATE INDEX IF NOT EXISTS idx_nhl_matches_league ON nhl_matches(league_name);
CREATE INDEX IF NOT EXISTS idx_nhl_matches_date ON nhl_matches(date DESC);