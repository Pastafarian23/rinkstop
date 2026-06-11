-- Add brand_id column to teams table to enable "Teams Using {brand}" link
-- from brand pages back to team pages.
--
-- brand_id is nullable (most teams won't have a brand affiliation).
-- ON DELETE SET NULL: if a brand is removed, the team's brand_id clears rather
-- than the team getting deleted.

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES brands(id) ON DELETE SET NULL;

-- Index for fast "find all teams using brand X" lookups
CREATE INDEX IF NOT EXISTS teams_brand_id_idx ON teams (brand_id);
