-- WS25 follow-up (2026-08-24): mark "bare" duplicate player rows as
-- non-claimable so they don't show a "Sign in to claim" CTA on an NHL
-- (or AHL/KHL/PWHL) player's profile.
--
-- Background: the WS25 migration (2026-08-23) marked NHL/AHL/KHL/PWHL
-- players claimable=false by joining players → teams → leagues. That
-- requires the player row to have team_id set. Several players have
-- bare rows (team_id NULL, no league hydration) that are duplicates of
-- the NHL/AHL/KHL/PWHL-curated rows. On slug lookup those bare rows
-- win, and they still render the claim CTA — which is wrong.
--
-- Fix: for any bare player row whose name matches a player that IS
-- already correctly marked claimable=false (because they have a pro
-- league team), mark the bare row claimable=false too. This is a
-- name-based dedup, conservative (only matches existing claimable=false
-- rows), and idempotent.
--
-- Also: rename the slug on the bare row to append a suffix so the
-- NHL-curated row's slug wins on lookup. The NHL-curated row already
-- has the better data (team, league, bio, etc.) and should be canonical.

BEGIN;

-- 1) Mark bare duplicates as non-claimable.
-- A "bare duplicate" = same first+last name as a claimable=false row,
-- AND team_id IS NULL (so the original WS25 join missed it).
UPDATE public.players p_bare
SET claimable = FALSE
WHERE p_bare.team_id IS NULL
  AND p_bare.claimable = TRUE
  AND EXISTS (
    SELECT 1
    FROM public.players p_pro
    WHERE p_pro.claimable = FALSE
      AND LOWER(TRIM(COALESCE(p_pro.first_name, ''))) = LOWER(TRIM(COALESCE(p_bare.first_name, '')))
      AND LOWER(TRIM(COALESCE(p_pro.last_name, ''))) = LOWER(TRIM(COALESCE(p_bare.last_name, '')))
      AND p_pro.id <> p_bare.id
  );

-- 2) Suffix the slug on bare duplicates so the curated row's slug wins
--  -- on lookup. We append the bare row's id prefix to make it unique.
--  -- Only do this when the bare row's slug collides with a curated
--  -- (claimable=false) row's slug.
UPDATE public.players p_bare
SET slug = p_bare.slug || '-dup-' || LEFT(p_bare.id::text, 8)
WHERE p_bare.team_id IS NULL
  AND p_bare.claimable = FALSE
  AND EXISTS (
    SELECT 1
    FROM public.players p_pro
    WHERE p_pro.claimable = FALSE
      AND p_pro.slug = p_bare.slug
      AND p_pro.id <> p_bare.id
  );

COMMIT;

-- Verification query (run manually):
-- SELECT id, first_name, last_name, slug, team_id, claimable
-- FROM public.players
-- WHERE LOWER(first_name || ' ' || last_name) IN ('noel acciari')
-- ORDER BY last_name, first_name;
