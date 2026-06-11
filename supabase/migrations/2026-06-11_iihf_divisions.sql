-- Add IIHF Division assignment columns to iihf_member_nations
-- mens_division: text (e.g., 'Top Division', 'Division I A', 'Division II B')
-- mens_division_rank: int (1 = highest ranked team in that division)
-- division_as_of: text (year of the most recent IIHF World Championship the assignment reflects)

ALTER TABLE iihf_member_nations
  ADD COLUMN IF NOT EXISTS mens_division text,
  ADD COLUMN IF NOT EXISTS mens_division_rank int,
  ADD COLUMN IF NOT EXISTS division_as_of text;

COMMENT ON COLUMN iihf_member_nations.mens_division IS 'IIHF men''s senior World Championship division (e.g., Top Division, Division I A). NULL = not currently an IIHF member or no team.';
COMMENT ON COLUMN iihf_member_nations.mens_division_rank IS '1-based ranking within the division. 1 = highest ranked team in that division.';
COMMENT ON COLUMN iihf_member_nations.division_as_of IS 'Year the division assignment reflects. Refreshed when IIHF World Championship finishes.';

-- Index for queries filtering by division
CREATE INDEX IF NOT EXISTS iihf_member_nations_mens_division_idx
  ON iihf_member_nations (mens_division);
