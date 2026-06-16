-- Migration: Normalize Canada province_state to 2-letter abbreviations
--
-- Reason: Canada rinks were imported in two formats:
--   - 199 with full name ('Nova Scotia')
--   - 20 with 2-letter abbr ('NS')
-- The /directory/canada/{province} page filters by the abbr, so 199 rinks
-- were invisible on the province index pages. The country import script
-- (import-canada-rinks.cjs) also matches by abbr, so without this migration
-- re-imports would have created 200+ duplicates.
--
-- Safe to run: deterministic lookup, no data loss. After the migration, the
-- display layer (ca-provinces.ts) still shows the full name everywhere.
-- Display logic was updated BEFORE this migration so no live page should
-- show 'NS' instead of 'Nova Scotia'.
--
-- Rollback: UPDATE rinks SET province_state = PROVINCE_FROM_ABBR
--
-- Pre-state: 199 full-name + 20 abbr + 1 null = 220
-- Post-state: 0 full-name + 219 abbr + 1 null = 220

BEGIN;

-- Full-name → abbr (idempotent: WHERE clause ensures it only runs once)
UPDATE rinks SET province_state = 'AB' WHERE country = 'Canada' AND province_state = 'Alberta';
UPDATE rinks SET province_state = 'BC' WHERE country = 'Canada' AND province_state = 'British Columbia';
UPDATE rinks SET province_state = 'MB' WHERE country = 'Canada' AND province_state = 'Manitoba';
UPDATE rinks SET province_state = 'NB' WHERE country = 'Canada' AND province_state = 'New_Brunswick';
UPDATE rinks SET province_state = 'NB' WHERE country = 'Canada' AND province_state = 'New Brunswick';
UPDATE rinks SET province_state = 'NL' WHERE country = 'Canada' AND province_state = 'Newfoundland_and_Labrador';
UPDATE rinks SET province_state = 'NL' WHERE country = 'Canada' AND province_state = 'Newfoundland and Labrador';
UPDATE rinks SET province_state = 'NS' WHERE country = 'Canada' AND province_state = 'Nova Scotia';
UPDATE rinks SET province_state = 'NT' WHERE country = 'Canada' AND province_state = 'Northwest_Territories';
UPDATE rinks SET province_state = 'NT' WHERE country = 'Canada' AND province_state = 'Northwest Territories';
UPDATE rinks SET province_state = 'NU' WHERE country = 'Canada' AND province_state = 'Nunavut';
UPDATE rinks SET province_state = 'ON' WHERE country = 'Canada' AND province_state = 'Ontario';
UPDATE rinks SET province_state = 'PE' WHERE country = 'Canada' AND province_state = 'Prince_Edward_Island';
UPDATE rinks SET province_state = 'PE' WHERE country = 'Canada' AND province_state = 'Prince Edward Island';
UPDATE rinks SET province_state = 'QC' WHERE country = 'Canada' AND province_state = 'Quebec';
UPDATE rinks SET province_state = 'SK' WHERE country = 'Canada' AND province_state = 'Saskatchewan';
UPDATE rinks SET province_state = 'YT' WHERE country = 'Canada' AND province_state = 'Yukon';

-- Sanity check (will return 0 if migration succeeded)
-- Should be 0 rows in any full-name format after the migration
COMMIT;
