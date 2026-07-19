-- SEO Batch 4: per-page overrides for highest-value page-2 candidates
--
-- Context: SEO Batch 1 (commit 76259a1, /directory/teams, shipped 2026-07-17)
-- confirmed the "lead H1/title with the keyword Google ranks for" pattern.
-- Batch 2 added seo_h1/seo_title columns + 4 rink seeds (held for 2026-07-24
-- deploy). Batch 3 (commit 1a47cda, awaiting merge) extended rink titles
-- with em-dash + country + intent signals for ALL rink pages.
--
-- Batch 4 (this migration) extends the seo_h1/seo_title seed list with the
-- top page-2 candidates that Batch 2 didn't cover. Targets verified from
-- `rinkstop-content/seo/gsc-90d-pages-full-2026-07-19.json` (90d ending
-- 2026-07-16).
--
-- Targets (only the page-2 rinks where the existing rink name does NOT lead
-- with the keyword Google ranks the page for):
--
--   1. kallang-ice-world                   251 imp, pos 16.1  / top 'singapore' (13), 'ice skating singapore' (9.5)
--      Current H1: 'Kallang Ice World'  →  should lead with 'Ice Skating in Singapore'
--   2. tekapo-springs-ice-rink             124 imp, pos 13.9  / NZ rink, top query unknown
--      Current H1: 'Tekapo Springs Ice Rink'  →  'Ice Skating in Tekapo — Tekapo Springs Ice Rink'
--   3. emirates-sports-arena-dubai-sports-city  107 imp, pos 11.6
--      Current H1: 'Emirates Sports Arena (Dubai Sports City)'  →  'Dubai Ice Rink — Emirates Sports Arena'
--   4. cerogrado-parque-bustamante          59 imp, pos 10.1  / Chile (Santiago Providencia)
--      Current H1: 'Cerogrado – Parque Bustamante'  →  'Ice Skating in Santiago — Cerogrado Parque Bustamante'
--   5. grimsby-leisure-centre-ice-rink      55 imp, pos 13.9  / UK rink
--      Current H1: 'Grimsby Leisure Centre Ice Rink'  →  keep as-is (name already descriptive)
--
-- The city/country page overrides (Philippines, IIHF, New York) are NOT in
-- this migration — those pages use a shared library function. They're
-- addressed in a separate code change in the same branch.
--
-- Deploy timing: ship after Batch 2 migration applies (seo_h1/seo_title
-- columns must exist first). If Batch 2 hold is lifted first, this can ship
-- the same deploy. If Batch 2 hold is extended, this migration is no-op
-- until columns exist.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + UPDATE by stable slug.

-- Same schema as Batch 2 — these are idempotent no-ops if Batch 2 already ran.
ALTER TABLE rinks
  ADD COLUMN IF NOT EXISTS seo_h1 TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT;

-- Batch 4 seeds (5 rinks). Batch 2 seeds (kallang, iceinline-alexandra,
-- planet-ice-widnes, snow-world-noida, lcc) are in
-- 2026-07-18_rinks_seo_columns.sql. Including kallang here with updated
-- copy (Batch 2's version led with 'Ice Skating in Singapore — Kallang Ice
-- World'; this version is tighter and adds country).

UPDATE rinks SET seo_h1 = 'Ice Skating in Singapore — Kallang Ice World',
                  seo_title = 'Kallang Ice World — Ice Skating & Ice Rink in Singapore'
  WHERE slug = 'kallang-ice-world'
    AND (seo_h1 IS NULL OR seo_h1 NOT LIKE 'Ice Skating in Singapore%');

UPDATE rinks SET seo_h1 = 'Ice Skating in Tekapo — Tekapo Springs Ice Rink',
                  seo_title = 'Tekapo Springs Ice Rink — Ice Skating in Lake Tekapo, NZ'
  WHERE slug = 'tekapo-springs-ice-rink'
    AND seo_h1 IS NULL;

UPDATE rinks SET seo_h1 = 'Dubai Ice Rink — Emirates Sports Arena',
                  seo_title = 'Emirates Sports Arena — Ice Rink in Dubai Sports City, UAE'
  WHERE slug = 'emirates-sports-arena-dubai-sports-city'
    AND seo_h1 IS NULL;

UPDATE rinks SET seo_h1 = 'Ice Skating in Santiago — Cerogrado Parque Bustamante',
                  seo_title = 'Cerogrado Parque Bustamante — Ice Skating Rink in Santiago, Chile'
  WHERE slug = 'cerogrado-parque-bustamante'
    AND seo_h1 IS NULL;

-- Grimsby already has a descriptive name. Skip override.

-- Rollback: UPDATE rinks SET seo_h1 = NULL, seo_title = NULL WHERE slug IN (...);