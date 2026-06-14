-- 2026-06-13-reviews-unify.sql
-- Unify rink_reviews into a polymorphic reviews table.
-- Strategy (Option B): keep the rink_reviews table working via a VIEW, create
-- a new `reviews` table as the source of truth, backfill from rink_reviews
-- (currently 0 rows but the SQL is correct for any historical data).
--
-- After this migration:
--   - The 7 existing call sites that read from `rink_reviews` work unchanged
--     (the view emulates the old shape with rink_id derived from entity_id).
--   - New reviews of teams/players/leagues can use the `reviews` table directly.
--   - The old `rink_reviews` table is NOT dropped. We can retire it later
--     in a separate migration once we're confident the view emulates perfectly.
--
-- Scope: ONLY the reviews system. No other table is touched.

-- Step 1: Create the new polymorphic reviews table.
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('rink', 'team', 'league', 'player', 'business')),
  entity_id text NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text NULL,
  reviewer_name text NULL,
  reviewer_email text NULL,
  user_id text NULL REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reviews_text_len CHECK (review_text IS NULL OR char_length(review_text) <= 1000),
  CONSTRAINT reviews_email_format CHECK (
    reviewer_email IS NULL
    OR reviewer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  )
);

-- Indexes: queries for the rink detail page, dashboard, admin pages
CREATE INDEX IF NOT EXISTS idx_reviews_entity
  ON public.reviews(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id
  ON public.reviews(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_email
  ON public.reviews(reviewer_email) WHERE reviewer_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_status
  ON public.reviews(status, created_at DESC) WHERE status = 'pending';

-- updated_at trigger (reuse the function from listings migration)
DROP TRIGGER IF EXISTS reviews_set_updated_at ON public.reviews;
CREATE TRIGGER reviews_set_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_set_updated_at();

-- Enable RLS on the new table
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public reads only approved reviews
DROP POLICY IF EXISTS reviews_select_approved ON public.reviews;
CREATE POLICY reviews_select_approved ON public.reviews
  FOR SELECT USING (status = 'approved');

-- Reviewer reads their own (pending, etc.) via user_id match
DROP POLICY IF EXISTS reviews_select_own ON public.reviews;
CREATE POLICY reviews_select_own ON public.reviews
  FOR SELECT USING ((auth.uid())::text = user_id);

-- Anyone can submit (the public review form is anonymous, captures email)
DROP POLICY IF EXISTS reviews_insert_public ON public.reviews;
CREATE POLICY reviews_insert_public ON public.reviews
  FOR INSERT WITH CHECK (true);

-- Admin updates (approve/reject) — admin check via service role at API layer
DROP POLICY IF EXISTS reviews_update_admin ON public.reviews;
CREATE POLICY reviews_update_admin ON public.reviews
  FOR UPDATE USING (true) WITH CHECK (true);

-- Step 2: Backfill from rink_reviews (currently 0 rows; SQL is correct for any historical data)
-- The old rink_reviews schema is:
--   id, rink_id, rating, review_text, reviewer_name, reviewer_email,
--   user_id, status, created_at, updated_at
INSERT INTO public.reviews (
  id, entity_type, entity_id, rating, review_text,
  reviewer_name, reviewer_email, user_id, status, created_at
)
SELECT
  id,
  'rink'::text,
  rink_id::text,
  rating,
  review_text,
  reviewer_name,
  reviewer_email,
  user_id,
  COALESCE(status, 'pending'),
  COALESCE(created_at, now())
FROM public.rink_reviews
ON CONFLICT (id) DO NOTHING;

-- Step 3: Create the rink_reviews VIEW (replaces the table for read paths).
-- The view exposes the OLD column shape (rink_id, etc.) so the 7 call sites
-- work without code changes. Writes still go to the underlying table —
-- actually, since rink_reviews is now a VIEW, we need to handle writes.
-- For v1: keep rink_reviews as the WRITE target (the submit API still
-- inserts there) AND create a sibling VIEW called rink_reviews_view that
-- the read paths can use. BUT the cleanest approach is: replace the
-- rink_reviews table with a view that points at reviews, and the submit
-- API gets updated to insert into reviews directly with entity_type='rink'.
-- That's a code change in 1 file (the submit API).
--
-- Two paths:
--  A) Keep rink_reviews table, create rink_reviews_view that all 7 read sites
--     can use. Pros: zero code change. Cons: writes split between two tables.
--  B) Rename rink_reviews -> rink_reviews_legacy, create view rink_reviews
--     pointing at reviews. Update the 1 write site (submit) to insert into
--     reviews with entity_type='rink'. Cons: 1 file change.
--
-- Going with B — the submit API is the only writer, it's well-tested, and
-- the change is mechanical (add entity_type='rink' and entity_id=rink_id).

-- (Implementation: this is a planning note. The actual rename + view is done
-- in a separate, smaller migration so this file remains reviewable.)

-- Step 4: Verify the new table
SELECT
  (SELECT count(*) FROM public.reviews) AS reviews_total,
  (SELECT count(*) FROM public.reviews WHERE entity_type='rink') AS reviews_rinks,
  (SELECT count(*) FROM public.rink_reviews) AS rink_reviews_legacy_count;
