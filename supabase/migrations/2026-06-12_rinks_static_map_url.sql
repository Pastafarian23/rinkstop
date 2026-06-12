-- Migration: Add rinks.static_map_url for pre-baked map thumbnails
-- Date: 2026-06-12
-- Reason: The directory list page renders 50+ rinks per view. Calling the
-- Google Static API on every request would (a) cost ~50 API calls per page
-- view and (b) leak the Google API key in the browser HTML source when the
-- signed URL is rendered as <img src>. We pre-bake each rink's map into
-- Supabase Storage once and serve the public Supabase URL from our CDN.
--
-- The column stores OUR public Supabase Storage URL
-- (e.g. https://<project>.supabase.co/storage/v1/object/public/rink-maps/static/<id>.png)
-- — NEVER the Google-signed URL.
--
-- Backfill: scripts/enrich-rinks-static-maps.mjs
-- Renders: src/app/directory/rinks/RinksIndexClient.tsx (thumb on each card)

ALTER TABLE public.rinks
  ADD COLUMN IF NOT EXISTS static_map_url text NULL;
