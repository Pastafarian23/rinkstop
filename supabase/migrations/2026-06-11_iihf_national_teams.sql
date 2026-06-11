-- 2026-06-11: IIHF member nations + national teams tables
-- Sources: Wikipedia "List of members of the International Ice Hockey Federation"
-- Ranking data: 26 May 2025 (per Wikipedia)
-- Membership structure: 62 full + 22 associate = 84 current (Bahrain, Kenya joined 28 Sept 2024)

-- Member nations: one row per current IIHF member
CREATE TABLE IF NOT EXISTS iihf_member_nations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country         TEXT NOT NULL UNIQUE,           -- Canonical name (matches rinks.country / teams.country)
  iihf_status     TEXT NOT NULL,                  -- 'full' | 'associate' | 'suspended'
  ioc_code        TEXT,                           -- 'USA', 'CAN', etc.
  date_joined     DATE,                           -- When country joined IIHF
  organization    TEXT,                           -- National federation name
  president       TEXT,                           -- Current president (may be stale)
  mens_ranking    INTEGER,                        -- IIHF men's ranking (NULL if unranked)
  womens_ranking  INTEGER,                        -- IIHF women's ranking
  has_mens_team   BOOLEAN NOT NULL DEFAULT false,
  has_womens_team BOOLEAN NOT NULL DEFAULT false,
  has_u20_team    BOOLEAN NOT NULL DEFAULT false,
  has_u18_mens    BOOLEAN NOT NULL DEFAULT false,
  has_u18_womens  BOOLEAN NOT NULL DEFAULT false,
  ranking_as_of   DATE NOT NULL DEFAULT '2025-05-26',
  source_url      TEXT,                           -- Wikipedia / iihf.com link
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iihf_member_country ON iihf_member_nations (country);
CREATE INDEX IF NOT EXISTS idx_iihf_member_status  ON iihf_member_nations (iihf_status);

-- National teams: one row per (country, team_type) combination
-- Allows multiple team records per country (e.g., Sweden Men's, Sweden U20, Sweden Women's)
CREATE TABLE IF NOT EXISTS national_teams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country      TEXT NOT NULL,
  team_type    TEXT NOT NULL,                    -- 'mens' | 'womens' | 'mens_u20' | 'mens_u18' | 'womens_u18'
  team_name    TEXT NOT NULL,                    -- e.g., "Sweden Men's National Ice Hockey Team"
  iihf_member_id UUID REFERENCES iihf_member_nations(id) ON DELETE CASCADE,
  ranking      INTEGER,                          -- Specific to this team type
  ranking_label TEXT,                            -- e.g., "World #4" or "Division II Group A"
  slug         TEXT NOT NULL UNIQUE,             -- URL slug for /directory/[country]/national-teams/[slug]
  federation_url TEXT,                           -- National federation website
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country, team_type)
);

CREATE INDEX IF NOT EXISTS idx_national_teams_country ON national_teams (country);
CREATE INDEX IF NOT EXISTS idx_national_teams_type   ON national_teams (team_type);

-- RLS: read-only for anon, full for service role
ALTER TABLE iihf_member_nations ENABLE ROW LEVEL SECURITY;
ALTER TABLE national_teams        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "iihf_member_nations_read" ON iihf_member_nations;
CREATE POLICY "iihf_member_nations_read" ON iihf_member_nations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "national_teams_read" ON national_teams;
CREATE POLICY "national_teams_read" ON national_teams
  FOR SELECT USING (true);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_iihf_member_updated ON iihf_member_nations;
CREATE TRIGGER trg_iihf_member_updated BEFORE UPDATE ON iihf_member_nations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_national_teams_updated ON national_teams;
CREATE TRIGGER trg_national_teams_updated BEFORE UPDATE ON national_teams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
