# NHL Historical Database — Verified State

**Date Verified:** 2026-06-08
**By:** Jarvis (KiloClaw)
**Source:** Supabase /fixtures table, league_id = `2b5f2b9d-84b9-4edb-8373-a732b72f4e40`

## Counts (Final, Verified)

| Metric | Count |
|--------|-------|
| Total NHL fixtures | **3036** |
| With both team_ids | 3036 (100%) |
| With both scores | 3036 (100%) |
| Status = completed | 3028 |
| Status = scheduled | 4 (all future) |
| Past games with 0-0 scores | **0** |
| Date range | 2024-09-21 → 2026-06-18 |

## Future Scheduled Games (4 total — exact match to Stanley Cup Final G4-7)

| Date | Series | Status |
|------|--------|--------|
| 2026-06-10 | Cup Final Game 4 | Scheduled |
| 2026-06-12 | Cup Final Game 5 | Scheduled |
| 2026-06-15 | Cup Final Game 6 | Scheduled |
| 2026-06-18 | Cup Final Game 7 | Scheduled |

## Coverage

- **2024-25 Preseason**: 2024-09-21 onwards ✅
- **2024-25 Regular Season**: All 1312 games ✅
- **2024-25 Playoffs**: All 86+ games (CAR-NJD, FLA-TBL, MTL-WSH, EDM-LAK, VGK-EDM, WPG-STL, plus conference finals and SCF) ✅
- **2025-26 Preseason**: ✅
- **2025-26 Regular Season**: Through 2026-06-08 ✅
- **2025-26 Playoffs + Cup Final**: Games 1-3 completed, G4-7 scheduled ✅

## Backup

- **File:** `rinkstop-platform/backups/nhl-fixtures-2024-2026-snapshot.json`
- **Size:** 1.89 MB
- **MD5:** `8c41edf6b4d8de4264cab76c816d4791`
- **Format:** JSON, schema follows Supabase /fixtures row structure
- **Restoration:** Import via Supabase dashboard or `INSERT INTO fixtures SELECT * FROM jsonb_populate_recordset(NULL::fixtures, $json);`

## Data Sources Used

1. **Highlightly API** (`nhl.highlightly.net`) — primary, with browser User-Agent header
2. **NHL.com /v1/score/{date}** — backup for current/recent games
3. **NHL.com /v1/schedule/{date}** — for full-week historical playoff series (returns all games in week, unlike /v1/score which returns only the most recent ongoing series)
4. **NHL.com /v1/playoff-bracket/{season}** — for playoff series results

## Scripts Used to Build

- `scripts/backfill-via-highlightly.js` — 383 games
- `scripts/backfill-nhl-highlightly.js` — 1029 games (2024-25) + 98 games (2025-26)
- `scripts/backfill-nhl-nhlecom.js` — 390 games (NHL.com cross-validation)
- `scripts/backfill-nhl-playoffs-week.js` — 13 games (used NHL.com /v1/schedule for playoff series Highlightly had as "Scheduled")
- `scripts/clean-broken-fixtures.js` — 335 phantom rows deleted
- `scripts/dedup-fixtures.js` — 562 NHL duplicate rows deleted
- `scripts/finalize-nhl-backfill.js` — 11 NHL.com final games
- `scripts/restore-nhl-scores.js` — 270 games restored from bad backfill
- `scripts/fix-zero-scores.js` — 19 phantom playoff games deleted, 1 fixed
- `scripts/fix-zero-scores-reinsert.js` — 19 deleted games re-inserted with real data

## Critical Bugs Caught and Fixed

1. **Cloudflare Error 1010 on Highlightly** — scripts were failing silently. Fixed by adding real browser User-Agent header.
2. **Unicode ellipsis in Supabase key** — `***` broke HTTP encoding. Replaced with full key.
3. **Highlightly 0-0 score parser bug** — `state.score.current = "0 - 0"` was parsed as integer 0,0 instead of null. Created 20 phantom "scheduled" games.
4. **NHL.com timezone quirk** — 8pm ET games stored as 00:00 UTC next day.
5. **NHL.com /v1/score returns only current series** — full-week schedule needs /v1/schedule endpoint.
6. **Stanley Cup Final wrong team assignments** — VGK@COL fixed to VGK@CAR.

## Verification Queries

To re-verify this state, run:
```sql
-- In Supabase SQL editor:
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE home_team_id IS NOT NULL AND away_team_id IS NOT NULL) as with_teams,
  COUNT(*) FILTER (WHERE home_score IS NOT NULL AND away_score IS NOT NULL) as with_scores,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'scheduled' AND scheduled_at > NOW()) as future_scheduled,
  COUNT(*) FILTER (WHERE status = 'scheduled' AND scheduled_at < NOW()) as past_scheduled,
  COUNT(*) FILTER (WHERE home_score = 0 AND away_score = 0 AND status = 'scheduled' AND scheduled_at < NOW()) as bad_zero_scores
FROM fixtures
WHERE league_id = '2b5f2b9d-84b9-4edb-8373-a732b72f4e40';
```

Expected: `3036 | 3036 | 3036 | 3028 | 4 | 0 | 0`
