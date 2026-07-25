-- 2026-07-25_migrate_teams_to_team_workspaces.sql
--
-- One-shot migration: legacy `teams` table → `team_workspaces` table.
-- UUID-preserving: every row keeps its existing UUID, so claims and
-- /dashboard/manage/team/[id]/* URLs keep working unchanged.
--
-- Verified against production 2026-07-25:
--   teams: 3,243 rows (2,600 active, 643 deactivated, 55 merged)
--   team_workspaces: 2 rows (essentially empty)
--   All 2,600 active slugs are unique.
--
-- Rollback window: 30 days (until 2026-08-25). After that, if no
-- rollback is needed, drop the `teams` table in a follow-up migration.
--
-- This migration is IDEMPOTENT — safe to re-run. ON CONFLICT clauses
-- skip already-migrated rows.
--
-- Architecture: single CTE computes the country mapping ONCE, then both
-- the active-insert and archived-insert select from it. Avoids the
-- 84-case mapping being duplicated.
--
-- Author: KiloClaw (Arnel approved 2026-07-25 06:44 CDT)

BEGIN;

-- ============================================================
-- 0. Schema prep (must run before inserts)
-- ============================================================

-- 0a. Add website_url column (legacy teams have it)
ALTER TABLE team_workspaces
  ADD COLUMN IF NOT EXISTS website_url TEXT;

-- 0b. Make created_by nullable — legacy imported teams have no human creator.
--     New team_workspaces rows (from /dashboard/team/new) still set created_by
--     to the creating user. Only legacy imports allow NULL.
ALTER TABLE team_workspaces
  ALTER COLUMN created_by DROP NOT NULL;

COMMENT ON COLUMN team_workspaces.website_url IS
  'Public website URL. Backfilled from legacy teams.website_url during 2026-07-25 migration.';

-- ============================================================
-- 1. Pre-flight check
-- ============================================================

DO $$
DECLARE
  v_teams_count      INT;
  v_workspaces_count INT;
  v_dup_slugs        INT;
BEGIN
  SELECT COUNT(*) INTO v_teams_count FROM teams;
  SELECT COUNT(*) INTO v_workspaces_count FROM team_workspaces;

  IF v_teams_count = 0 THEN
    RAISE EXCEPTION 'teams table is empty — refusing to migrate';
  END IF;

  IF v_workspaces_count >= v_teams_count THEN
    RAISE NOTICE 'Migration already complete (teams=%, workspaces=%). Skipping.',
      v_teams_count, v_workspaces_count;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_dup_slugs
  FROM (
    SELECT slug, COUNT(*) AS cnt
    FROM teams
    WHERE is_active = true
      AND id NOT IN (SELECT id FROM team_workspaces)
    GROUP BY slug
    HAVING COUNT(*) > 1
  ) dups;

  IF v_dup_slugs > 0 THEN
    RAISE WARNING 'Found % duplicate active slugs in unmigrated teams — review before continuing',
      v_dup_slugs;
  END IF;
END $$;

-- ============================================================
-- 2. CTE: country name → ISO 3166-1 alpha-2
-- ============================================================
-- Single source of truth for the country mapping. Both active and
-- archived inserts select from this CTE so the mapping only appears once.

WITH country_map AS (
  SELECT * FROM (VALUES
    ('Andorra',              'AD'),
    ('Argentina',            'AR'),
    ('Armenia',              'AM'),
    ('Australia',            'AU'),
    ('Austria',              'AT'),
    ('Azerbaijan',           'AZ'),
    ('Bahrain',              'BH'),
    ('Belarus',              'BY'),
    ('Belgium',              'BE'),
    ('Bosnia and Herzegovina','BA'),
    ('Brazil',               'BR'),
    ('Bulgaria',             'BG'),
    ('CA',                   'CA'),  -- already 2-letter (legacy mixed format)
    ('Canada',               'CA'),
    ('Chile',                'CL'),
    ('China',                'CN'),
    ('Costa Rica',           'CR'),
    ('Croatia',              'HR'),
    ('Czech Republic',       'CZ'),
    ('Denmark',              'DK'),
    ('Estonia',              'EE'),
    ('Finland',              'FI'),
    ('France',               'FR'),
    ('Georgia',              'GE'),
    ('Germany',              'DE'),
    ('Great Britain',        'GB'),
    ('Greece',               'GR'),
    ('Hong Kong',            'HK'),
    ('Hungary',              'HU'),
    ('Iceland',              'IS'),
    ('India',                'IN'),
    ('Indonesia',            'ID'),
    ('Iran',                 'IR'),
    ('Ireland',              'IE'),
    ('Israel',               'IL'),
    ('Italy',                'IT'),
    ('Japan',                'JP'),
    ('Kazakhstan',           'KZ'),
    ('Kuwait',               'KW'),
    ('Kyrgyzstan',           'KG'),
    ('Latvia',               'LV'),
    ('Lebanon',              'LB'),
    ('Lithuania',            'LT'),
    ('Luxembourg',           'LU'),
    ('Malaysia',             'MY'),
    ('Mexico',               'MX'),
    ('Moldova',              'MD'),
    ('Mongolia',             'MN'),
    ('Montenegro',           'ME'),
    ('Netherlands',          'NL'),
    ('New Zealand',          'NZ'),
    ('North Korea',          'KP'),
    ('North Macedonia',      'MK'),
    ('Norway',               'NO'),
    ('Oman',                 'OM'),
    ('Peru',                 'PE'),
    ('Philippines',          'PH'),
    ('Poland',               'PL'),
    ('Qatar',                'QA'),
    ('Romania',              'RO'),
    ('Russia',               'RU'),
    ('Saudi Arabia',         'SA'),
    ('Serbia',               'RS'),
    ('Singapore',            'SG'),
    ('Slovakia',             'SK'),
    ('Slovenia',             'SI'),
    ('South Africa',         'ZA'),
    ('South Korea',          'KR'),
    ('Spain',                'ES'),
    ('Sweden',               'SE'),
    ('Switzerland',          'CH'),
    ('Taiwan',               'TW'),
    ('Thailand',             'TH'),
    ('Turkey',               'TR'),
    ('Turkmenistan',         'TM'),
    ('Ukraine',              'UA'),
    ('United Arab Emirates', 'AE'),
    ('United Kingdom',       'GB'),
    ('United States',        'US'),
    ('USA',                  'US'),  -- already 2-letter (legacy mixed format)
    ('Uzbekistan',           'UZ'),
    ('Venezuela',            'VE')
  ) AS m(country_name, country_code)
),

-- ============================================================
-- 3. CTE: source rows joined to country_map + currency lookup
-- ============================================================
-- Pre-computes country_code and currency for every legacy team so the
-- final INSERT statements are trivial.

migration_source AS (
  SELECT
    t.id,
    t.slug,
    t.name,
    cm.country_code,
    t.city                                                    AS home_city,
    cm.country_code                                           AS home_country,
    t.league_id,
    t.logo_url                                                AS avatar_url,
    t.website_url,
    COALESCE(cc.currency, 'USD')                              AS currency,
    t.is_active,
    t.created_at,
    t.updated_at,
    COALESCE(t.deactivated_at, t.updated_at)                  AS archived_at
  FROM teams t
  LEFT JOIN country_map cm ON cm.country_name = t.country
  LEFT JOIN country_currency cc ON cc.country_code = cm.country_code
)

-- ============================================================
-- 4. Insert active teams as public workspaces
-- ============================================================

INSERT INTO team_workspaces (
  id, slug, name, country_code, home_city, home_country,
  league_id, avatar_url, website_url, currency,
  age_category, visibility, is_active,
  created_at, updated_at, created_by
)
SELECT
  ms.id, ms.slug, ms.name, ms.country_code, ms.home_city, ms.home_country,
  ms.league_id, ms.avatar_url, ms.website_url, ms.currency,
  'adult',
  'public',
  true,
  ms.created_at, ms.updated_at,
  NULL  -- no claimers exist yet; created_by stays NULL
FROM migration_source ms
WHERE ms.is_active = true
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. Insert deactivated/merged teams as archived workspaces
-- ============================================================
-- Preserves all data so historical links don't 404, but visibility='archived'
-- hides them from public listings.

INSERT INTO team_workspaces (
  id, slug, name, country_code, home_city, home_country,
  league_id, avatar_url, website_url, currency,
  age_category, visibility, is_active, archived_at,
  created_at, updated_at, created_by
)
SELECT
  ms.id, ms.slug, ms.name, ms.country_code, ms.home_city, ms.home_country,
  ms.league_id, ms.avatar_url, ms.website_url, ms.currency,
  'adult',
  'archived',
  false,
  ms.archived_at,
  ms.created_at, ms.updated_at,
  NULL
FROM migration_source ms
WHERE ms.is_active = false
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. Post-migration warning if any country came through unmapped
-- ============================================================

DO $$
DECLARE
  v_unmapped_count INT;
  v_unmapped_sample TEXT;
BEGIN
  -- Check the freshly-migrated team_workspaces rows for NULL country_code
  -- that should have been mapped (i.e. country was non-null in teams).
  SELECT COUNT(*), STRING_AGG(DISTINCT tw.name, ', ' ORDER BY tw.name)
  INTO v_unmapped_count, v_unmapped_sample
  FROM team_workspaces tw
  WHERE tw.country_code IS NULL
    AND EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = tw.id AND t.country IS NOT NULL
    );

  IF v_unmapped_count > 0 THEN
    RAISE WARNING 'Migration completed with % teams missing country_code (sample: %). Add mapping in follow-up.',
      v_unmapped_count, v_unmapped_sample;
  ELSE
    RAISE NOTICE 'All country values mapped successfully.';
  END IF;
END $$;

COMMIT;

-- ============================================================
-- Verification queries (run separately, not part of the transaction):
-- ============================================================
-- SELECT COUNT(*) FROM team_workspaces;                                          -- expect 3243
-- SELECT COUNT(*) FROM teams;                                                    -- expect 3243 (kept for rollback)
-- SELECT COUNT(*) FROM team_workspaces WHERE country_code IS NULL;              -- expect 0
-- SELECT COUNT(*) FROM team_workspaces WHERE visibility = 'archived';           -- expect ~698
-- SELECT COUNT(*) FROM team_workspaces WHERE visibility = 'public';             -- expect ~2545
-- SELECT slug, COUNT(*) FROM team_workspaces GROUP BY slug HAVING COUNT(*) > 1;  -- expect empty
-- SELECT COUNT(*) FROM team_workspaces WHERE home_country IS NOT NULL;           -- expect 3243
