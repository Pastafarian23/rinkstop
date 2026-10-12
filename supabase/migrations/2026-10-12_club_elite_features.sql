-- 2026-10-12: Build out Club Elite features (Custom branding + API access)
--                + Hockey Passport Plus "Premium insights" + Federation compliance.
--
-- Per Arnel 2026-10-12 directive.
--
-- Schema changes (additive, idempotent):
--   - team_workspaces: 8 new branding columns
--   - team_api_keys: API key storage with hashed secrets
--   - player_insights: per-user computed insights (Premium)
--   - federation_compliance: membership/audit data
--
-- RLS: owners can manage their own branding + api keys; the public API
-- reads from is_published=true workspaces only.

-- ---- 1. team_workspaces branding columns ----
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_workspaces' AND column_name = 'brand_primary_color') THEN
    ALTER TABLE public.team_workspaces ADD COLUMN brand_primary_color text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_workspaces' AND column_name = 'brand_secondary_color') THEN
    ALTER TABLE public.team_workspaces ADD COLUMN brand_secondary_color text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_workspaces' AND column_name = 'brand_accent_color') THEN
    ALTER TABLE public.team_workspaces ADD COLUMN brand_accent_color text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_workspaces' AND column_name = 'brand_logo_url') THEN
    ALTER TABLE public.team_workspaces ADD COLUMN brand_logo_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_workspaces' AND column_name = 'brand_favicon_url') THEN
    ALTER TABLE public.team_workspaces ADD COLUMN brand_favicon_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_workspaces' AND column_name = 'brand_tagline') THEN
    ALTER TABLE public.team_workspaces ADD COLUMN brand_tagline text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_workspaces' AND column_name = 'brand_custom_domain') THEN
    ALTER TABLE public.team_workspaces ADD COLUMN brand_custom_domain text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_workspaces' AND column_name = 'brand_og_image_url') THEN
    ALTER TABLE public.team_workspaces ADD COLUMN brand_og_image_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_workspaces' AND column_name = 'is_published') THEN
    ALTER TABLE public.team_workspaces ADD COLUMN is_published boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- ---- 2. team_api_keys ----
CREATE TABLE IF NOT EXISTS public.team_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.team_workspaces(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL,
  name text NOT NULL,                          -- human label, e.g. "Production", "Mobile app"
  key_prefix text NOT NULL,                    -- first 8 chars of the public key (for display)
  key_hash text NOT NULL,                      -- sha256 of the secret
  scopes text[] NOT NULL DEFAULT ARRAY['read:org']::text[],
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_team_api_keys_team ON public.team_api_keys(team_id);
CREATE INDEX IF NOT EXISTS idx_team_api_keys_owner ON public.team_api_keys(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_team_api_keys_prefix ON public.team_api_keys(key_prefix);

ALTER TABLE public.team_api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tak_owner_all ON public.team_api_keys;
CREATE POLICY tak_owner_all ON public.team_api_keys
  FOR ALL TO authenticated
  USING (owner_user_id = auth.jwt() ->> 'sub')
  WITH CHECK (owner_user_id = auth.jwt() ->> 'sub');

-- ---- 3. player_insights (Hockey Passport Plus "Premium insights") ----
CREATE TABLE IF NOT EXISTS public.player_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  user_id text NOT NULL,                       -- denormalized for RLS
  insight_key text NOT NULL,                   -- e.g. 'rinks_per_season', 'multi_league_rate'
  insight_value jsonb NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  UNIQUE (player_id, insight_key)
);

CREATE INDEX IF NOT EXISTS idx_player_insights_player ON public.player_insights(player_id);
CREATE INDEX IF NOT EXISTS idx_player_insights_user ON public.player_insights(user_id);

ALTER TABLE public.player_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pi_owner_read ON public.player_insights;
CREATE POLICY pi_owner_read ON public.player_insights
  FOR SELECT TO authenticated
  USING (user_id = auth.jwt() ->> 'sub');
DROP POLICY IF EXISTS pi_service_write ON public.player_insights;
CREATE POLICY pi_service_write ON public.player_insights
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ---- 4. federation_compliance ----
CREATE TABLE IF NOT EXISTS public.federation_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  federation_id text NOT NULL,                 -- IIHF member code (e.g. 'USA', 'CAN', 'SWE')
  compliance_year integer NOT NULL,
  member_count integer,
  verified_clubs_count integer,
  verified_players_count integer,
  last_audit_at timestamptz,
  audit_notes text,
  next_audit_due timestamptz,
  regulatory_flags jsonb,                      -- structured compliance data
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (federation_id, compliance_year)
);

CREATE INDEX IF NOT EXISTS idx_federation_compliance_year ON public.federation_compliance(federation_id, compliance_year DESC);

ALTER TABLE public.federation_compliance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fc_read_all ON public.federation_compliance;
CREATE POLICY fc_read_all ON public.federation_compliance
  FOR SELECT TO anon, authenticated
  USING (true);
DROP POLICY IF EXISTS fc_service_write ON public.federation_compliance;
CREATE POLICY fc_service_write ON public.federation_compliance
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ---- 5. Grant public read for new tables ----
GRANT SELECT ON public.player_insights TO authenticated;
GRANT SELECT ON public.federation_compliance TO anon, authenticated;
