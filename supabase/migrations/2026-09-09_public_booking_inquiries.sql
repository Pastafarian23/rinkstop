-- 2026-09-09: public_booking_inquiries
--
-- Anonymous (non-logged-in) booking inquiries from the public ice
-- marketplace. A visitor who sees a listing and wants to book but
-- isn't signed in / not connected to the rink fills this form.
-- The rink owner sees it in their dashboard, can either:
--   (a) accept it directly (this creates a connection + booking_request)
--   (b) ask the inquirer to sign up first
--   (c) decline
--
-- This is the public-marketplace entry point. The existing booking_requests
-- table requires a connection_id and a requesting_user_id, which are
-- for signed-in users only.

CREATE TABLE IF NOT EXISTS public_booking_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Link to the listing they're inquiring about
  listing_id uuid NOT NULL REFERENCES ice_listings(id) ON DELETE CASCADE,
  rink_id uuid NOT NULL REFERENCES rinks(id) ON DELETE CASCADE,

  -- Contact info (anonymous, not yet a RinkStop user)
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  team_or_org text, -- e.g. "Riverside U12 Travel" or "John Smith (parent of Joey)"

  -- Inquired slot details (snapshot in case the listing changes)
  requested_start timestamptz NOT NULL,
  requested_end timestamptz NOT NULL,
  requested_price_cents integer, -- the listed price at time of inquiry
  notes text,

  -- Funnel
  status text NOT NULL DEFAULT 'new',
  -- new -> emailed_rink -> viewed_by_rink -> accepted -> declined -> spam -> duplicate
  source text, -- 'ice_marketplace' | 'launch_page' | etc.
  source_url text,

  -- Once accepted, link to the resulting booking_request + user
  converted_to_booking_request_id uuid REFERENCES booking_requests(id) ON DELETE SET NULL,
  converted_to_user_id text, -- Clerk user_id once they sign up
  rink_owner_notes text, -- private notes the rink owner adds

  -- Anti-spam
  ip_address inet,
  user_agent text,

  -- Constraints
  CONSTRAINT fk_contact_email CHECK (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT fk_status CHECK (status IN ('new', 'emailed_rink', 'viewed_by_rink', 'accepted', 'declined', 'spam', 'duplicate'))
);

-- Indexes for the rink owner's dashboard
CREATE INDEX IF NOT EXISTS public_booking_inquiries_rink_status_idx
  ON public_booking_inquiries (rink_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS public_booking_inquiries_listing_idx
  ON public_booking_inquiries (listing_id, created_at DESC);

CREATE INDEX IF NOT EXISTS public_booking_inquiries_email_idx
  ON public_booking_inquiries (contact_email);

-- RLS
ALTER TABLE public_booking_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can INSERT (anonymous visitor submitting an inquiry)
DROP POLICY IF EXISTS "public_booking_inquiries_anon_insert" ON public_booking_inquiries;
CREATE POLICY "public_booking_inquiries_anon_insert" ON public_booking_inquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- SELECT is admin-only (service role bypasses RLS)

-- updated_at trigger (reuse the function from founding_partner_signups if it exists)
CREATE OR REPLACE FUNCTION set_public_booking_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS public_booking_inquiries_updated_at ON public_booking_inquiries;
CREATE TRIGGER public_booking_inquiries_updated_at
  BEFORE UPDATE ON public_booking_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION set_public_booking_inquiries_updated_at();
