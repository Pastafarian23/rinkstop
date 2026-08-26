-- ============================================================
-- SECURITY FIX: Enable RLS on tables that have it disabled
-- Found via RLS audit 2026-08-26
-- Tables with RLS disabled: rink_owners, player_team_history,
--   team_aliases, team_locations, team_name_review,
--   rinks_places_cache (spatial_ref_sys is a Postgres internal - skip)
-- ============================================================

-- 1. rink_owners (CRITICAL - Stripe Connect PII)
-- Purpose: links rink entities to their owner user accounts + Stripe Connect data
ALTER TABLE rink_owners ENABLE ROW LEVEL SECURITY;

-- Policy: rink owners can view their own rink ownership records
CREATE POLICY "rink_owners: owner can view own"
  ON rink_owners FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM claims
      WHERE claims.entity_id = rink_owners.rink_id::text
        AND claims.claim_type = 'rink'
        AND claims.user_id = auth.uid()::text
        AND claims.status = 'approved'
    )
  );

-- Policy: service role can do anything (for admin operations)
-- Note: Supabase service_role key bypasses RLS entirely

-- 2. player_team_history
ALTER TABLE player_team_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "player_team_history: public read"
  ON player_team_history FOR SELECT USING (true);
CREATE POLICY "player_team_history: authenticated can insert own"
  ON player_team_history FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
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
ALTER TABLE team_name_review ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_name_review: authenticated can view own"
  ON team_name_review FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = submitted_by_user_id
  );
CREATE POLICY "team_name_review: service role can do everything"
  ON team_name_review FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- 6. rinks_places_cache (non-sensitive cache table)
ALTER TABLE rinks_places_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rinks_places_cache: public read"
  ON rinks_places_cache FOR SELECT USING (true);
CREATE POLICY "rinks_places_cache: service role can refresh"
  ON rinks_places_cache FOR ALL USING (auth.jwt()->>'role' = 'service_role');
