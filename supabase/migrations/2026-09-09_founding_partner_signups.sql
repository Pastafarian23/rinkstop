-- 2026-09-09: founding_partner_signups
--
-- /launch page captures interest from rinks/clubs/leagues who want to be
-- founding partners on the ice marketplace (WS17). 0% take-rate for first
-- 6 months in exchange for being a launch partner. Auto-onboard — no
-- sales calls from Arnel. They find the page, they sign up.
--
-- Captures:
--   - contact info so I can email them
--   - organization info so I can match them to a DB row if it exists
--   - intent (which tier they're interested in: club_starter / club_pro / club_elite / league)
--   - status so I can track funnel (new -> contacted -> onboarded -> active)
--
-- This migration is idempotent.

CREATE TABLE IF NOT EXISTS founding_partner_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Contact
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,

  -- Organization (free-form; we may match to existing rinks/leagues later)
  org_name text NOT NULL,
  org_type text NOT NULL, -- 'rink' | 'club' | 'league' | 'federation' | 'arena' | 'other'
  org_website text,
  org_city text,
  org_state text,
  org_country text,

  -- Intent
  tier_interest text NOT NULL, -- 'club_starter' | 'club_pro' | 'club_elite' | 'league' | 'business_listing' | 'business_plus'
  monthly_ice_hours_estimate integer, -- how many hours of ice they could list per month
  currently_uses_bookingsystem text, -- free text: 'FacilityOS' | 'Driven' | 'spreadsheet' | 'none' | etc.
  notes text,

  -- Funnel
  status text NOT NULL DEFAULT 'new', -- 'new' | 'contacted' | 'onboarding' | 'active' | 'declined'
  source text, -- 'launch_page' | 'reddit' | 'referral' | etc. (utm_source if available)
  source_url text,

  -- Linking (after Stripe Connect onboarding completes)
  user_id text, -- Clerk user_id once they sign up
  stripe_account_id text, -- Stripe Connect Express account id

  -- Constraints
  CONSTRAINT fk_contact_email_format CHECK (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT fk_org_type CHECK (org_type IN ('rink', 'club', 'league', 'federation', 'arena', 'other')),
  CONSTRAINT fk_tier_interest CHECK (tier_interest IN ('club_starter', 'club_pro', 'club_elite', 'league', 'business_listing', 'business_plus')),
  CONSTRAINT fk_status CHECK (status IN ('new', 'contacted', 'onboarding', 'active', 'declined'))
);

-- Index for funnel queries
CREATE INDEX IF NOT EXISTS founding_partner_signups_status_idx
  ON founding_partner_signups (status, created_at DESC);

CREATE INDEX IF NOT EXISTS founding_partner_signups_created_at_idx
  ON founding_partner_signups (created_at DESC);

CREATE INDEX IF NOT EXISTS founding_partner_signups_email_idx
  ON founding_partner_signups (contact_email);

-- RLS
ALTER TABLE founding_partner_signups ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated) can INSERT a signup. Read access is
-- admin-only via service role. This lets the /launch page form work
-- without a Clerk login.
DROP POLICY IF EXISTS "founding_partner_signups_anon_insert" ON founding_partner_signups;
CREATE POLICY "founding_partner_signups_anon_insert" ON founding_partner_signups
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- No SELECT policy for anon — they can only insert their own signup.
-- Service role bypasses RLS for admin reads.

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_founding_partner_signups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS founding_partner_signups_updated_at ON founding_partner_signups;
CREATE TRIGGER founding_partner_signups_updated_at
  BEFORE UPDATE ON founding_partner_signups
  FOR EACH ROW
  EXECUTE FUNCTION set_founding_partner_signups_updated_at();
