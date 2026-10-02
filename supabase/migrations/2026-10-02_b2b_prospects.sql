-- Migration 2026-10-02 — B2B prospect table (Phase 8 of conversion overhaul).
--
-- Per Arnel Phase 8 directive
-- (memory/2026-10-01-conversion-monetization-overhaul.md):
-- "Create a workflow for identifying unclaimed rinks, hockey clubs, leagues,
-- hockey shops, trainers, clinics, equipment businesses. Prioritize prospects
-- with active websites, public contact info, significant programs, strong
-- local hockey presence. Internal prospect table — DO NOT send automated
-- outreach without approval."
--
-- Schema notes:
-- - Admin-only (service role + admin auth.users.id matching).
-- - NEVER publicly readable. NEVER has a SELECT policy for anon or
--   authenticated. Only service_role and a server-side admin check.
-- - Linked to listings table where available (rink_id/team_id/league_id FKs).
-- - outreach_status tracks the human-driven sales process.
-- - priority_score is a denormalized ranking from 0-100; updated by a separate
--   background script (scripts/_rank-b2b-prospects.cjs, not yet written).

BEGIN;

CREATE TYPE prospect_kind AS ENUM (
  'rink',
  'team',
  'league',
  'hockey_shop',
  'trainer',
  'clinic',
  'equipment_business'
);

CREATE TYPE prospect_verification AS ENUM (
  'unverified',
  'business_email_confirmed',
  'phone_confirmed',
  'website_live',
  'fully_verified'
);

CREATE TYPE prospect_outreach_status AS ENUM (
  'new',
  'researching',
  'ready_to_contact',
  'contacted',
  'engaged',
  'declined',
  'claimed_via_outreach',
  'no_response',
  'do_not_contact'
);

CREATE TABLE IF NOT EXISTS b2b_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),

  -- Identity
  kind prospect_kind NOT NULL,
  display_name text NOT NULL,
  city text,
  region text,            -- state/province
  country text,           -- 2-letter ISO if available, else freeform
  website text,
  contact_email text,
  contact_phone text,
  contact_name text,
  source text,            -- 'manual' / 'auto:unclaimed_rink' / 'auto:unclaimed_team' etc.

  -- Linkages (best effort, optional)
  rink_id uuid REFERENCES rinks(id) ON DELETE SET NULL,
  team_id uuid,
  league_id uuid,

  -- Claim state
  rinkstop_claimed boolean NOT NULL DEFAULT false,
  rinkstop_claimed_at timestamptz,
  rinkstop_profile_url text,
  profile_completeness_pct smallint,    -- 0-100, derived

  -- Verification (independent of rinkstop_claimed)
  verification prospect_verification NOT NULL DEFAULT 'unverified',

  -- Sales funnel
  outreach_status prospect_outreach_status NOT NULL DEFAULT 'new',
  outreach_owner text,                 -- admin user id of human doing it
  initial_outreach_at timestamptz,
  last_outreach_at timestamptz,
  next_follow_up_at timestamptz,
  notes text,

  -- Ranking
  priority_score smallint NOT NULL DEFAULT 0,    -- 0-100, higher = more likely to convert
  priority_signals jsonb NOT NULL DEFAULT '{}'::jsonb,    -- structured breakdown

  -- Constraint
  CONSTRAINT b2b_prospects_email_format CHECK (
    contact_email IS NULL
    OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  CONSTRAINT b2b_prospects_priority_range CHECK (priority_score BETWEEN 0 AND 100),
  CONSTRAINT b2b_prospects_completeness_range CHECK (
    profile_completeness_pct IS NULL
    OR profile_completeness_pct BETWEEN 0 AND 100
  )
);

CREATE INDEX IF NOT EXISTS b2b_prospects_kind_idx ON b2b_prospects (kind);
CREATE INDEX IF NOT EXISTS b2b_prospects_outreach_status_idx ON b2b_prospects (outreach_status);
CREATE INDEX IF NOT EXISTS b2b_prospects_priority_idx ON b2b_prospects (priority_score DESC);
CREATE INDEX IF NOT EXISTS b2b_prospects_country_idx ON b2b_prospects (country);
CREATE INDEX IF NOT EXISTS b2b_prospects_claimed_idx ON b2b_prospects (rinkstop_claimed);
CREATE INDEX IF NOT EXISTS b2b_prospects_next_follow_up_idx
  ON b2b_prospects (next_follow_up_at)
  WHERE outreach_status IN ('ready_to_contact', 'contacted', 'engaged');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION set_b2b_prospects_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS b2b_prospects_set_updated_at ON b2b_prospects;
CREATE TRIGGER b2b_prospects_set_updated_at
  BEFORE UPDATE ON b2b_prospects
  FOR EACH ROW
  EXECUTE FUNCTION set_b2b_prospects_updated_at();

-- RLS: admin-only. We DO NOT grant anon/authenticated any access.
-- Only the service_role key (used by admin API routes) bypasses RLS.
ALTER TABLE b2b_prospects ENABLE ROW LEVEL SECURITY;

-- No policies for anon or authenticated. Admin operations go through
-- /api/admin/prospects/* which uses supabaseAdmin (service_role).

-- This is intentional — b2b_prospects is internal sales data, not public.
-- Even authenticated rinkstop users should not see other people's prospect pipeline.

-- Add to security-definer function hardening target list:
COMMENT ON TABLE b2b_prospects IS 'Internal B2B prospect pipeline (Phase 8). Admin/service-role access only via /api/admin/prospects/* routes. Never exposed to anon or authenticated RLS roles.';

COMMIT;