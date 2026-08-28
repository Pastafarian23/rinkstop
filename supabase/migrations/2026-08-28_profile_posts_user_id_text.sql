-- 2026-08-28_profile_posts_user_id_text.sql
-- Fix profile_posts.user_id to be TEXT (Clerk user ID), not UUID.
--
-- Root cause: profile_posts was created on 2026-08-27 with
--   user_id uuid not null references auth.users(id) on delete cascade
-- But this codebase uses Clerk for auth, NOT Supabase auth. Clerk
-- user IDs are TEXT strings starting with 'user_' (e.g.
-- 'user_3Etd1E64kor4sHx1sbnkK3vcnpL'). Supabase's auth.users table
-- has no rows for Clerk users, and the UUID type rejects the Clerk ID
-- syntax with "invalid input syntax for type uuid".
--
-- The codebase pattern (verified 2026-06-13 onwards, documented in
-- _HAND_APPLIED.md): public.profiles.user_id is TEXT (Clerk IDs),
-- and RLS policies use the cast pattern 'auth.uid()::text = user_id'.
-- profile_posts is the FIRST table to break from that convention.
--
-- Fix: change user_id to TEXT, drop the broken FK to auth.users,
-- add an FK to public.profiles(user_id) which IS the canonical
-- source of truth for "who is this user" in this codebase.
--
-- Idempotent: drops existing FK + alters column + adds new FK.

-- Drop the old FK to auth.users (UUID). This FK never worked anyway
-- because Clerk users have no rows in auth.users.
alter table profile_posts
  drop constraint if exists profile_posts_user_id_fkey;

-- Drop RLS policies that reference user_id. Postgres won't let us alter
-- a column type while a policy depends on it. We'll recreate them below.
drop policy if exists profile_posts_owner_crud on profile_posts;
drop policy if exists profile_posts_public_read on profile_posts;

-- Change column type from UUID to TEXT.
-- Postgres can't auto-cast UUID → TEXT, but our data IS text-formatted
-- (Clerk IDs), so the cast succeeds.
alter table profile_posts
  alter column user_id type text using user_id::text;

-- Add the canonical FK to public.profiles(user_id). profiles.user_id
-- is the Clerk user ID; this FK enforces that every post belongs to
-- a real user in our system.
alter table profile_posts
  add constraint profile_posts_user_id_fkey
  foreign key (user_id) references public.profiles(user_id)
  on delete cascade;

-- Recreate RLS policies with the canonical pattern (cast auth.uid() to
-- text to match the Clerk ID format).
create policy profile_posts_owner_crud
  on profile_posts
  for all
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

create policy profile_posts_public_read
  on profile_posts
  for select
  using (deleted_at is null);

-- Verify RLS still works. The original policies use
-- 'auth.uid()::text = user_id' which already worked with TEXT.
-- No policy changes needed.

-- The new body_or_image_check from the previous migration is
-- untouched. Idempotent.

comment on column profile_posts.user_id is
  'Clerk user ID (TEXT, e.g. user_3Etd1E64kor...). FK to public.profiles(user_id). Was wrongly typed UUID in 2026-08-27 migration.';
