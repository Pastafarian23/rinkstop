-- 2026-11-06: Keep federation and team contact details INTERNAL.
--
-- Arnel's directive (2026-11-06 08:08 CDT):
--   "all i said is that federation or team emails should not be publicly
--    facing, nor should phone numbers. Those are for us internally for
--    marketing"
--
-- Problem (verified live 2026-11-06 with the anon PostgREST key):
--   1. The public team profile rendered the submitter's email:
--        /directory/teams/slough-satans  ->  mailto:sloughsatans@gmail.com
--      Source: src/app/directory/teams/[slug]/PublicTeamProfile.tsx:806-828
--   2. The public federation page rendered the federation's email:
--        /federations/india  ->  mailto:icehockeyindia@gmail.com
--      Source: src/app/federations/[country]/page.tsx:260-271
--      (That value was set by the 2026-11-06 India inventory migration.)
--   3. RLS does NOT protect columns. The anon key could read the contact
--      columns DIRECTLY out of PostgREST, bypassing the pages entirely:
--        anon -> team_workspaces.select('slug,contact_email')  = 1 row
--        anon -> federations.select('slug,contact_email')      = 1 row
--
-- Why a column-level REVOKE alone does not work (tested live):
--   `REVOKE SELECT (contact_email) ... FROM anon` has NO effect, because the
--   table-level ACL is `anon=arwdDxtm/postgres` — the `r` is a table-level
--   SELECT grant, and a table-level grant cannot be narrowed by a
--   column-level revoke.
--
-- The working pattern (verified live on team_workspaces before writing this):
--   1. REVOKE the table-level SELECT from anon + authenticated.
--   2. GRANT SELECT on every non-sensitive column individually.
--   Then `select=contact_email` fails with "permission denied for table" while
--   `select=slug,name,visibility` still works.
--
-- The data is NOT deleted. It stays on the row for INTERNAL use (marketing
-- outreach, admin consoles, claim flows) — it is simply no longer readable by
-- the public anon/authenticated roles.
--
-- Verified safe: every `select('*')` on these tables in the app uses
-- `supabaseAdmin` (service_role), which is unaffected by these grants. The
-- one anon-client `select('*')` reference is a doc comment in
-- src/lib/supabase.ts. No public read path uses `select=*` on these tables.
--
-- NOT changed here: `rinks.email` / `rinks.phone` (315 anon-readable rink
-- phones). A rink's phone number is ordinary public directory content — it
-- is how a visitor finds the rink — unlike a federation's or a team's
-- private contact. Awaiting Arnel's call on that scope.

-- ---------------------------------------------------------------------------
-- team_workspaces
-- ---------------------------------------------------------------------------
REVOKE SELECT ON public.team_workspaces FROM anon, authenticated;

DO $$
DECLARE
  col text;
  allowed text[] := ARRAY[
    'id','slug','name','short_name','home_rink_id','home_city','home_country',
    'age_category','level','season_label','founded_on','avatar_url','banner_url',
    'description','visibility','is_active','created_by','created_at','updated_at',
    'archived_at','country_code','currency','age_label','age_min','age_max',
    'timezone','pending_name','pending_short_name','pending_submitted_at',
    'pending_submitted_by','federation_id','organization_id','league_id',
    'website_url','division','colors','home_state','brand_primary_color',
    'brand_secondary_color','brand_accent_color','brand_logo_url',
    'brand_favicon_url','brand_tagline','brand_custom_domain','brand_og_image_url',
    'is_published','owner_user_id'
  ];
BEGIN
  FOREACH col IN ARRAY allowed LOOP
    EXECUTE format('GRANT SELECT (%I) ON public.team_workspaces TO anon, authenticated', col);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- federations
-- contact_email / contact_phone / pending_contact_email / pending_contact_phone
-- are the internal contact fields. The `pending_*` variants are the
-- owner-submitted replacement values awaiting admin approval — also internal.
-- ---------------------------------------------------------------------------
REVOKE SELECT ON public.federations FROM anon, authenticated;

DO $$
DECLARE
  col text;
  allowed text[] := ARRAY[
    'id','slug','name','country_code','logo_url','website_url','is_active',
    'created_at','updated_at','category','kind','owner_user_id','description',
    'logo_source','logo_verified_at','claimable',
    'pending_name','pending_logo_url','pending_description','pending_website_url',
    'pending_submitted_at','pending_submitted_by'
  ];
BEGIN
  FOREACH col IN ARRAY allowed LOOP
    EXECUTE format('GRANT SELECT (%I) ON public.federations TO anon, authenticated', col);
  END LOOP;
END $$;

COMMENT ON COLUMN public.team_workspaces.contact_email IS
  'INTERNAL — team contact email. Not publicly readable (anon/authenticated SELECT revoked on this column; see migration 2026-11-06_keep_team_federation_contacts_internal.sql). Kept for internal marketing outreach, admin consoles and claim flows. Do not render on public pages.';
COMMENT ON COLUMN public.team_workspaces.contact_phone IS
  'INTERNAL — team contact phone. Not publicly readable. Kept for internal marketing outreach and admin consoles. Do not render on public pages.';
COMMENT ON COLUMN public.federations.contact_email IS
  'INTERNAL — federation contact email. Not publicly readable. Kept for internal marketing outreach, admin consoles and claim flows. Do not render on public pages.';
COMMENT ON COLUMN public.federations.contact_phone IS
  'INTERNAL — federation contact phone. Not publicly readable. Kept for internal marketing outreach and admin consoles. Do not render on public pages.';
