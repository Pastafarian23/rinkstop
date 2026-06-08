-- 2026-06-08: Admin role for profiles
--
-- Purpose:
--   Add a `role` column to profiles table to support the /admin dashboard.
--   Default is 'user'. Promote via UPDATE profiles SET role='super_admin' WHERE user_id=...
--
-- Used by:
--   - src/lib/admin-auth.ts (server-side guard)
--   - src/app/admin/layout.tsx (sidebar/header)
--   - src/app/api/admin/* (API endpoints)
--
-- Roles:
--   user       - default, no admin access
--   admin      - can manage listings/content
--   super_admin - full access, can manage other admins

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin', 'super_admin'));

-- Index for fast role lookups
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role) WHERE role <> 'user';

-- No RLS changes needed: profiles are private to the owner, role is just metadata.
-- Admin access is enforced at the application layer via Clerk publicMetadata.
