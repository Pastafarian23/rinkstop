-- WS20 — rinks_places_cache (2026-08-07)
-- Caches Google Places API (New) results per rink to avoid re-paying for
-- the same call on every page render. Freshness window: 30 days.
--
-- Skips the Places `editorialSummary` field entirely to avoid any chance
-- of Google treating duplicated editorial copy as duplicate content.
-- Only structured metadata + photo URLs + hours are cached.
--
-- RLS: cache rows inherit via rink ownership; service_role bypasses.

CREATE TABLE IF NOT EXISTS rinks_places_cache (
  rink_id UUID PRIMARY KEY REFERENCES rinks(id) ON DELETE CASCADE,
  place_id TEXT,
  cover_photo_url TEXT,
  opening_hours_json JSONB,
  rating NUMERIC(2,1),
  user_ratings_total INTEGER,
  formatted_address TEXT,
  google_phone TEXT,
  google_website TEXT,
  google_maps_url TEXT,
  photos_urls TEXT[],
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX IF NOT EXISTS rinks_places_cache_place_id_idx ON rinks_places_cache(place_id);
CREATE INDEX IF NOT EXISTS rinks_places_cache_expires_idx ON rinks_places_cache(expires_at);

-- Comment for clarity
COMMENT ON TABLE rinks_places_cache IS 'WS20: Google Places (New) cache. Excludes editorialSummary to avoid duplicate-content risk.';
