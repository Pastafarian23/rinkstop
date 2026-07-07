-- 2026-07-12 — Featured Placement (Phase 1c-2)
-- Prep: docs/phase-1c-2-prep-featured-placement.md (inline below)
-- Approved by Arnel 2026-07-07 (B1)
--
-- Adds featured placement columns to listings table.
-- "Featured" listings surface first in directory search and the business
-- listing dashboard gets a "Promote to featured" CTA for Business Plus+.

BEGIN;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_at timestamptz,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS featured_by_user_id text REFERENCES public.profiles(user_id) ON DELETE SET NULL;

CREATE INDEX listings_is_featured_idx
  ON public.listings (is_featured, featured_until)
  WHERE is_featured = true;

-- v2: payment integration (manual flag now; tier-gated self-service in v2)

COMMIT;
