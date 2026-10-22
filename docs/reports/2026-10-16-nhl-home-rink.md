# NHL Home Rink Mapping — 2026-10-16

## Context
- **Bug class:** 2,997 fixture rows in nhl_matches had no venue link. Game pages and rink pages couldn't connect team → home rink → game.
- **Decision:** Add `home_rink_id` to `teams` (the table that `fixtures.home_team_id` FK already points to). Game pages and rink pages join through this column.
- **Scope:** 31 active NHL teams. 1 active team count discrepancy (31, not 32 — historical review below).

## Migration
`supabase/migrations/2026-10-16_teams_home_rink_id.sql` — adds `home_rink_id uuid REFERENCES rinks(id) ON DELETE SET NULL`, partial index on non-null values. Applied 2026-10-16 via Supabase Management API.

## Bell Centre + Rogers Arena existence (verified)
- **Bell Centre** — id `ec7ebd24-f982-4e9d-aa72-a1ce7d44607d`, Montreal QC, lat 45.49603, lon -73.569436 ✓
- **Rogers Arena** — id `c2c1f5aa-78ea-4ee5-ae88-0455505d97db`, Vancouver BC, lat 49.2778358, lon -123.1088227 ✓

## Mapping method
1. For each active NHL team, query `fixtures` where `home_team_id = team.id` (last 50 games)
2. Count occurrences of `game_data.venue.default` per team
3. Take the top venue
4. Match venue name to a rink via alias list (e.g. Amalie Arena → Benchmark International Arena, Xcel Energy Center → Grand Casino Arena)
5. Exact name match only — fallbacks would be guesses, not "exact matches"

## Full 32-row mapping
See `nhl-home-rink-mapping.csv` (this directory).

## 5 sample rows
| team | venue (NHL.com) | rink_id | rink_name | city |
|---|---|---|---|---|
| Boston Bruins | TD Garden | (id) | TD Garden | Boston MA |
| Edmonton Oilers | Rogers Place | (id) | Rogers Place | Edmonton AB |
| Tampa Bay Lightning | Benchmark International Arena | (id) | Amalie Arena | Tampa FL |
| Vegas Golden Knights | T-Mobile Arena | (id) | T-Mobile Arena | Las Vegas NV |
| New York Rangers | Madison Square Garden | (id) | Madison Square Garden | New York NY |

## Anomalies to review (do not merge until human-verified)
- **cff8bd78-5fee-49dc-b0ee-374722efd7b5** "Montreal Canadiens" (inactive, deactivated_reason: "duplicate of Montréal Canadiens (dfa8a4b4), accent difference only"). 0 fixtures. Canonical: the active `montreal-canadiens` row.
- **898e8374-f678-41c3-9876-95f7beaebaf6** "Winnipeg Jets" (inactive, slug `winnipeg-jets-whl`). 0 fixtures. Canonical: `88d85b2b-7a91-4679-b1d4-e45d73e3838f` (active `winnipeg-jets`).
- **3b80d876-f931-4740-a47f-0ed15c0e410f** "Utah Hockey Club" (inactive, already merged_into_id = 82a53679). Clean — no action needed.

## Renamed arenas (rink-table name ≠ current NHL name)
These are correctly matched by alias. The rink table records the historical/alternate name.
- **Minnesota Wild** → Xcel Energy Center (current: Grand Casino Arena)
- **Philadelphia Flyers** → Wells Fargo Center (current: Xfinity Mobile Arena)
- **Tampa Bay Lightning** → Amalie Arena (current: Benchmark International Arena)

All three city+province pairs match the NHL.com venue exactly. No review needed.
