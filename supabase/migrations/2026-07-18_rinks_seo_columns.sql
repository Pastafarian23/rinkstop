-- Add SEO override columns to rinks table
--
-- Context: /directory/teams fix (commit 57cb6a4, 2026-07-17) shipped the pattern
-- "lead H1/title with the keyword Google already ranks the page for." That fix
-- moved /directory/teams position from ~40 → ~28 in 7 days (verified via GSC API
-- on 2026-07-18). Next batch targets 4 rink pages where GSC shows the page
-- ranking for a different keyword than the H1 currently uses:
--
--   1. kallang-ice-world          90d: 233 imp / pos 16.4 / top "ice skating singapore"
--   2. iceinline-alexandra        90d: 221 imp / pos 8.7  / top "iceinline alexandra"
--   3. planet-ice-widnes          90d: 188 imp / pos 9.8  / top "planet ice widnes"
--   4. snow-world-noida-dlf-mall  90d: 144 imp / pos 10.0 / top "dlf ice skating"
--
-- The rink detail page reads `rink.name` directly into the H1 and title. To
-- lift these specific pages, we need a per-rink SEO override that falls back to
-- the current behavior when null. Pattern matches the existing `posts` table
-- (seo_title, seo_description columns) and avoids touching the data of the
-- other ~1,000 rinks.
--
-- Idempotent: safe to re-run. ADD COLUMN IF NOT EXISTS + DROP NOT NULL where
-- applicable.
--
-- Deploy timing: this migration runs as part of the same Vercel deploy that
-- updates src/app/directory/rinks/[slug]/page.tsx. Hold deploy until
-- 2026-07-24 (7 days after the /directory/teams fix) so we can confirm the
-- pattern holds before deploying the next batch.

ALTER TABLE rinks
  ADD COLUMN IF NOT EXISTS seo_h1 TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT;

COMMENT ON COLUMN rinks.seo_h1 IS
  'Optional H1 override for the rink detail page. If null, falls back to name. Used for per-page SEO lifts where the rink name is not the keyword Google ranks for (e.g., "Ice Skating in Singapore" for kallang-ice-world).';

COMMENT ON COLUMN rinks.seo_title IS
  'Optional title override (without the " | RinkStop" suffix — the layout appends that). If null, falls back to "{name} -- Ice Rink in {city}, {province}".';

-- Seed the 4 target rinks with their SEO overrides. Hardcoded IDs/values from
-- the rink rows as of 2026-07-18. If a rink is renamed, these need to be
-- re-verified (the lookup is by slug which is stable).

UPDATE rinks SET seo_h1 = 'Ice Skating in Singapore — Kallang Ice World',
                  seo_title = 'Kallang Ice World — Ice Skating & Ice Rink in Singapore'
  WHERE slug = 'kallang-ice-world';

UPDATE rinks SET seo_h1 = 'Ice Skating in Alexandra — Iceinline Alexandra',
                  seo_title = 'Iceinline Alexandra — Ice Skating Rink in Alexandra, NZ'
  WHERE slug = 'iceinline-alexandra';

UPDATE rinks SET seo_h1 = 'Planet Ice Widnes — Ice Rink & Skating in Widnes',
                  seo_title = 'Planet Ice Widnes — Ice Rink & Skating in Widnes, UK'
  WHERE slug = 'planet-ice-widnes';

UPDATE rinks SET seo_h1 = 'Ice Skating in Noida — Snow World at DLF Mall of India',
                  seo_title = 'Snow World Noida — DLF Mall Ice Skating & Skating Rink'
  WHERE slug = 'snow-world-noida-dlf-mall-of-india';

UPDATE rinks SET seo_h1 = 'Ice Skating in Liverpool (NSW) — LCC Ice Rink',
                  seo_title = 'LCC Ice Rink — Liverpool Ice Skating at Liverpool Catholic Club'
  WHERE slug = 'lcc-ice-rink-liverpool-catholic-club';
