## Root Cause (original)

`sync-nhl-live.js` is the ONLY script that writes bad fixture data. Lines 93-94 hardcode `home_team_id: null, away_team_id: null` on every insert — the team data sits in `game_data.home_team.abbrev` but never gets promoted to the actual column. Result: 1305 broken NHL fixtures over time.

## Root Cause (systemic, 2026-06-08)

The recurring bug is that `teams.league_id` is being assigned wrong values. e.g.:
- Newfoundland Regiment → "Asia League Ice Hockey" (should be QMJHL)
- Stonehill → "Friendly International" (should be NCAAH)
- AHL/KHL teams → "Friendly International" or "Asia League Ice Hockey"
- NHL teams → "Asia League Ice Hockey" or null
- 21+ teams across all leagues affected

This causes silent data corruption: a fixture is inserted with the right team_id but the team's league_id is wrong. Downstream queries that filter by league_id return wrong results.

**The 5 Defenses (so this never happens again)**

### 1. Fix the sync script (source fix)
- `scripts/sync-nhl-live.js` lines 93-94: replace `null` with abbrev→team_id lookup
- Use the same 32-team hardcoded map from `backfill-null-team-ids.js`
- Before each insert: log `[FAIL]` and skip if abbrev not in map (don't pollute DB with unknown teams)
- Add `--strict` flag that aborts the whole run if any fixture would have NULL team_ids

### 2. Database constraint - NULL team_ids (safety net)
- Postgres trigger that REJECTS inserts/updates with `league_id` in (NHL, AHL, PWHL, KHL) AND NULL team_ids
- Trigger also enforces: `status='completed' AND home_score IS NULL` is invalid
- Migration: `supabase/migrations/2026-06-08_fixtures_integrity.sql`
- The trigger logs violations to a `fixtures_audit` table for forensics

### 3. Database constraint - team league_id matches fixture league_id (NEW 2026-06-08)
- Migration: `supabase/migrations/2026-06-08_fixtures_team_league_match.sql`
- Trigger `fixtures_check_team_league_match_trigger` REJECTS any fixture insert/update where `teams.league_id` doesn't match `fixtures.league_id`
- Tested working: blocked wrong-league insert with clear error message
- This is the HARD constraint that prevents silent corruption

### 4. Pre-sync validation (early warning)
- `scripts/validate-sync-output.js` — runs BEFORE every sync, checks fixtures table for:
  - NULL team_ids in major leagues
  - Phantom scores (1-0, 0-0 in non-recent games)
  - Duplicates (same nhl_game_id twice)
  - Scheduled games older than 30 days with NULL scores
- Exit code 1 if any issues found, blocking the sync
- Cron job: runs hourly, alerts Telegram RinkStop Ops channel if anything broken

### 5. Team league_id audit (NEW 2026-06-08)
- `scripts/audit-teams-league-ids.js` — fetches current team list from Highlightly for each tracked league and compares to our `teams.league_id` assignments
- Finds teams assigned to wrong league (e.g., Henderson Silver Knights in "Friendly International" but should be in AHL)
- `--fix` mode updates `teams.league_id` to match Highlightly's source-of-truth
- Run weekly via cron to catch any new mismatches
- Found and fixed 25+ wrong assignments on first run (2026-06-08)

## What I Need From You

Just a thumbs up. I'll execute the 4 defenses in order, push commits as I go, and report back when each is done.
