-- Add columns for the data we dropped from the backfill
ALTER TABLE nhl_players
  ADD COLUMN IF NOT EXISTS birth_place TEXT,
  ADD COLUMN IF NOT EXISTS position_abbreviation TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN,
  ADD COLUMN IF NOT EXISTS current_team_name TEXT,
  ADD COLUMN IF NOT EXISTS current_team_abbreviation TEXT,
  ADD COLUMN IF NOT EXISTS current_team_logo TEXT,
  ADD COLUMN IF NOT EXISTS league_name TEXT;
