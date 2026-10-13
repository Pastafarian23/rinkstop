-- 2026-10-12 (Part A): League active/defunct audit — safe batch
--
-- Per Arnel 2026-10-12 23:22 CDT directive:
--   - "duplicates should be removed" (verified, not assumed)
--   - "the 3 inactive must also be kept for historical value and cross link to current information"
--   - "Keep asia-league" (decision pending — see Part B)
--   - "do more research and try and fill in the gap of information" (Asia League)
--
-- Verified state (via PostgREST count of teams/fixtures under each league id):
--
--   INACTIVE LEAGUES WITH ACTIVE DUPLICATES (delete, data is on the active row):
--     del-germany  -> del         (Deutsche Eishockey Liga, country=Germany)
--     khl-russia   -> khl         (Kontinental Hockey League, country=Russia)
--     liiga-finland-> liiga       (Finnish Liiga, country=Finland, 36 teams)
--     shl-sweden   -> shl         (Swedish Hockey League, country=Sweden)
--     echl-usa     -> echl        (ECHL, country=USA, 30 teams)
--     sm-liiga     -> liiga       (SM-liiga, defunct 2013, old name for current Liiga)
--
--   ACTIVELY RUNNING LEAGUE WRONGLY MARKED INACTIVE (flip to active):
--     ajhl  (Alberta Junior Hockey League, 37 teams)
--
--   GENUINELY DEFUNCT WOMEN'S LEAGUES (keep inactive, cross-link to PWHL):
--     nwhl  (5 teams)
--     cwhl  (11 teams)
--     phf   (6 teams)
--     PWHL id: 376704ae-d854-462b-a25a-4eb829e20109
--
-- All DELETEs have hardcoded slug targets and use NOT EXISTS guards so
-- they are safe to re-run (no-op if the row is already gone).
-- All UPDATEs target specific slugs and are safe to re-run.
-- The merged_into_id column is added with IF NOT EXISTS guards.
--
-- The middleware redirect map in src/middleware.ts handles inbound Google
-- traffic pointing at the old slugs (308 permanent redirect).

-- =====================================================================
-- 1. Add merged_into_id column for historical cross-linking
-- =====================================================================

ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS merged_into_id uuid
    REFERENCES public.leagues(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leagues_merged_into_id
  ON public.leagues(merged_into_id)
  WHERE merged_into_id IS NOT NULL;

COMMENT ON COLUMN public.leagues.merged_into_id IS
  'When this league is defunct/merged, points to the current equivalent. Used to render a historical cross-link banner on league pages.';

-- =====================================================================
-- 2. Flip AJHL back to active (verified: 37 teams under this id)
-- =====================================================================

UPDATE public.leagues
   SET is_active = true
 WHERE slug = 'ajhl'
   AND is_active = false;

-- =====================================================================
-- 3. Delete the 6 inactive duplicates (verified: each has an active
--    equivalent with the actual data)
-- =====================================================================

-- DEL: 'del-germany' (inactive) vs 'del' (active)
DELETE FROM public.leagues
 WHERE slug = 'del-germany'
   AND EXISTS (SELECT 1 FROM public.leagues WHERE slug = 'del' AND is_active = true);

-- KHL: 'khl-russia' (inactive) vs 'khl' (active)
DELETE FROM public.leagues
 WHERE slug = 'khl-russia'
   AND EXISTS (SELECT 1 FROM public.leagues WHERE slug = 'khl' AND is_active = true);

-- Liiga: 'liiga-finland' (inactive) vs 'liiga' (active, 36 teams)
DELETE FROM public.leagues
 WHERE slug = 'liiga-finland'
   AND EXISTS (SELECT 1 FROM public.leagues WHERE slug = 'liiga' AND is_active = true);

-- SHL: 'shl-sweden' (inactive) vs 'shl' (active)
DELETE FROM public.leagues
 WHERE slug = 'shl-sweden'
   AND EXISTS (SELECT 1 FROM public.leagues WHERE slug = 'shl' AND is_active = true);

-- ECHL: 'echl-usa' (inactive) vs 'echl' (active, 30 teams)
DELETE FROM public.leagues
 WHERE slug = 'echl-usa'
   AND EXISTS (SELECT 1 FROM public.leagues WHERE slug = 'echl' AND is_active = true);

-- SM-liiga (defunct 2013, old name for current Liiga)
DELETE FROM public.leagues
 WHERE slug = 'sm-liiga'
   AND EXISTS (SELECT 1 FROM public.leagues WHERE slug = 'liiga' AND is_active = true);

-- =====================================================================
-- 4. Defunct women's leagues: keep inactive, set merged_into_id -> PWHL
-- =====================================================================
-- PWHL id from prod: 376704ae-d854-462b-a25a-4eb829e20109

UPDATE public.leagues
   SET merged_into_id = '376704ae-d854-462b-a25a-4eb829e20109'
 WHERE slug IN ('nwhl', 'cwhl', 'phf')
   AND merged_into_id IS NULL;

-- =====================================================================
-- Verification queries (run by hand after applying)
-- =====================================================================
-- Expected results:
--   SELECT slug, is_active FROM leagues WHERE slug IN ('ajhl','del-germany','khl-russia','liiga-finland','shl-sweden','echl-usa','sm-liiga');
--     Only 'ajhl' should appear, is_active=true.
--
--   SELECT slug, is_active, merged_into_id FROM leagues WHERE slug IN ('nwhl','cwhl','phf');
--     3 rows, is_active=false, merged_into_id=<PWHL id>.
--
--   SELECT COUNT(*) FROM leagues;
--     305 - 6 (duplicates) = 299 (or +1 if you counted asia-league-ice-hockey-world as one of the 12).
