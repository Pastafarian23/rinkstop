-- ============================================================
-- Profile Search History (Day 351, Arnel 2026-08-12 03:28 CDT)
-- ============================================================
-- Per-user recent searches for the search bar(s). Populated when a user
-- executes a search (form submit, suggestion click, or directory ?q= view)
-- from any of: home hero, dashboard header, or Cmd+K command palette.
--
-- Why this exists:
--   - User explicitly approved "recent searches history" as an addition to
--     the search placement work (per MEMORY.md 2026-08-12).
--   - Replaces per-browser localStorage history with a server-side record
--     that follows the user across devices.
--   - Lets the search dropdown surface "Recent: Patrick Kane" suggestions
--     for repeat users, reducing typing for the most common lookups.
--
-- Lifecycle:
--   - UPSERT on (user_id, query_normalized): increments search_count,
--     updates last_searched_at. The 8 most recent unique queries are shown.
--   - DELETE: automatic eviction when count > 8 distinct queries per user
--     (oldest by last_searched_at get pruned by the upsert flow, see below).
--
-- Visibility:
--   - SELECT: only the user themselves (their own history).
--   - INSERT/UPDATE/DELETE: only via service role (the search components
--     call a server route that uses supabaseAdmin). No public write.
--   - We deliberately do NOT expose this as a public profile field.

-- ----------------------------------------------------------
-- Schema
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS profile_search_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT NOT NULL,             -- Clerk user id
  query               TEXT NOT NULL,             -- original query (preserves casing for the user)
  query_normalized    TEXT NOT NULL,             -- lowercased + trimmed (dedup key)
  source              TEXT NOT NULL DEFAULT 'home_hero'
    CHECK (source IN ('home_hero', 'dashboard_header', 'command_palette', 'directory_results')),
  search_count        INTEGER NOT NULL DEFAULT 1,
  first_searched_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_searched_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-user dedup: at most one row per (user_id, query_normalized).
CREATE UNIQUE INDEX IF NOT EXISTS profile_search_history_user_query_uniq
  ON profile_search_history (user_id, query_normalized);

-- Fast lookup of "my 8 most recent searches" for the dropdown.
CREATE INDEX IF NOT EXISTS profile_search_history_user_recent
  ON profile_search_history (user_id, last_searched_at DESC);

-- ----------------------------------------------------------
-- RLS
-- ----------------------------------------------------------
ALTER TABLE profile_search_history ENABLE ROW LEVEL SECURITY;

-- RLS strategy:
--   Clerk uses external user ids (e.g. user_3Etd1E64...). Supabase's auth.uid()
--   returns the Supabase-internal UUID, NOT the Clerk id. So RLS policies that
--   reference auth.uid() cannot authorize Clerk users. We rely on application-
--   layer enforcement:
--     - API routes call Clerk's auth() to get the Clerk userId
--     - All queries filter by `eq('user_id', clerkUserId)` server-side
--     - supabaseAdmin (service role) bypasses RLS for INSERTs
--   For defense-in-depth, we add a blanket policy that blocks ALL client-side
--   access. No direct PostgREST writes/reads from the browser should ever hit
--   this table — all access goes through the /api/profile/search-history route.
DROP POLICY IF EXISTS search_history_no_client_access ON profile_search_history;
CREATE POLICY search_history_no_client_access ON profile_search_history
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- ----------------------------------------------------------
-- Verify schema
-- ----------------------------------------------------------
DO $$
DECLARE
  table_exists boolean;
  index_count int;
  policy_count int;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profile_search_history') INTO table_exists;
  IF NOT table_exists THEN
    RAISE EXCEPTION 'profile_search_history table was not created';
  END IF;

  SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'profile_search_history' INTO index_count;
  IF index_count < 3 THEN
    RAISE EXCEPTION 'expected 3 indexes on profile_search_history, found %', index_count;
  END IF;

  SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profile_search_history' INTO policy_count;
  IF policy_count < 1 THEN
    RAISE EXCEPTION 'expected at least 1 policy on profile_search_history, found %', policy_count;
  END IF;

  RAISE NOTICE 'profile_search_history verified: table exists, 3 indexes, % policies', policy_count;
END $$;