-- Track whether a highlight has at least one data source available
-- (YouTube transcript OR Highlightly match API).
-- Used by the article-from-highlight orchestrator to skip highlights
-- that we know we can't process.
ALTER TABLE highlight_backups
  ADD COLUMN IF NOT EXISTS data_available boolean DEFAULT true;

-- Add index for fast filtering
CREATE INDEX IF NOT EXISTS idx_highlight_backups_data_available
  ON highlight_backups (data_available)
  WHERE data_available = false;
