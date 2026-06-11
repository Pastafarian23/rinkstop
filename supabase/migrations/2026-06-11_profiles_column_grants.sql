-- Restrict anon direct REST access to profiles.
-- Anon previously could SELECT all 15 columns via /rest/v1/profiles?select=*,
-- including stripe_customer_id, stripe_subscription_id, subscription_status,
-- and role (admin/super_admin flag).
--
-- The Next.js API routes (e.g. /api/profiles/[userId], /api/profiles/me)
-- use supabaseAdmin (service role) which bypasses GRANTs, so this only
-- affects direct browser REST queries against /rest/v1/profiles.
--
-- Verify after applying:
--   curl 'https://...supabase.co/rest/v1/profiles?select=stripe_customer_id' \
--     -H "apikey: <anon>" -H "Authorization: Bearer <anon>"
--   → should return 401 or PGRST106 (column not found in select list)

REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (
  user_id,
  display_name,
  bio,
  avatar_url,
  location,
  tier,
  tier_expires_at,
  is_founding_member,
  created_at
) ON public.profiles TO anon;
