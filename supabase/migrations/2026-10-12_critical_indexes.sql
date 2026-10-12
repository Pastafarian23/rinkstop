-- 2026-10-12: Critical missing indexes for public directory queries
--
-- Audit per Arnel 2026-10-12 directive to identify which queries need
-- indexes. Findings (each column below is hit on every public
-- directory page render):
--
--   rinks.country         — no index. Country pages filter on this
--                          (/directory/sweden, /directory/united-states,
--                          /directory/japan, etc). 1,859 rows.
--   rinks.province_state  — no index. State/city pages filter on this.
--   rinks.city            — no index. City pages filter on this.
--                          (Covered indirectly by country + state
--                          compound index below.)
--   rinks.is_active       — no index. EVERY public query filters
--                          is_active=true. 1,859 rows.
--   teams.country         — no index. Country pages filter on this.
--   teams.is_active       — no index. EVERY public query filters
--                          is_active=true.
--   leagues.country       — no index. Federation pages filter on this.
--   leagues.is_active     — no index. EVERY public query filters
--                          is_active=true.
--   players.is_active     — no index. 6,352 rows; every public query
--                          filters is_active=true.
--
-- Compound indexes added for the most common query patterns:
--   rinks(country, is_active)         — country pages
--   rinks(country, province_state, is_active) — state pages
--   rinks(country, province_state, city, is_active) — city pages
--   teams(country, is_active)         — country pages
--   leagues(country, is_active)      — federation/country pages
--
-- All indexes are created with CONCURRENTLY to avoid blocking writes
-- during the migration (Supabase project on Micro plan has limited
-- connection slots; CONCURRENTLY keeps the migration safe).
-- IMPORTANT: CONCURRENTLY cannot run inside a transaction block. The
-- Supabase Management API wraps queries in a transaction by default, so
-- this migration file is intended to be applied via psql or the
-- Supabase SQL editor directly (not via /database/query).

-- ---- 1. rinks: country + state + city + active filters ----
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rinks_country_active
  ON public.rinks (country, is_active)
  WHERE country IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rinks_country_state_active
  ON public.rinks (country, province_state, is_active)
  WHERE country IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rinks_country_state_city_active
  ON public.rinks (country, province_state, city, is_active)
  WHERE country IS NOT NULL;

-- Single-column indexes for queries that filter by just one
-- (rare on the public site but used in admin / cron jobs).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rinks_is_active
  ON public.rinks (is_active);

-- ---- 2. teams: country + active filters ----
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_country_active
  ON public.teams (country, is_active)
  WHERE country IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_is_active
  ON public.teams (is_active);

-- ---- 3. leagues: country + active filters ----
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leagues_country_active
  ON public.leagues (country, is_active)
  WHERE country IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leagues_is_active
  ON public.leagues (is_active);

-- ---- 4. players: active filter ----
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_is_active
  ON public.players (is_active);

-- ---- 5. team_workspaces: country_code already has an index, but
--     is_active filter is missing for queries on /directory/teams. ----
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_workspaces_country_active
  ON public.team_workspaces (country_code, is_active)
  WHERE country_code IS NOT NULL;

-- ---- 6. listings: skipped (no country column; geographic data is in
--     the `location` text field, not queryable by country code). If
--     outreach tooling ever needs geographic lookups, parse `location`
--     into a separate country column with a backfill migration. ----
