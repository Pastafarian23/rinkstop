-- Phase 7 (Option B): Add location slug columns to posts table.
--
-- Why: blog posts need an explicit way to tie content to specific
-- cities/states/countries so the article→directory link equity flow
-- works regardless of name-matching autolink accuracy.
--
-- Slug-based instead of FK-based because the directory uses slug-based
-- URL paths (/directory/{country}/{state}/{city}) and there's no
-- dedicated cities/states/countries lookup table. The slugs match
-- those URL segments exactly, so we can build directory links from
-- these columns without joins.
--
-- All columns nullable: existing posts don't need backfilling.

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS country_slug TEXT,
  ADD COLUMN IF NOT EXISTS state_slug TEXT,
  ADD COLUMN IF NOT EXISTS city_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_posts_country_slug ON posts(country_slug);
CREATE INDEX IF NOT EXISTS idx_posts_state_slug ON posts(state_slug);
CREATE INDEX IF NOT EXISTS idx_posts_city_slug ON posts(city_slug);