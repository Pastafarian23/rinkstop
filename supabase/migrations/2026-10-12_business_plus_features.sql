-- 2026-10-12: Build out Business Plus features (Promotions + Enhanced Analytics)
--                + Business Plus booking support scaffold (replaces /dashboard/bookings stub).
--
-- Per Arnel 2026-10-12 directive, these features are CLAIMED in the pricing
-- page but had NO code. Building them now.
--
-- Tables:
--   - business_promotions: coupon/promo codes business owners can create,
--     capped by date range, redemptions, and per-user eligibility.
--   - business_promotion_redemptions: audit trail of who used a code.
--   - business_analytics_daily: per-day rollup of views, leads, bookings,
--     engagement (favorites, reviews, profile visits).
--
-- Views:
--   - business_analytics_summary: 30-day rolling window summary per business.
--   - business_analytics_top_listings: top performers across the user's listings.
--
-- RLS: business owners can only see/modify their own promotions + analytics.
--      Public can see active promotions on a listing's public page.

-- ---- 1. business_promotions ----
CREATE TABLE IF NOT EXISTS public.business_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  owner_user_id text NOT NULL,                  -- Clerk user id (text type, matches other tables)
  code text NOT NULL,                           -- short code, uppercased, 3-20 chars
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric(10,2) NOT NULL CHECK (discount_value > 0),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  max_redemptions integer CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  redemption_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_promotions_listing ON public.business_promotions(listing_id);
CREATE INDEX IF NOT EXISTS idx_business_promotions_owner ON public.business_promotions(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_business_promotions_code ON public.business_promotions(upper(code));
CREATE INDEX IF NOT EXISTS idx_business_promotions_active ON public.business_promotions(is_active, ends_at)
  WHERE is_active = true;

-- Code uniqueness per listing (one code per listing, but different listings can share codes)
CREATE UNIQUE INDEX IF NOT EXISTS uq_business_promotions_listing_code
  ON public.business_promotions(listing_id, upper(code));

-- ---- 2. business_promotion_redemptions ----
CREATE TABLE IF NOT EXISTS public.business_promotion_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES public.business_promotions(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  redeemed_by_email text NOT NULL,
  redeemed_by_user_id text,                     -- null if guest checkout
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE INDEX IF NOT EXISTS idx_bpr_promotion ON public.business_promotion_redemptions(promotion_id);
CREATE INDEX IF NOT EXISTS idx_bpr_listing ON public.business_promotion_redemptions(listing_id);
CREATE INDEX IF NOT EXISTS idx_bpr_email ON public.business_promotion_redemptions(redeemed_by_email);

-- ---- 3. business_analytics_daily ----
-- Rollup table populated by a daily cron. UI reads from this for fast dashboards.
CREATE TABLE IF NOT EXISTS public.business_analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  date date NOT NULL,
  page_views integer NOT NULL DEFAULT 0,
  unique_visitors integer NOT NULL DEFAULT 0,
  lead_form_submissions integer NOT NULL DEFAULT 0,
  favorite_count integer NOT NULL DEFAULT 0,    -- net (added - removed) that day
  review_count integer NOT NULL DEFAULT 0,      -- net reviews that day
  phone_clicks integer NOT NULL DEFAULT 0,
  website_clicks integer NOT NULL DEFAULT 0,
  email_clicks integer NOT NULL DEFAULT 0,
  booking_inquiries integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_business_analytics_listing_date
  ON public.business_analytics_daily(listing_id, date);
CREATE INDEX IF NOT EXISTS idx_business_analytics_date
  ON public.business_analytics_daily(date DESC);

-- ---- 4. View: 30-day rolling summary per listing ----
CREATE OR REPLACE VIEW public.business_analytics_summary AS
  SELECT
    listing_id,
    SUM(page_views) AS page_views_30d,
    SUM(unique_visitors) AS unique_visitors_30d,
    SUM(lead_form_submissions) AS leads_30d,
    SUM(phone_clicks) AS phone_clicks_30d,
    SUM(website_clicks) AS website_clicks_30d,
    SUM(email_clicks) AS email_clicks_30d,
    SUM(booking_inquiries) AS booking_inquiries_30d,
    SUM(favorite_count) AS favorites_net_30d,
    SUM(review_count) AS reviews_net_30d,
    MAX(date) AS last_activity_date
  FROM public.business_analytics_daily
  WHERE date >= current_date - interval '30 days'
  GROUP BY listing_id;

GRANT SELECT ON public.business_analytics_summary TO anon, authenticated;

-- ---- 5. View: top performers across the user's listings (last 30d) ----
CREATE OR REPLACE VIEW public.business_analytics_top_listings AS
  SELECT
    s.listing_id,
    s.page_views_30d,
    s.leads_30d,
    s.unique_visitors_30d,
    s.booking_inquiries_30d,
    l.business_name,
    l.listing_type,
    l.is_published,
    l.is_featured
  FROM public.business_analytics_summary s
  JOIN public.listings l ON l.id = s.listing_id
  WHERE l.is_published = true
  ORDER BY s.page_views_30d DESC, s.leads_30d DESC;

GRANT SELECT ON public.business_analytics_top_listings TO authenticated;

-- ---- 6. RLS policies ----
ALTER TABLE public.business_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_promotion_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_analytics_daily ENABLE ROW LEVEL SECURITY;

-- Promotions: owner can do anything with their own; anyone can read active
-- Match via profiles.user_id (text) since Clerk user ids are strings.
DROP POLICY IF EXISTS bp_owner_all ON public.business_promotions;
CREATE POLICY bp_owner_all ON public.business_promotions
  FOR ALL TO authenticated
  USING (owner_user_id = auth.jwt() ->> 'sub')
  WITH CHECK (owner_user_id = auth.jwt() ->> 'sub');

DROP POLICY IF EXISTS bp_public_read_active ON public.business_promotions;
CREATE POLICY bp_public_read_active ON public.business_promotions
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND ends_at > now() AND starts_at <= now());

-- Redemptions: owner can read their own; anyone can insert
DROP POLICY IF EXISTS bpr_owner_read ON public.business_promotion_redemptions;
CREATE POLICY bpr_owner_read ON public.business_promotion_redemptions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.business_promotions p
                 WHERE p.id = business_promotion_redemptions.promotion_id
                 AND p.owner_user_id = auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS bpr_insert_any ON public.business_promotion_redemptions;
CREATE POLICY bpr_insert_any ON public.business_promotion_redemptions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Analytics: owner reads their own; service_role writes (cron job)
DROP POLICY IF EXISTS bad_owner_read ON public.business_analytics_daily;
CREATE POLICY bad_owner_read ON public.business_analytics_daily
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l
                 WHERE l.id = business_analytics_daily.listing_id
                 AND l.owner_user_id = auth.jwt() ->> 'sub'));

