-- 2026-11-06: Backfill team_workspaces rows for active `teams` that have no
-- public workspace row (Arnel data-integrity audit).
--
-- Problem: 10 active teams exist in the legacy `teams` table but have NO
-- row in `team_workspaces` at all. Because the public directory
-- (/directory/teams), the team detail pages, and the $499 dataset export
-- all read `team_workspaces`, these 10 teams were:
--   - invisible in the public team directory
--   - 404 at /directory/teams/<slug>
--   - missing from the paid dataset
--   - but still counted in the old marketing number (2,613 from `teams`)
--
-- Affected teams (all verified 404 on the live site except where noted):
--   krefeld-pinguine (Krefeld Pinguine, DEL)
--   hv71 (HV71, SHL)
--   malmo-redhawks (Malmö Redhawks, SHL)
--   vaxjo-lakers (Växjö Lakers, SHL)
--   skelleftea-aik (Skellefteå AIK, SHL)
--   trois-rivieres-lions (Trois-Rivières Lions, ECHL)
--   new-mexico-goatheads (New Mexico Goatheads, ECHL)
--   trenton-ironhawks (Trenton Ironhawks, ECHL)
--   hamilton-hammers (Hamilton Hammers, AHL)
--   usa-hockey-ntdp (USA Hockey NTDP, USHL)
--
-- Fix: insert one public team_workspaces row per missing team, preserving
-- the original UUID so fixtures / claims / external references keep
-- resolving. This matches the approach already used by
-- 2026-07-25_migrate_teams_to_team_workspaces.sql.
--
-- Idempotent: ON CONFLICT (id) DO NOTHING. Re-running is safe.
--
-- Verification (live, before/after):
--   before: 2,633 public team_workspaces; 10 active teams missing
--   after:  2,643 public team_workspaces; 0 active teams missing
--           (all 10 slugs return HTTP 200 at /directory/teams/<slug>)

BEGIN;

-- Pre-flight: refuse to run if the source table is empty.
DO $$
DECLARE
  v_teams_count INT;
BEGIN
  SELECT COUNT(*) INTO v_teams_count FROM public.teams WHERE is_active = true;
  IF v_teams_count = 0 THEN
    RAISE EXCEPTION 'teams table has no active rows — refusing to backfill';
  END IF;
END $$;

WITH country_map AS (
  SELECT * FROM (VALUES
    ('Argentina','AR'), ('Australia','AU'), ('Austria','AT'), ('Belgium','BE'),
    ('Bosnia and Herzegovina','BA'), ('Brazil','BR'), ('Bulgaria','BG'),
    ('Canada','CA'), ('Chile','CL'), ('China','CN'), ('Costa Rica','CR'),
    ('Croatia','HR'), ('Czech Republic','CZ'), ('Denmark','DK'), ('Estonia','EE'),
    ('Finland','FI'), ('France','FR'), ('Georgia','GE'), ('Germany','DE'),
    ('Great Britain','GB'), ('Greece','GR'), ('Hong Kong','HK'), ('Hungary','HU'),
    ('Iceland','IS'), ('India','IN'), ('Ireland','IE'), ('Italy','IT'),
    ('Japan','JP'), ('Kazakhstan','KZ'), ('Kuwait','KW'), ('Kyrgyzstan','KG'),
    ('Latvia','LV'), ('Lebanon','LB'), ('Lithuania','LT'), ('Luxembourg','LU'),
    ('Malaysia','MY'), ('Mexico','MX'), ('Moldova','MD'), ('Mongolia','MN'),
    ('Montenegro','ME'), ('Netherlands','NL'), ('New Zealand','NZ'),
    ('North Korea','KP'), ('North Macedonia','MK'), ('Norway','NO'),
    ('Oman','OM'), ('Peru','PE'), ('Philippines','PH'), ('Poland','PL'),
    ('Portugal','PT'), ('Qatar','QA'), ('Romania','RO'), ('Russia','RU'),
    ('Saudi Arabia','SA'), ('Serbia','RS'), ('Singapore','SG'), ('Slovakia','SK'),
    ('Slovenia','SI'), ('South Africa','ZA'), ('South Korea','KR'),
    ('Spain','ES'), ('Sweden','SE'), ('Switzerland','CH'), ('Taiwan','TW'),
    ('Thailand','TH'), ('Turkey','TR'), ('Turkmenistan','TM'), ('Ukraine','UA'),
    ('United Arab Emirates','AE'), ('United Kingdom','GB'),
    ('United States','US'), ('USA','US'), ('Uzbekistan','UZ'), ('Venezuela','VE')
  ) AS m(country_name, country_code)
),
missing AS (
  SELECT
    t.id,
    t.slug,
    t.name,
    cm.country_code,
    t.city AS home_city,
    cm.country_code AS home_country,
    t.league_id,
    t.logo_url AS avatar_url,
    t.website_url,
    COALESCE(cc.currency, 'USD') AS currency,
    t.created_at,
    t.updated_at
  FROM public.teams t
  LEFT JOIN country_map cm ON cm.country_name = t.country
  LEFT JOIN public.country_currency cc ON cc.country_code = cm.country_code
  WHERE t.is_active = true
    AND t.merged_into_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.team_workspaces w WHERE w.id = t.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.team_workspaces w2 WHERE w2.slug = t.slug
    )
)
INSERT INTO public.team_workspaces (
  id, slug, name, country_code, home_city, home_country,
  league_id, avatar_url, website_url, currency,
  age_category, visibility, is_active,
  created_at, updated_at, created_by
)
SELECT
  m.id, m.slug, m.name, m.country_code, m.home_city, m.home_country,
  m.league_id, m.avatar_url, m.website_url, m.currency,
  'adult',
  'public',
  true,
  m.created_at, m.updated_at,
  NULL
FROM missing m
ON CONFLICT (id) DO NOTHING;

COMMIT;