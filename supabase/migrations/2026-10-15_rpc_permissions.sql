-- 2026-10-15: lock down is_game_indexable_batch to the service_role
-- only, and drop the unused single-id is_game_indexable.
--
-- Per Arnel 2026-10-15 05:11 step 2: the sitemap uses
-- supabaseAdmin which is created with SUPABASE_SERVICE_ROLE_KEY.
-- PostgREST exposes every function in the public schema to anyone
-- who can hit the API (anon, authenticated, service_role). Without
-- explicit GRANT/REVOKE, the anon key can call is_game_indexable_batch
-- — that's a small information-disclosure surface (any unauthenticated
-- visitor could probe which fixtures the sitemap considers indexable).
--
-- The single-id is_game_indexable is unused on the branch (the page
-- computes the predicate in JS via src/lib/game-indexable.ts). Drop
-- it to reduce attack surface.
--
-- DO NOT edit the already-applied migrations
-- 2026-10-14_game_indexable_rpc.sql and
-- 2026-10-14_game_indexable_batch_rpc.sql — this is a separate
-- migration so the deployed code and the deployed schema stay
-- traceable per commit.

-- 1. Lock down the batch function. service_role can call it; anon
-- and authenticated (and the implicit PUBLIC group) cannot.
REVOKE EXECUTE ON FUNCTION public.is_game_indexable_batch(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_game_indexable_batch(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_game_indexable_batch(uuid[]) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.is_game_indexable_batch(uuid[]) TO service_role;

-- 2. Drop the unused single-id function. Verifying zero callers on
-- the branch: `git grep is_game_indexable\\( src/` shows only
-- `is_game_indexable_batch`. The sitemap route uses the batch form.
-- The single-id form was added as a potential per-page check during
-- the initial Phase 3 work but never wired up. Safe to drop.
DROP FUNCTION IF EXISTS public.is_game_indexable(uuid);
