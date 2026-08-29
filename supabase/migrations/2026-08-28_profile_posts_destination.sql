-- 2026-08-28_profile_posts_destination.sql
-- Multi-destination posts: allow posting to personal profile, team, or league.
-- Backward-compatible: existing rows default to target_type='user' and
-- target_id = user_id so current personal-profile behavior is unchanged.

alter table if exists profile_posts
  add column if not exists target_type text not null default 'user' check (target_type in ('user','team','league')),
  add column if not exists target_id uuid;

-- Backfill: for existing rows, tie the post to the author's profile as the target.
-- This preserves current behavior where a post "belongs to" the user who wrote it.
update profile_posts
  set target_id = user_id
  where target_id is null;

alter table if exists profile_posts
  alter column target_id set not null;

-- Feed index: for team/league hubs we want newest posts by target.
create index if not exists profile_posts_target_created_idx
  on profile_posts (target_type, target_id, created_at desc)
  where deleted_at is null;

-- Keep the legacy user-feed index for personal profile pages.
-- The user_id column still exists and still matches target_id for target_type='user',
-- so existing queries remain valid.

comment on column profile_posts.target_type is 'Post destination: user, team, or league.';
comment on column profile_posts.target_id is 'ID of the destination: auth.users(id) for user, team_workspaces(id) for team, leagues(id) for league.';
