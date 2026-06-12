-- 2026-06-12_posts_cross_links.sql
--
-- Add cross-link columns to posts so articles can be linked from team,
-- league, and country pages. Without these columns, articles are
-- orphaned: a published article exists, but the team page, league page,
-- and country page have no way to know which articles are relevant.
--
-- Per Arnel 2026-06-12: "Cross-linking to player and team profiles is
-- necessary. These articles must be on the related team pages, leagues
-- pages, and player pages as well."

-- Foreign keys for team and league. These are nullable because not all
-- posts have a highlight (e.g. hand-written SEO guides).
alter table posts
  add column if not exists team_home_id uuid references teams(id) on delete set null,
  add column if not exists team_away_id uuid references teams(id) on delete set null,
  add column if not exists league_id uuid references leagues(id) on delete set null,
  add column if not exists game_date date,
  add column if not exists game_type text, -- 'regular', 'playoff', 'world-championship', etc.
  add column if not exists game_season integer;

-- Indexes for the article-feed queries on team / league / country pages.
-- The composite (team_home_id, published_at desc) lets us query
-- "latest 10 articles for team X" efficiently.
create index if not exists posts_team_home_id_published_at_idx
  on posts (team_home_id, published_at desc)
  where status = 'published' and team_home_id is not null;

create index if not exists posts_team_away_id_published_at_idx
  on posts (team_away_id, published_at desc)
  where status = 'published' and team_away_id is not null;

create index if not exists posts_league_id_published_at_idx
  on posts (league_id, published_at desc)
  where status = 'published' and league_id is not null;

create index if not exists posts_country_slug_published_at_idx
  on posts (country_slug, published_at desc)
  where status = 'published' and country_slug is not null;

create index if not exists posts_game_date_idx
  on posts (game_date)
  where status = 'published' and game_date is not null;

-- Comment for future devs
comment on column posts.team_home_id is 'FK to teams: home team for this game (set by rewriter from highlight_backups or NHL.com boxscore)';
comment on column posts.team_away_id is 'FK to teams: away team for this game (set by rewriter from highlight_backups or NHL.com boxscore)';
comment on column posts.league_id is 'FK to leagues: league for this game (set by rewriter from highlight_backups)';
comment on column posts.game_date is 'Date the game was played, in YYYY-MM-DD (set by rewriter)';
comment on column posts.game_type is 'regular | playoff | world-championship | memorial-cup | etc (set by rewriter)';
comment on column posts.game_season is 'Season year, e.g. 2026 for 2025-2026 season (set by rewriter)';
