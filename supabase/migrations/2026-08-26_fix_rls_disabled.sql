-- ============================================================
-- SECURITY FIX: Enable RLS on tables that have it disabled
-- Issue: Supabase flagged 6 user-tables as publicly accessible
--
-- NOTE: This file was originally created 2026-08-26 but never applied.
-- The on-disk version had stale column references. Applied 2026-09-02
-- with corrections (see _HAND_APPLIED.md).
--
-- Corrections vs original:
--   player_team_history: user_id → player_id (auth.uid()::text = player_id::text)
--   team_name_review: submitted_by_user_id → requested_by (auth.uid()::text = requested_by)
--   rink_owners: claims.entity_id cast to text in subquery
--   All UUID/text user_id columns: use ::text cast for auth.uid() comparison
--
-- Tables: rink_owners, player_team_history, team_aliases,
--         team_locations, team_name_review, rinks_places_cache
-- spatial_ref_sys is PostGIS internal — skip (not user data)
-- ============================================================

-- 1. rink_owners
-- Purpose: links rink entities to owner user accounts + Stripe Connect data
ALTER TABLE rink_owners ENABLE ROW LEVEL SECURITY;

-- Policy: owners can view their own rink ownership records
-- claims.entity_id is TEXT, so cast rink_id::text for the comparison
CREATE POLICY "rink_owners: owner can view own"
  ON rink_owners FOR SELECT
  USING (
    auth.uid()::text = user_id::text
    OR EXISTS (
      SELECT 1 FROM claims
      WHERE claims.entity_id = rink_owners.rink_id::text
        AND claims.claim_type = 'rink'
        AND claims.user_id = auth.uid()::text
        AND claims.status = 'approved'
    )
  );

-- 2. player_team_history
-- Note: player_team_history has player_id (UUID), not user_id
ALTER TABLE player_team_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "player_team_history: public read"
  ON player_team_history FOR SELECT USING (true);
CREATE POLICY "player_team_history: authenticated can insert own"
  ON player_team_history FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid()::text = player_id::text
  );

-- 3. team_aliases
ALTER TABLE team_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_aliases: public read"
  ON team_aliases FOR SELECT USING (true);
CREATE POLICY "team_aliases: service role only write"
  ON team_aliases FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- 4. team_locations
ALTER TABLE team_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_locations: public read"
  ON team_locations FOR SELECT USING (true);
CREATE POLICY "team_locations: authenticated can insert"
  ON team_locations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 5. team_name_review
-- Note: team_name_review has requested_by (TEXT), not submitted_by_user_id
ALTER TABLE team_name_review ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_name_review: requester can view own"
  ON team_name_review FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND auth.uid()::text = requested_by
  );
CREATE POLICY "team_name_review: service role can do everything"
  ON team_name_review FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- 6. rinks_places_cache (non-sensitive cache table)
ALTER TABLE rinks_places_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rinks_places_cache: public read"
  ON rinks_places_cache FOR SELECT USING (true);
CREATE POLICY "rinks_places_cache: service role can refresh"
  ON rinks_places_cache FOR ALL USING (auth.jwt()->>'role' = 'service_role');
