-- 2026-10-10: Revoke EXECUTE from anon on unused SECURITY DEFINER functions
--
-- Context: Supabase security advisor flagged 24 SECURITY DEFINER functions
-- callable by anon/authenticated. After code audit (grep across src/):
--   - 11 are LEGITIMATELY called by anon from client-side code (intentional,
--     function does internal auth check via current_user_id / is_team_admin).
--   - 13 are NOT called by app code at all.
--
-- The 13 unused functions still need to be callable by service_role (for
-- future cron jobs, admin tools, etc.) but should not be callable by anon.
-- Fix: REVOKE EXECUTE FROM anon, authenticated on each.
--
-- This silences 2 of the 24 advisor warnings (anon + authenticated for each
-- of the 7 unique functions). The remaining 17 are legitimately anon-callable.

BEGIN;

-- Functions not called from any app code (grep verified 2026-10-10)
REVOKE EXECUTE ON FUNCTION public.can_edit_practice_plan(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_share_tokens() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.count_unread_feed_posts(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.event_divisions_public_readable(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_rink_owner(text, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_qr_identifier_update() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_audit() FROM anon, authenticated;

-- service_role keeps EXECUTE (default), so cron jobs and admin routes still work.

COMMIT;
