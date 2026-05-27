-- =============================================
-- RinkStop Dashboard Tables — Run in Supabase
-- =============================================
-- How to run:
-- 1. Go to https://supabase.com/dashboard → your project → SQL Editor
-- 2. Paste this entire block and click "Run"
-- =============================================

-- CLAIMS TABLE
CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('rink', 'team', 'player')),
  entity_name TEXT NOT NULL,
  entity_id TEXT,
  reason TEXT NOT NULL,
  proof TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FAVORITES TABLE
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  favorite_type TEXT NOT NULL CHECK (favorite_type IN ('player', 'team', 'rink')),
  favorite_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, favorite_type, favorite_id)
);

-- USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- Users can only see/edit their own records
-- =============================================

-- Enable RLS on all three tables
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Claims: users can only see their own claims
DROP POLICY IF EXISTS claims_select ON public.claims;
DROP POLICY IF EXISTS claims_insert ON public.claims;
CREATE POLICY claims_select ON public.claims FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY claims_insert ON public.claims FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Favorites: users can only see their own favorites
DROP POLICY IF EXISTS favorites_select ON public.favorites;
DROP POLICY IF EXISTS favorites_insert ON public.favorites;
DROP POLICY IF EXISTS favorites_delete ON public.favorites;
CREATE POLICY favorites_select ON public.favorites FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY favorites_insert ON public.favorites FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY favorites_delete ON public.favorites FOR DELETE USING (auth.uid()::text = user_id);

-- Profiles: users can only see/edit their own profile
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_upsert ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY profiles_upsert ON public.profiles FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- =============================================
-- Done! Verify tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- =============================================