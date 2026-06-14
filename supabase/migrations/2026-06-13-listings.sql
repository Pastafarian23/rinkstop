-- 2026-06-13-listings.sql
-- User-owned business listings.
-- Different from directory listings (rinks, teams, leagues, players in
-- /directory/* which are admin-curated records). Different from
-- listing_submissions (a queue for users to propose a new directory entry).
-- This table is for businesses that exist in the real world but are not
-- rinks/teams/leagues: pro shops, skate sharpening services, hockey camps,
-- equipment brands, trainers, etc.
--
-- v1 scope: listing_type is 'business' only. The CHECK constraint can be
-- extended later if a rink operator wants to own a non-directory listing.

CREATE TABLE IF NOT EXISTS public.listings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,

  -- v1: only 'business'. CHECK enforces it now so we can't insert garbage.
  listing_type text NOT NULL DEFAULT 'business' CHECK (listing_type = 'business'),

  -- Display + classification
  business_name text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'pro_shop',       -- hockey retail store
    'sharpening',     -- skate sharpening service
    'camp',           -- hockey camp or clinic
    'training',       -- individual trainer / skills coach
    'equipment',      -- equipment brand or manufacturer
    'other'           -- catch-all
  )),
  description text NULL,

  -- Location
  location text NULL,                 -- free-form city/region
  latitude double precision NULL,
  longitude double precision NULL,
  service_radius_km integer NULL,     -- for mobile services (e.g. traveling sharpener)

  -- Contact
  contact_email text NULL,
  contact_phone text NULL,
  website text NULL,

  -- Visual
  logo_url text NULL,
  photos text[] NOT NULL DEFAULT '{}',  -- Supabase storage URLs
  hours jsonb NULL,                      -- { mon: '9-17', tue: '9-17', ... }

  -- Status
  is_published boolean NOT NULL DEFAULT false,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'supporter', 'pro')),

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Quality guardrails
  CONSTRAINT listings_photos_limit CHECK (cardinality(photos) <= 12),
  CONSTRAINT listings_business_name_len CHECK (char_length(business_name) BETWEEN 2 AND 120),
  CONSTRAINT listings_email_format CHECK (
    contact_email IS NULL
    OR contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  )
);

-- Indexes
-- "List all listings owned by user X"
CREATE INDEX IF NOT EXISTS idx_listings_owner ON public.listings(owner_user_id, created_at DESC);
-- "Find a single listing by id" (pkey already covers this, but explicit for query plan readability)
-- Already covered by pkey.
-- "List published listings by category" (browse page query)
CREATE INDEX IF NOT EXISTS idx_listings_published_category
  ON public.listings(category, created_at DESC)
  WHERE is_published = true;
-- "Geo lookup" (for /businesses map view)
CREATE INDEX IF NOT EXISTS idx_listings_geo
  ON public.listings(latitude, longitude)
  WHERE is_published = true AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- updated_at trigger: reuse the existing set_updated_at() function from the
-- fixtures/team-league migrations if it exists, otherwise define a local one.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_set_updated_at') THEN
    CREATE OR REPLACE FUNCTION public.trg_set_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $f$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $f$;
  END IF;
END$$;

DROP TRIGGER IF EXISTS listings_set_updated_at ON public.listings;
CREATE TRIGGER listings_set_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_set_updated_at();

-- RLS
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Public can SELECT only published listings
DROP POLICY IF EXISTS listings_select_published ON public.listings;
CREATE POLICY listings_select_published ON public.listings
  FOR SELECT USING (is_published = true);

-- Owner can SELECT their own (including drafts)
DROP POLICY IF EXISTS listings_select_own ON public.listings;
CREATE POLICY listings_select_own ON public.listings
  FOR SELECT USING ((auth.uid())::text = owner_user_id);

-- Service role bypass (the API uses supabaseAdmin) — implicitly allowed when
-- the request uses the service role key. RLS is bypassed for service_role.

-- Owner can INSERT their own (only as 'business' for v1)
DROP POLICY IF EXISTS listings_insert_own ON public.listings;
CREATE POLICY listings_insert_own ON public.listings
  FOR INSERT WITH CHECK (
    (auth.uid())::text = owner_user_id
    AND listing_type = 'business'
  );

-- Owner can UPDATE their own
DROP POLICY IF EXISTS listings_update_own ON public.listings;
CREATE POLICY listings_update_own ON public.listings
  FOR UPDATE USING ((auth.uid())::text = owner_user_id)
  WITH CHECK ((auth.uid())::text = owner_user_id);

-- Owner can DELETE their own
DROP POLICY IF EXISTS listings_delete_own ON public.listings;
CREATE POLICY listings_delete_own ON public.listings
  FOR DELETE USING ((auth.uid())::text = owner_user_id);

-- Note: leads.listing_id is text. We do NOT add a FK from leads.listing_id
-- to listings.id because leads can also point at rinks/teams/leagues (text
-- IDs into other tables). The application layer resolves the target.
-- When we wire 'business' into the leads form in Phase 2, the API will
-- validate the listing_id against this table before allowing the lead.
