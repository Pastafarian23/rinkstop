-- 2026-10-22_profile_posts_target_columns_fix.sql
--
-- FIX for the "Could not find the 'target_id' column of 'profile_posts' in
-- the schema cache" error that broke ALL dashboard posting (text + media).
--
-- ROOT CAUSE
-- The feature migration `2026-08-28_profile_posts_destination.sql` was
-- written but NEVER APPLIED to production (it is not in _HAND_APPLIED.md,
-- and the columns are absent from the live table). Meanwhile
-- `src/app/api/profile-posts/route.ts` selects and inserts
-- `target_type` + `target_id` on every read and write. PostgREST validates
-- every column against its schema cache, so every single post attempt —
-- text and media alike — returned an error:
--   - text posts  -> "Could not find the 'target_id' column ... schema cache"
--   - media posts -> "Failed (500)" (same fault surfacing on the upload path)
--
-- WHY THIS FILE DIFFERS FROM THE ORIGINAL 2026-08-28 MIGRATION
-- The original declared `target_id uuid`. That is wrong for this codebase:
--   - target_type='user'    -> Clerk user ID, TEXT ('user_3Etd...')
--   - target_type='team'    -> team_workspaces.id, UUID
--   - target_type='league'  -> leagues.id,          UUID
-- A single column must hold both formats, so TEXT is correct. This matches
-- the convention already forced on user_id by
-- `2026-08-28_profile_posts_user_id_text.sql` (user_id is TEXT for exactly
-- this reason — Clerk IDs are not UUIDs).
--
-- No FK is added on target_id: the column is polymorphic across three
-- different parent tables, so a foreign key is impossible. Integrity for
-- team/league targets is enforced in the API layer by
-- resolveAuthorizedTarget() in src/app/api/profile-posts/route.ts, which
-- verifies ownership before insert.
--
-- DATA SAFETY
-- 1 existing row, 1 distinct author. The backfill below ties every existing
-- post to its own author as target (target_type='user'), which is exactly
-- the pre-migration behavior. No rows are deleted or modified beyond those
-- two columns.

-- 1. Add the columns. Idempotent.
alter table if exists public.profile_posts
  add column if not exists target_type text not null default 'user',
  add column if not exists target_id   text;

-- 2. Constrain target_type to the three allowed destinations.
--    Wrapped in a DO block so re-running against a table that already
--    carries the constraint is a no-op rather than an error.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profile_posts'::regclass
      and conname   = 'profile_posts_target_type_check'
  ) then
    alter table public.profile_posts
      add constraint profile_posts_target_type_check
      check (target_type in ('user','team','league'));
  end if;
end
$$;

-- 3. Backfill existing rows to their own author profile.
--    Preserves current behavior: a post "belongs to" the user who wrote it.
update public.profile_posts
   set target_type = 'user',
       target_id   = user_id
 where target_id is null;

-- 4. Enforce NOT NULL now that the backfill has populated every row.
alter table public.profile_posts
  alter column target_id set not null;

-- 5. Feed index: newest non-deleted posts for a destination.
create index if not exists profile_posts_target_created_idx
  on public.profile_posts (target_type, target_id, created_at desc)
  where deleted_at is null;

comment on column public.profile_posts.target_type is
  'Post destination: user, team, or league. Default ''user''.';
comment on column public.profile_posts.target_id is
  'Destination id as TEXT — must hold both Clerk ids (''user_...'') and uuid (team_workspaces.id / leagues.id). No FK: polymorphic across three parent tables; team/league ownership enforced in the API layer.';

-- 6. Tell PostgREST to drop its stale schema cache so the new columns are
--    visible immediately instead of after the next cache refresh cycle.
--    This is what actually clears "column ... in the schema cache".
notify pgrst, 'reload schema';