-- 2026-09-04: per-post autolink opt-out.
-- The autolink pass in src/components/FullArticle.tsx wraps any bare word in
-- the article body that matches a DB team/league/rink name. For analysis
-- articles where country names ("Canada", "USA"), league acronyms ("AHL",
-- "ECHL"), and generic words ("sport", "championship") appear as prose, the
-- autolink produces false-positive inline links to wrong slugs (e.g.
-- "Canada" -> /directory/teams/canada, the national team, instead of the
-- Hockey Canada federation entity). Setting disable_autolink=true on the
-- post skips the pass. Defaults to false — every existing article continues
-- to be autolinked unless explicitly opted out.
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS disable_autolink boolean NOT NULL DEFAULT false;
