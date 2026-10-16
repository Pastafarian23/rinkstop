-- 2026-10-16_profile_posts_sport.sql
-- Add sport column to profile_posts — was planned but never migrated.
-- API route already handles insert/select of this column.

alter table profile_posts
  add column if not exists sport text
  check (sport in (
    'hockey',
    'figure_skating',
    'speed_skating',
    'basketball',
    'soccer',
    'baseball',
    'other'
  ));

-- Backfill NULL → 'hockey' for existing rows (existing posts are mostly hockey)
update profile_posts set sport = 'hockey' where sport is null;

-- Index for sport-filtered queries
create index if not exists profile_posts_sport_idx
  on profile_posts (sport)
  where sport is not null;

-- Notify PostgREST to pick up the schema change
notify pgrst, 'reload schema';