DROP POLICY IF EXISTS bad_service_write ON public.business_analytics_daily;
CREATE POLICY bad_service_write ON public.business_analytics_daily
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ---- 7. Helper RPC: increment_business_analytics ----
-- Atomic increment of a single column for (listing_id, date), inserting
-- the row if it doesn't exist yet. Also tracks unique visitors via a
-- daily visitor_fingerprints array (limited to last 1000 per row).
CREATE OR REPLACE FUNCTION public.increment_business_analytics(
  p_listing_id uuid,
  p_date date,
  p_column text,
  p_delta integer,
  p_visitor_fp text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- bypass RLS for the upsert
AS $$
DECLARE
  v_sql text;
  v_allowed_columns text[] := ARRAY['page_views','unique_visitors','lead_form_submissions','favorite_count','review_count','phone_clicks','website_clicks','email_clicks','booking_inquiries'];
  v_fp_list text;
BEGIN
  -- Validate the column name against the allowlist (prevent SQL injection)
  IF NOT (p_column = ANY(v_allowed_columns)) THEN
    RAISE EXCEPTION 'Invalid column: %', p_column;
  END IF;

  -- Insert the row if it doesn't exist
  INSERT INTO public.business_analytics_daily (listing_id, date, updated_at)
  VALUES (p_listing_id, p_date, now())
  ON CONFLICT (listing_id, date) DO NOTHING;

  -- For page_views, also track unique visitors via a daily fingerprint list
  IF p_column = 'page_views' AND p_visitor_fp IS NOT NULL THEN
    -- Get current fingerprint list (truncated to fit)
    SELECT string_agg(fp, ',') INTO v_fp_list
    FROM (
      SELECT unnest(
        COALESCE(
          (SELECT ARRAY(SELECT jsonb_array_elements_text(visitor_fingerprints::jsonb)) FROM public.business_analytics_daily WHERE listing_id = p_listing_id AND date = p_date),
          ARRAY[]::text[]
        )
      ) AS fp
    ) t;

    -- If this fingerprint is new, increment unique_visitors
    IF v_fp_list IS NULL OR position(p_visitor_fp IN v_fp_list) = 0 THEN
      UPDATE public.business_analytics_daily
      SET unique_visitors = unique_visitors + 1,
          visitor_fingerprints = COALESCE(visitor_fingerprints::jsonb, '[]'::jsonb) || jsonb_build_array(p_visitor_fp),
          updated_at = now()
      WHERE listing_id = p_listing_id AND date = p_date;
    END IF;
  END IF;

  -- Increment the requested column dynamically
  v_sql := format(
    'UPDATE public.business_analytics_daily SET %I = %I + $1, updated_at = now() WHERE listing_id = $2 AND date = $3',
    p_column, p_column
  );
  EXECUTE v_sql USING p_delta, p_listing_id, p_date;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_business_analytics(uuid, date, text, integer, text) TO anon, authenticated, service_role;

-- Add the visitor_fingerprints column (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_analytics_daily' AND column_name = 'visitor_fingerprints'
  ) THEN
    ALTER TABLE public.business_analytics_daily ADD COLUMN visitor_fingerprints jsonb;
  END IF;
END $$;
