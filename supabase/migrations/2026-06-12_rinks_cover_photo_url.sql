-- Migration: Add rinks.cover_photo_url for Google Places Photo enrichment
-- Date: 2026-06-12
-- Reason: Many rinks in the directory don't have a logo_url or other image.
--          This column stores a Google Places Photo URL (lh3.googleusercontent.com)
--          that renders as the cover photo in the rink page hero.
--
-- One-time enrichment via scripts/enrich-rinks-photos.mjs:
--   - Queries rinks WHERE is_active=true AND latitude IS NOT NULL AND cover_photo_url IS NULL
--   - For each, hits Google Places Text Search + Photos API
--   - Stores the signed photo URL (extracted from the 302 Location header)
--   - ~$7/1000 photos; ~$7.24 for 1,034 rinks on first pass
--   - Resumable: re-runs only process rinks still missing cover_photo_url
--
-- Important: do NOT use as the primary key in the schema.org image field
-- without a fallback. Google Photos URLs are signed and may rotate; for
-- long-term SEO, a self-hosted image is preferable. We store the URL here
-- for fast page renders and revisit a self-hosted pipeline later.

ALTER TABLE public.rinks
  ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

-- Index for fast "missing photo" queries during enrichment runs.
-- A partial index on NULL is much smaller than indexing the whole table.
CREATE INDEX IF NOT EXISTS rinks_cover_photo_url_missing_idx
  ON public.rinks (id)
  WHERE cover_photo_url IS NULL;
