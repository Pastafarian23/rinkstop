-- 2026-06-15-post-slug-redirects.sql
--
-- Adds the post_slug_redirects table for clean URL migrations.
--
-- Context: We changed the post slug format from
--   {seo_title-slugified-with-score-and-ids}
-- to
--   {home-team-slug}-{away-team-slug}-{YYYY-MM-DD}
--
-- Every existing post needs a 308 redirect from the old slug to the new
-- one. The middleware (src/middleware.ts) looks up old_slug → new_slug
-- in this table on /news/[slug] requests.
--
-- The canonical URL stays as posts.slug. After the backfill,
-- posts.slug is the clean format and the old slug lives here as
-- a from_slug → to_slug row.
--
-- Per docs/CLEAN-POST-SLUGS-SPEC.md §5.

create table if not exists post_slug_redirects (
  id uuid primary key default gen_random_uuid(),
  from_slug text not null unique,
  to_slug text not null,
  post_id uuid references posts(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Single-row lookup index. The hot path is "given from_slug, what's
-- the to_slug?" — one indexed row, no scan.
create index if not exists post_slug_redirects_from_slug_idx
  on post_slug_redirects (from_slug);

-- Reverse index for the verification script ("which redirects point
-- to this new slug?"). Not on the hot path.
create index if not exists post_slug_redirects_to_slug_idx
  on post_slug_redirects (to_slug);

-- Comment for future devs
comment on table post_slug_redirects is
  '308 redirects for posts whose slug changed. Middleware looks up from_slug → to_slug on /news/[slug] misses. Populated by scripts/article-from-highlight/backfill-clean-slugs.mjs.';

comment on column post_slug_redirects.from_slug is
  'The old slug (used in the URL the user/Google has)';

comment on column post_slug_redirects.to_slug is
  'The new canonical slug (lives on posts.slug after backfill)';

comment on column post_slug_redirects.post_id is
  'FK to posts. Cascade on delete so a deleted post cleans up its redirects.';

-- RLS: this table is server-only. The middleware uses supabaseAdmin
-- (service role) which bypasses RLS. Anonymous/authenticated users
-- never need to read this directly. Block all anon access.
alter table post_slug_redirects enable row level security;

-- No policies = no anon access. Service role bypasses RLS for middleware.
