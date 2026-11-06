-- 2026-11-06: Keep rink contact details INTERNAL.
--
-- Arnel's directive (2026-11-06 08:26 CDT), extending the earlier
-- federation/team instruction to rinks:
--   "Make the rinks internal as well."
--
-- What becomes internal on `rinks`:
--   phone        — the rink's phone number (314 active rinks have one)
--   email        — the rink's email (0 today, but the column exists and
--                  rink owners can set it)
--   google_phone — the phone scraped from Google (649 active rinks)
--
-- What STAYS public:
--   website_url       — the rink's own website. That is public by nature:
--                        it is how a visitor finds the rink, and it is
--                        already linked from the rink's own page.
--   google_website    — same reasoning.
--   google_maps_url   — same reasoning.
--   static_map_url    — a map embed, not a contact detail.
--   address           — a rink's physical address is public directory
--                        content (it is what makes the listing useful).
--
-- The same Postgres pattern as the federation/team change
-- (2026-11-06_keep_team_federation_contacts_internal.sql):
--   A column-level REVOKE alone does NOT work, because the table ACL is
--   `anon=arwdDxtm/postgres` — a table-level SELECT grant that cannot be
--   narrowed by a column-level revoke. The working pattern is to REVOKE
--   the table-level SELECT and re-GRANT it on each non-sensitive column.
--
-- Consequence: no public path may use select=* on `rinks`. Audited —
-- every select('*') on rinks in the app uses supabaseAdmin (service_role),
-- which is unaffected by these grants.
--
-- The data is NOT deleted. It stays on the row for internal marketing
-- outreach, admin consoles, claim flows and booking inquiries, all of which
-- read through supabaseAdmin.

REVOKE SELECT ON public.rinks FROM anon, authenticated;

DO $$
DECLARE
  col text;
  allowed text[] := ARRAY[
    'id','name','slug','city','province_state','country','address','latitude',
    'longitude','capacity','ice_size','surface_type','website_url','logo_url',
    'is_active','created_at','updated_at','notes','source','status',
    'cover_photo_url','place_id','opening_hours_json','google_website',
    'google_maps_url','static_map_url','league','timezone',
    'cover_photo_verified_at','cover_photo_source','seo_h1','seo_title',
    'qr_identifier','verification_tier','qr_revoked_at','notes_generated',
    'meta_description','claimable'
  ];
BEGIN
  FOREACH col IN ARRAY allowed LOOP
    EXECUTE format('GRANT SELECT (%I) ON public.rinks TO anon, authenticated', col);
  END LOOP;
END $$;

COMMENT ON COLUMN public.rinks.phone IS
  'INTERNAL — rink contact phone. Not publicly readable (anon/authenticated SELECT revoked on this column; see migration 2026-11-06_keep_rink_contacts_internal.sql). Kept for internal marketing outreach, admin consoles, claim flows and booking inquiries. The rink''s website and address remain public.';
COMMENT ON COLUMN public.rinks.email IS
  'INTERNAL — rink contact email. Not publicly readable. Kept for internal marketing outreach, admin consoles, claim flows and booking inquiries.';
COMMENT ON COLUMN public.rinks.google_phone IS
  'INTERNAL — phone number sourced from Google. Not publicly readable. Kept for internal marketing outreach and admin consoles. The rink''s website and Google Maps link remain public.';
