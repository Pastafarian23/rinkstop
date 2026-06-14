-- 2026-06-13-follows.sql
-- Follow table: a user can follow another user OR a directory entity
-- (player, team, rink, league). Mirrors the favorites table pattern.
--
-- Unlike favorites, follows can target users — that's the only new shape.
-- Application layer (API routes) enforces that auth user is the follower.

CREATE TABLE IF NOT EXISTS public.follows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_user_id text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  followee_type text NOT NULL CHECK (followee_type IN ('player', 'team', 'rink', 'league', 'user')),
  followee_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- A user can follow a given target only once. Compound unique.
  CONSTRAINT follows_unique_follow UNIQUE (follower_user_id, followee_type, followee_id),
  -- Can't follow yourself when the target is a user.
  CONSTRAINT follows_no_self_follow CHECK (
    followee_type <> 'user' OR followee_id <> follower_user_id
  )
);

-- Indexes for common lookups:
-- "What is user X following?"
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_user_id, created_at DESC);
-- "Who follows this target?"
CREATE INDEX IF NOT EXISTS idx_follows_target ON public.follows(followee_type, followee_id);
-- "Does user X follow target Y?" (the most common status check)
CREATE INDEX IF NOT EXISTS idx_follows_lookup ON public.follows(follower_user_id, followee_type, followee_id);

-- Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Policies mirror favorites: a user can manage their own follow rows; everyone can read counts.
-- Reading the table is needed for follower/following counts on profile pages, so SELECT is public.
DROP POLICY IF EXISTS follows_select ON public.follows;
CREATE POLICY follows_select ON public.follows FOR SELECT USING (true);

DROP POLICY IF EXISTS follows_insert_own ON public.follows;
CREATE POLICY follows_insert_own ON public.follows
  FOR INSERT WITH CHECK ((auth.uid())::text = follower_user_id);

DROP POLICY IF EXISTS follows_delete_own ON public.follows;
CREATE POLICY follows_delete_own ON public.follows
  FOR DELETE USING ((auth.uid())::text = follower_user_id);

-- No UPDATE policy: if you want to change a follow, delete and re-insert.
-- This is intentional and matches the favorites pattern.
