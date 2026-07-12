-- Photo verification columns for rinks.cover_photo_url
--
-- Why: 718 rink photos came from Google Places Text Search "first result, first
-- photo" with no verification (scripts/enrich-rinks-photos.mjs). Arnel flagged
-- these on 2026-07-08 — the photos look AI-generated and don't match the
-- actual facilities. RinkStop is a fact-based directory; unverified media
-- shouldn't be presented as authoritative.
--
-- What: two new columns on rinks:
--   cover_photo_verified_at  timestamptz, nullable. NULL = not verified.
--   cover_photo_source       text, nullable. Where the photo came from.
--
-- Backfill: mark all existing cover_photo_url rows as
-- source='google_places_unverified', verified_at=NULL. This way the data is
-- honest about its provenance and easy to filter.
--
-- Symmetry: also adding same columns to teams.logo_url, leagues.logo_url,
-- and players.headshot_url. Even though Arnel's visual check on those
-- suggests they're fine (NHL.com CDN for player headshots and most team
-- logos), having a verification trail for all media columns is the right
-- baseline for a fact-based directory.

BEGIN;

ALTER TABLE public.rinks
  ADD COLUMN IF NOT EXISTS cover_photo_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS cover_photo_source text;

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS logo_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS logo_source text;

ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS logo_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS logo_source text;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS headshot_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS headshot_source text;

-- Backfill: existing photos are auto-pulled, not human-verified.
UPDATE public.rinks
   SET cover_photo_source = 'google_places_unverified',
       cover_photo_verified_at = NULL
 WHERE cover_photo_url IS NOT NULL;

UPDATE public.teams
   SET logo_source = COALESCE(
         CASE
           WHEN logo_url LIKE '%assets.nhle.com%' THEN 'nhl_official_cdn_unverified'
           WHEN logo_url LIKE '%highlightly.net%' THEN 'highlightly_unverified'
           ELSE 'unknown_unverified'
         END,
         'unknown_unverified'),
       logo_verified_at = NULL
 WHERE logo_url IS NOT NULL;

UPDATE public.leagues
   SET logo_source = 'unknown_unverified',
       logo_verified_at = NULL
 WHERE logo_url IS NOT NULL;

UPDATE public.players
   SET headshot_source = COALESCE(
         CASE
           WHEN headshot_url LIKE '%assets.nhle.com%' THEN 'nhl_official_cdn_unverified'
           ELSE 'unknown_unverified'
         END,
         'unknown_unverified'),
       headshot_verified_at = NULL
 WHERE headshot_url IS NOT NULL;

COMMIT;