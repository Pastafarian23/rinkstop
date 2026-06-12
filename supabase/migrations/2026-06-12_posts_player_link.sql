-- Add player_id cross-link to posts (per Arnel, 2026-06-12).
-- Articles may feature a specific player (e.g. goal scorer of the night).
-- When we can match by name to highlight metadata, store the FK.
-- Used for the player page cross-link (articles that feature this player)
-- in addition to the team cross-link (team_home_id/team_away_id).

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS player_id uuid NULL REFERENCES players(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_player_id_idx
  ON posts (player_id)
  WHERE player_id IS NOT NULL
    AND status = 'published';

COMMENT ON COLUMN posts.player_id IS 'Cross-link to players: the featured player in this article (matched by name from highlight metadata).';
