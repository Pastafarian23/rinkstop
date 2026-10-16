-- 2026-10-16_teams_home_rink_id.sql
-- Add home_rink_id to teams table — denormalized pointer to the team's home venue.
-- Game pages read fixtures → teams, so this needs to be on `teams` (the table the
-- fixtures home_team_id / away_team_id FK already points to).
-- 32 active NHL teams get backfilled from the rink-name match mapping.
-- All other rows: nullable, no default. Reviews go to docs/reports/nhl-home-rink-review.csv.

alter table teams
  add column if not exists home_rink_id uuid references rinks(id) on delete set null;

create index if not exists teams_home_rink_id_idx
  on teams (home_rink_id)
  where home_rink_id is not null;

notify pgrst, 'reload schema';
