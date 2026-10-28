-- 2026-10-28_nhl_home_rink_and_canadiens_reactivation.sql
--
-- FIX A — two related data defects in the NHL team graph:
--
--   A1. The Montreal Canadiens `teams` row (cff8bd78-5fee-49dc-b0ee-374722efd7b5)
--       was deactivated with reason "duplicate of Montréal Canadiens (dfa8a4b4),
--       accent difference only". No row with id prefix `dfa8a4b4` exists, and no
--       other row carries the Montréal accent slug. This row is the ONLY
--       Canadiens row and it holds 226 fixtures (114 home / 112 away), 23 of them
--       in the current 2026-27 season. Consequence: the NHL directory showed 31
--       active teams instead of 32, and the row was invisible to every
--       `is_active = true` filter (team lists, counts, standings joins).
--
--   A2. `team_workspaces.home_rink_id` was NULL for all 63 NHL-league
--       workspaces, even though `teams.home_rink_id` already carried verified
--       rink ids for 31 active teams. The rink pages join through
--       `team_workspaces.home_rink_id` (src/app/directory/rinks/[slug]/page.tsx),
--       so no NHL arena linked back to its team.
--
-- SAFETY NOTES
--   - The `teams_deactivation_consistent` CHECK constraint requires that an
--     active row has deactivated_at IS NULL AND merged_into_id IS NULL. All three
--     fields are cleared together here, otherwise the UPDATE is rejected.
--   - Every rink id below was verified to exist in `public.rinks` with
--     is_active = true BEFORE this migration was written.
--   - The workspace -> rink mapping is derived by EXACT slug join between
--     `team_workspaces` and `teams` (both in the NHL league). No name-based
--     guessing, no fuzzy matching.
--   - Bell Centre (ec7ebd24-f982-4e9d-aa72-a1ce7d44607d) was verified present
--     and active, Montreal QC, slug `bell-centre`.

-- ---------------------------------------------------------------------------
-- A1 — reactivate the Montreal Canadiens team row
-- ---------------------------------------------------------------------------
update public.teams
   set is_active         = true,
       deactivated_at    = null,
       deactivated_reason = null,
       merged_into_id    = null,
       home_rink_id      = 'ec7ebd24-f982-4e9d-aa72-a1ce7d44607d', -- Bell Centre
       updated_at        = now()
 where id = 'cff8bd78-5fee-49dc-b0ee-374722efd7b5'
   and slug = 'montreal-canadiens';

-- ---------------------------------------------------------------------------
-- A2 — backfill team_workspaces.home_rink_id from the verified teams mapping
--
-- Exact slug join. Restricted to the NHL league and to workspaces whose
-- home_rink_id is still NULL, so an operator-set value is never overwritten.
-- ---------------------------------------------------------------------------
update public.team_workspaces tw
   set home_rink_id = t.home_rink_id,
       updated_at    = now()
  from public.teams t
 where t.slug          = tw.slug
   and t.league_id     = tw.league_id
   and t.is_active     = true
   and t.home_rink_id is not null
   and tw.home_rink_id is null
   and tw.league_id = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';

notify pgrst, 'reload schema';
