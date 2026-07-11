-- 2026-07-11 — Federation → League → Organization → Team hierarchy
--
-- Adds nullable FK associations. Every level is skippable:
--   - A team can reference a federation without a league or org
--   - A team can reference an org without belonging to a league
--   - Any level can be NULL for standalone/pickup teams
--
-- parent_org text column is preserved in this migration so all existing
-- query sites keep working. A follow-up migration will drop it after
-- all code references are swapped to FK joins.

-- ------------------------------------------------------------
-- 1. federations
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.federations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  country_code  TEXT,
  logo_url      TEXT,
  website_url   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_federations_slug
  ON public.federations (slug)
  WHERE is_active = true;

-- ------------------------------------------------------------
-- 2. organizations
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  federation_id   UUID REFERENCES public.federations(id) ON DELETE SET NULL,
  league_id       UUID REFERENCES public.leagues(id) ON DELETE SET NULL,
  country_code    TEXT,
  home_city       TEXT,
  description     TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  website_url     TEXT,
  logo_url        TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug
  ON public.organizations (slug)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_organizations_federation
  ON public.organizations (federation_id)
  WHERE federation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_league
  ON public.organizations (league_id)
  WHERE league_id IS NOT NULL;

-- ------------------------------------------------------------
-- 3. leagues.federation_id
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leagues'
      AND column_name = 'federation_id'
  ) THEN
    ALTER TABLE public.leagues
      ADD COLUMN federation_id UUID REFERENCES public.federations(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_leagues_federation
      ON public.leagues (federation_id)
      WHERE federation_id IS NOT NULL;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4. team_workspaces: add FK columns (parent_org preserved)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'team_workspaces'
      AND column_name = 'federation_id'
  ) THEN
    ALTER TABLE public.team_workspaces
      ADD COLUMN federation_id UUID REFERENCES public.federations(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'team_workspaces'
      AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.team_workspaces
      ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'team_workspaces'
      AND column_name = 'league_id'
  ) THEN
    ALTER TABLE public.team_workspaces
      ADD COLUMN league_id UUID REFERENCES public.leagues(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_team_workspaces_federation
  ON public.team_workspaces (federation_id)
  WHERE federation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_workspaces_organization
  ON public.team_workspaces (organization_id)
  WHERE organization_id IS NOT NULL;

-- ------------------------------------------------------------
-- 5. RLS + grants
-- ------------------------------------------------------------
ALTER TABLE public.federations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read federations"
  ON public.federations FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public read organizations"
  ON public.organizations FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated create federations"
  ON public.federations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 6. my_team_memberships view refresh
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = 'my_team_memberships'
  ) THEN
    DROP VIEW public.my_team_memberships;
  END IF;
END $$;

CREATE OR REPLACE VIEW public.my_team_memberships AS
SELECT
  m.id            AS membership_id,
  m.user_id,
  m.role,
  m.jersey_number,
  m.joined_at,
  m.left_at,
  tw.id           AS team_id,
  tw.slug         AS team_slug,
  tw.name         AS team_name,
  tw.short_name   AS team_short_name,
  tw.country_code AS team_country_code,
  tw.age_label    AS team_age_label,
  tw.age_min      AS team_age_min,
  tw.age_max      AS team_age_max,
  tw.federation_id,
  tw.organization_id,
  tw.league_id,
  tw.level        AS team_level,
  tw.home_city    AS team_home_city
FROM team_members m
JOIN team_workspaces tw ON tw.id = m.team_id
WHERE tw.is_active = true;

COMMENT ON VIEW public.my_team_memberships IS
  'Joins team_members with team_workspaces for dashboard queries. '
  'Server-side filtering by user_id is enforced by the caller (RLS on team_members).';
