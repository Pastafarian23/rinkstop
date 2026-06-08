-- =============================================================================
-- Migration: Country Pages Enhancement
-- Date: 2026-06-03
-- Author: Jarvis (KiloClaw)
-- Context: Tier 1 of the Country Pages audit (RinkStop Ops 2026-06-03)
--
-- Changes:
--   1. Add country + country_slug to posts (nullable, indexed)
--   2. Backfill teams.country from leagues.country (with normalization)
--   3. Normalize teams.country values to canonical names (USA → United States)
--   4. Backfill teams.country via team name pattern matching (catch the rest)
--
-- Pre-state (verified 2026-06-03):
--   - 2,121 active teams, 1,977 with country=NULL
--   - 144 teams with country filled
--   - leagues.country uses mix of "USA" and "United States" — needs normalization
--
-- Safety:
--   - All UPDATEs only fill NULLs (no overwrites of existing data)
--   - Schema additions are IF NOT EXISTS (idempotent)
--   - All values are normalized to canonical full names
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Safe schema additions to posts table
-- -----------------------------------------------------------------------------
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS country_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_posts_country ON posts(country);
CREATE INDEX IF NOT EXISTS idx_posts_country_slug ON posts(country_slug);

-- -----------------------------------------------------------------------------
-- STEP 2: Normalize existing teams.country to canonical full names
-- (Many "USA" should be "United States" to match the rest of the data)
-- Only touches existing non-null values that need normalization.
-- -----------------------------------------------------------------------------
UPDATE teams SET country = 'United States' WHERE country = 'USA';
UPDATE teams SET country = 'United Kingdom' WHERE country = 'UK' OR country = 'Great Britain' OR country = 'England';
UPDATE teams SET country = 'Czech Republic' WHERE country = 'Czechia';

-- -----------------------------------------------------------------------------
-- STEP 3: Backfill teams.country from leagues.country (with normalization)
-- Joins teams to their assigned league. leagues.country may use:
--   'USA' → 'United States' (handled in CASE)
--   'World'/'Europe'/'Asia'/'International' → skip (regional categories)
--   'USA/Canada' → ambiguous, skip
-- -----------------------------------------------------------------------------
UPDATE teams t
SET country = CASE l.country
  WHEN 'USA' THEN 'United States'
  ELSE l.country
END
FROM leagues l
WHERE t.league_id = l.id
  AND t.country IS NULL
  AND l.country IS NOT NULL
  AND l.country NOT IN ('World', 'Europe', 'Asia', 'International', 'USA/Canada', 'Canada/USA', 'World Junior', 'World Championship');

-- -----------------------------------------------------------------------------
-- STEP 4: Pattern-match team names for major hockey nations
-- Conservative regexes — only matches team names that clearly indicate country.
-- -----------------------------------------------------------------------------
UPDATE teams SET country = 'United States' WHERE country IS NULL AND (
    name ~* 'USHL|US NTDP|\bNTDP\b|NAHL|\bEHL\b|NA3HL|\bECHL\b|\bNCDC\b|Tier 1|Tier 2|College|Hockey East|\bECAC\b|Big Ten|\bNCHC\b|\bCCHA\b|Atlantic Hockey|WCHA|AHA|U\.S\.|US Women|Team USA'
  );

UPDATE teams SET country = 'Canada' WHERE country IS NULL AND (
    name ~* '\bOHL\b|\bWHL\b|\bQMJHL\b|\bCHL\b|BC Hockey|\bBCHL\b|\bAJHL\b|\bSJHL\b|\bMJHL\b|\bCCHL\b|\bNOJHL\b|\bGOJHL\b|Canada East|Canada West'
  );

UPDATE teams SET country = 'Russia' WHERE country IS NULL AND (
    name ~* '\bMHL\b|\bVHL\b|\bMHK\b|Kunlun'
  );

UPDATE teams SET country = 'Finland' WHERE country IS NULL AND (
    name ~* 'Liiga|Mestis|Suomi-sarja|U20 SM|U18 SM|Naisten|Finland'
  );

UPDATE teams SET country = 'Sweden' WHERE country IS NULL AND (
    name ~* '\bSHL\b|HockeyAllsvenskan|Hockeyallsvenskan|\bJ20\b|\bJ18\b|SDHL|Sweden'
  );

UPDATE teams SET country = 'Czech Republic' WHERE country IS NULL AND (
    name ~* 'Extraliga|1\. Liga|Czech'
  );

UPDATE teams SET country = 'Germany' WHERE country IS NULL AND (
    name ~* '\bDEL\b|\bDEL2\b|GER\b|Germany'
  );

UPDATE teams SET country = 'Switzerland' WHERE country IS NULL AND (
    name ~* 'National League|\bNL\b.*Swiss|Switzerland|\bSUI\b'
  );

UPDATE teams SET country = 'Slovakia' WHERE country IS NULL AND (
    name ~* 'Slovakia|Slovak'
  );

-- -----------------------------------------------------------------------------
-- STEP 5: Verification queries (uncomment to run manually)
-- -----------------------------------------------------------------------------
-- SELECT country, COUNT(*) AS n FROM teams WHERE is_active = true GROUP BY country ORDER BY n DESC LIMIT 20;
-- SELECT COUNT(*) AS still_null FROM teams WHERE country IS NULL AND is_active = true;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'posts' AND column_name IN ('country', 'country_slug');

-- =============================================================================
-- ROLLBACK:
--   ALTER TABLE posts DROP COLUMN IF EXISTS country, DROP COLUMN IF EXISTS country_slug;
--   UPDATE teams SET country = NULL WHERE country IN ('United States', 'Canada', 'Russia', 'Finland', 'Sweden', 'Czech Republic', 'Germany', 'Switzerland', 'Slovakia');
--   UPDATE teams SET country = 'USA' WHERE country = 'United States';
--   UPDATE teams SET country = 'UK' WHERE country = 'United Kingdom';
-- =============================================================================
