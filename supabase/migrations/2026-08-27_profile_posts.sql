-- 2026-08-27_profile_posts.sql
-- User profile posts / updates — like a lightweight tweet.
-- Appears on the user's public profile page under the "Posts" tab.

create table if not exists profile_posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(trim(body)) between 1 and 1000),
  media_url   text,   -- single optional image URL
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz  -- soft delete
);

-- Index for the public profile feed: latest non-deleted posts by user
create index if not exists profile_posts_user_created_idx
  on profile_posts (user_id, created_at desc)
  where deleted_at is null;

-- Index for dashboard listing: owner's own posts
create index if not exists profile_posts_user_created_all_idx
  on profile_posts (user_id, created_at desc);

-- RLS
alter table profile_posts enable row level security;

-- Owner can CRUD their own posts
create policy "profile_posts_owner_crud"
  on profile_posts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Anyone can read non-deleted posts (public profile feed)
create policy "profile_posts_public_read"
  on profile_posts
  for select
  using (deleted_at is null);

comment on table profile_posts is
  'Lightweight user update stream on public profiles. Max 1000 chars, optional one image.';
