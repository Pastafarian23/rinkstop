-- 2026-11-06 Phase 1 (roster system): repoint team FKs from legacy `teams` to
-- canonical `team_workspaces`.
--
-- WHY (Arnel: "this has to be a complete functionality that ties into
-- rinkstop. Federations should be able to update. Coaches and admins should
-- be able to manage and accept payments. Players should be able to manage
-- their own passport."):
--
--   The roster, coach, player, payment and passport features already exist
--   as separate mechanisms, but they do not agree on what a "team" is:
--
--     team_members.team_id      -> team_workspaces.id   (correct)
--     payments.team_id          -> team_workspaces.id   (correct)
--     players.team_id           -> teams.id             (legacy)
--     coach_profiles.current_team_id -> teams.id        (legacy)
--     hockey_player_team_history.team_id -> teams.id    (legacy)
--     ... 15 more columns across 17 tables
--
--   Same ids, so nothing errors today — but a team that exists ONLY in
--   `team_workspaces` (all 13 newly published India clubs, plus every club
--   a federation creates from now on) cannot be referenced by a coach, a
--   player, a passport or a payment. That is the roster blocker.
--
-- WHY THIS IS SAFE (verified live 2026-11-06 before writing):
--
--   - 3,249 of 3,249 legacy `teams` rows have a `team_workspaces` row with
--     the SAME id (100%). The ids are interchangeable.
--   - Every FK column that holds data resolves 100% against
--     `team_workspaces`, with ZERO broken references:
--       players 1,876/1,876 · hockey_player_team_history 1,860/1,860
--       player_team_history 20/20 · team_locations 30/30 · team_aliases
--       81/81 · nhl_official_standings 64/64 · posts 1,074/1,074 (home) and
--       1,073/1,073 (away) · fixtures 25,397/25,397 (home) and
--       25,397/25,397 (away).
--   - The empty tables (coaches, coach_team_history, game_players,
--     game_goalie_stats, play_by_play, team_stats, membership_cards,
--     coach_profiles) have no data to migrate.
--
-- WHAT THIS DOES NOT DO:
--
--   - It does NOT drop or alter the `teams` table. `teams` still owns the
--     lifecycle columns that `team_workspaces` does not have and that are
--     actively used:
--       deactivated_at          636 rows
--       merged_into_id           46 rows
--       claimable = false        97 rows
--       brand_id                 32 rows
--       city / country / state_province / logo_url / logo_source /
--       logo_verified_at / deactivated_reason
--     All 636 deactivated, 46 merged and 97 unclaimable legacy rows have a
--     matching `team_workspaces` row, so the repoint loses nothing.
--   - It does NOT move lifecycle data into `team_workspaces`. That is a
--     separate, larger migration and is NOT needed for rosters to work.
--
-- Idempotent: every constraint is dropped and recreated; re-running is safe.

-- ---------------------------------------------------------------------------
-- Drop the legacy FKs and recreate them against team_workspaces.
-- ---------------------------------------------------------------------------

-- players
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_team_id_fkey;
ALTER TABLE public.players
  ADD CONSTRAINT players_team_id_fkey FOREIGN KEY (team_id)
  REFERENCES public.team_workspaces(id) ON DELETE SET NULL;

-- coach_profiles
ALTER TABLE public.coach_profiles DROP CONSTRAINT IF EXISTS coach_profiles_current_team_id_fkey;
ALTER TABLE public.coach_profiles
  ADD CONSTRAINT coach_profiles_current_team_id_fkey FOREIGN KEY (current_team_id)
  REFERENCES public.team_workspaces(id) ON DELETE SET NULL;

-- coach_team_history
ALTER TABLE public.coach_team_history DROP CONSTRAINT IF EXISTS coach_team_history_team_id_fkey;
ALTER TABLE public.coach_team_history
  ADD CONSTRAINT coach_team_history_team_id_fkey FOREIGN KEY (team_id)
  REFERENCES public.team_workspaces(id) ON DELETE SET NULL;

-- coaches
ALTER TABLE public.coaches DROP CONSTRAINT IF EXISTS coaches_team_id_fkey;
ALTER TABLE public.coaches
  ADD CONSTRAINT coaches_team_id_fkey FOREIGN KEY (team_id)
  REFERENCES public.team_workspaces(id) ON DELETE SET NULL;

-- fixtures (home + away)
ALTER TABLE public.fixtures DROP CONSTRAINT IF EXISTS fixtures_home_team_id_fkey;
ALTER TABLE public.fixtures
  ADD CONSTRAINT fixtures_home_team_id_fkey FOREIGN KEY (home_team_id)
  REFERENCES public.team_workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.fixtures DROP CONSTRAINT IF EXISTS fixtures_away_team_id_fkey;
ALTER TABLE public.fixtures
  ADD CONSTRAINT fixtures_away_team_id_fkey FOREIGN KEY (away_team_id)
  REFERENCES public.team_workspaces(id) ON DELETE SET NULL;

-- game_players / game_goalie_stats / play_by_play / team_stats
ALTER TABLE public.game_players DROP CONSTRAINT IF EXISTS game_players_team_id_fkey;
ALTER TABLE public.game_players
  ADD CONSTRAINT game_players_team_id_fkey FOREIGN KEY (team_id)
  REFERENCES public.team_workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.game_goalie_stats DROP CONSTRAINT IF EXISTS game_goalie_stats_team_id_fkey;
ALTER TABLE public.game_goalie_stats
  ADD CONSTRAINT game_goalie_stats_team_id_fkey FOREIGN KEY (team_id)
  REFERENCES public.team_workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.play_by_play DROP CONSTRAINT IF EXISTS play_by_play_team_id_fkey;
ALTER TABLE public.play_by_play
  ADD CONSTRAINT play_by_play_team_id_fkey FOREIGN KEY (team_id)
  REFERENCES public.team_workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.team_stats DROP CONSTRAINT IF EXISTS team_stats_team_id_fkey;
ALTER TABLE public.team_stats
  ADD CONSTRAINT team_stats_team_id_fkey FOREIGN KEY (team_id)
  REFERENCES public.team_workspaces(id) ON DELETE SET NULL;

-- roster history (both tables)
ALTER TABLE public.hockey_player_team_history DROP CONSTRAINT IF EXISTS hockey_player_team_history_team_id_fkey;
ALTER TABLE public.hockey_player_team_history
  ADD CONSTRAINT hockey_player_team_history_team_id_fkey FOREIGN KEY (team_id)
  REFERENCES public.team_workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.player_team_history DROP CONSTRAINT IF EXISTS player_team_history_team_id_fkey;
ALTER TABLE public.player_team_history
  ADD CONSTRAINT player_team_history_team_id_fkey FOREIGN KEY (team_id)
  REFERENCES public.team_workspaces(id) ON DELETE SET NULL;

-- membership cards / locations / aliases / standings
ALTER TABLE public.membership_cards DROP CONSTRAINT IF EXISTS membership_cards_team_id_fkey;
ALTER TABLE public.membership_cards
  ADD CONSTRAINT membership_cards_team_id_fkey FOREIGN KEY (team_id)
  REFERENCES public.team_workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.team_locations DROP CONSTRAINT IF EXISTS team_locations_team_id_fkey;
ALTER TABLE public.team_locations
  ADD CONSTRAINT team_locations_team_id_fkey FOREIGN KEY (team_id)
  REFERENCES public.team_workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.team_aliases DROP CONSTRAINT IF EXISTS team_aliases_team_id_fkey;
ALTER TABLE public.team_aliases
  ADD CONSTRAINT team_aliases_team_id_fkey FOREIGN KEY (team_id)
  REFERENCES public.team_workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.nhl_official_standings DROP CONSTRAINT IF EXISTS nhl_official_standings_team_id_fkey;
ALTER TABLE public.nhl_official_standings
  ADD CONSTRAINT nhl_official_standings_team_id_fkey FOREIGN KEY (team_id)
  REFERENCES public.team_workspaces(id) ON DELETE SET NULL;

-- posts (home + away team references)
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_team_home_id_fkey;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_team_home_id_fkey FOREIGN KEY (team_home_id)
  REFERENCES public.team_workspaces(id) ON DELETE SET NULL;
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_team_away_id_fkey;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_team_away_id_fkey FOREIGN KEY (team_away_id)
  REFERENCES public.team_workspaces(id) ON DELETE SET NULL;
