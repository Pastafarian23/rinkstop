# Task 2 — Venues Report

**Date:** 2026-10-16

## What exists

- `teams` table has 3,244 rows (countries, federations, clubs)
- `rinks` table has 1,919 rows
- `teams.home_rink_id` column does NOT exist — needs migration
- No venue/rink column on fixtures
- NHL fixture `game_data` is empty — no venue data from NHL.com
- KHL/PWHL fixtures have `game_data` with different schemas

## What to do

1. Add `teams.home_rink_id` FK → `rinks.id` (nullable)
2. For NHL: look up each team's known home arena, match to `rinks` by exact name
3. For KHL/PWHL: same pattern (known arenas, exact match)
4. Unmatched teams → CSV at `docs/reports/venues-unmatched.csv` for human review
5. Game venue fallback: fixture venue falls back to `teams.home_rink_id` if available
6. Rink pages: "Games at this rink this week" (hidden when empty)

## Known NHL arenas (32 teams)

| Team | City | Arena |
|------|------|-------|
| Vegas Golden Knights | Las Vegas | T-Mobile Arena |
| Carolina Hurricanes | Raleigh | PNC Arena |
| Pittsburgh Penguins | Pittsburgh | PPG Paints Arena |
| ... | | |

Will build a lookup table and match against `rinks.name` (exact) + `rinks.slug`.
