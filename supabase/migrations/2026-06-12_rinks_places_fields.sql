-- Migration: Add Google Places enrichment columns to rinks
-- Date: 2026-06-12
-- Reason: One-time enrichment to add operating hours + Google Maps link
-- to every active rink with coordinates. Drives the "Open now" / "Closed now"
-- pill on each rink page.
--
-- Columns:
--   place_id            — Google's stable place ID (for re-fetching later)
--   opening_hours_json  — Google's full opening_hours object verbatim
--                          (we interpret on the client to render the pill)
--   google_phone        — formatted_phone_number from Places Details
--   google_website      — website from Places Details
--   google_maps_url     — the maps.google.com link from Places Details
--
-- Resumable: the enrich script queries WHERE place_id IS NULL, so any rink
-- that fails or is skipped can be retried by re-running.

ALTER TABLE public.rinks
  ADD COLUMN IF NOT EXISTS place_id text,
  ADD COLUMN IF NOT EXISTS opening_hours_json jsonb,
  ADD COLUMN IF NOT EXISTS google_phone text,
  ADD COLUMN IF NOT EXISTS google_website text,
  ADD COLUMN IF NOT EXISTS google_maps_url text;

-- Index for fast resumable queries: "give me rinks with no place_id"
-- AND for analytics (e.g. "how many rinks have published hours").
CREATE INDEX IF NOT EXISTS rinks_place_id_idx ON public.rinks (place_id);
