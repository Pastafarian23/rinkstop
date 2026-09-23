-- ============================================================
-- SECURITY FIX: Add SET search_path to 28 user-defined functions
--
-- Date: 2026-09-23
-- Per Supabase advisor 'function_search_path_mutable' warning.
--
-- Without SET search_path, a malicious user with CREATE privilege
-- could create objects in a schema that appears first in the search
-- path (e.g. 'pg_temp') and have function code resolve to those
-- objects instead of the intended public.* tables.
--
-- Fix: add SET search_path = pg_catalog, public to each function.
-- This restricts the function's name resolution to trusted schemas.
--
-- Strategy: ALTER FUNCTION ... SET search_path = pg_catalog, public;
-- This preserves the function body and adds the search_path setting.
--
-- Skipped: PostGIS internal functions (st_*, addgeometry*, etc.)
--          managed by PostGIS extension itself.
--
-- ============================================================

BEGIN;

-- 1. analytics_events_set_ts_second
ALTER FUNCTION public.analytics_events_set_ts_second() SET search_path = pg_catalog, public;

-- 2. certifications_set_international
ALTER FUNCTION public.certifications_set_international() SET search_path = pg_catalog, public;

-- 3. certifications_set_updated_at
ALTER FUNCTION public.certifications_set_updated_at() SET search_path = pg_catalog, public;

-- 4. equipment_set_updated_at
ALTER FUNCTION public.equipment_set_updated_at() SET search_path = pg_catalog, public;

-- 5. federation_registrations_set_updated_at
ALTER FUNCTION public.federation_registrations_set_updated_at() SET search_path = pg_catalog, public;

-- 6. fn_free_agent_touch_updated_at
ALTER FUNCTION public.fn_free_agent_touch_updated_at() SET search_path = pg_catalog, public;

-- 7. fn_row_audit
ALTER FUNCTION public.fn_row_audit() SET search_path = pg_catalog, public;

-- 8. generate_invite_code
ALTER FUNCTION public.generate_invite_code(p_prefix text) SET search_path = pg_catalog, public;


-- 10. learn_progress_set_updated_at
ALTER FUNCTION public.learn_progress_set_updated_at() SET search_path = pg_catalog, public;

-- 11. notification_email_prefs_set_updated_at
ALTER FUNCTION public.notification_email_prefs_set_updated_at() SET search_path = pg_catalog, public;

-- 12. passports_set_updated_at
ALTER FUNCTION public.passports_set_updated_at() SET search_path = pg_catalog, public;

-- 13. posts_set_pillar
ALTER FUNCTION public.posts_set_pillar() SET search_path = pg_catalog, public;

-- 14. prevent_duplicate_active_league
ALTER FUNCTION public.prevent_duplicate_active_league() SET search_path = pg_catalog, public;

-- 15. profile_country_context_set_updated_at
ALTER FUNCTION public.profile_country_context_set_updated_at() SET search_path = pg_catalog, public;

-- 16. set_admin_arranged_bookings_updated_at
ALTER FUNCTION public.set_admin_arranged_bookings_updated_at() SET search_path = pg_catalog, public;

-- 17. set_founding_partner_signups_updated_at
ALTER FUNCTION public.set_founding_partner_signups_updated_at() SET search_path = pg_catalog, public;

-- 18. set_public_booking_inquiries_updated_at
ALTER FUNCTION public.set_public_booking_inquiries_updated_at() SET search_path = pg_catalog, public;

-- 19. set_team_event_currency
ALTER FUNCTION public.set_team_event_currency() SET search_path = pg_catalog, public;

-- 20. set_team_workspace_currency
ALTER FUNCTION public.set_team_workspace_currency() SET search_path = pg_catalog, public;

-- 21. set_updated_at
ALTER FUNCTION public.set_updated_at() SET search_path = pg_catalog, public;

-- 22. touch_updated_at
ALTER FUNCTION public.touch_updated_at() SET search_path = pg_catalog, public;

-- 23. trg_practice_plans_updated_at
ALTER FUNCTION public.trg_practice_plans_updated_at() SET search_path = pg_catalog, public;





-- 28. user_credentials_set_updated_at
ALTER FUNCTION public.user_credentials_set_updated_at() SET search_path = pg_catalog, public;

COMMIT;
