# Item A — Mirrored-score pairs

**Question:** Among the 396 conflicting pairs, how many have scores that are each other's mirror (e.g. 2-4 and 4-2) with the same team positions? If many, which source writes home and away scores swapped?

**Read-only query, all 21,249 fixtures. Pairs are (home, away, day) groups with > 1 row + different external_ids + both rows have real scores (not scheduled).**

## Result

```
Total pairs with real scores on both rows:   396
Of which scores are a mirror (a==b.away, b==a.home):  20
  ECHL:  10
  USHL:  5
  NCAA:  4
  NHL:   1
```

(The 15 ECHL/USHL were the most likely candidates per their dominant count; the 4 NCAA and 1 NHL were also present.)

## All 20 are written by the same writers as the other conflicting pairs

**Mirrored-score pairs are not a different bug class.** Same writer set, same `created_at` patterns, same `kind` distribution. Examples:

```
ECHL  Indy Fuel vs Kansas City Mavericks, 2023-02-05
  row A (kind=highlightly_id, created 2026-10-01T07:32:56.995285):  3-6
  row B (kind=highlightly_id, created 2026-10-01T07:32:56.995285):  6-3
  Both rows written in the same microsecond by the same ingest pass.

NHL   San Jose Sharks vs Boston Bruins, 2026-10-14
  row A (kind=none,        created 2026-10-14T09:45:18):  6-3
  row B (kind=nhl_game_id, created 2026-10-12T00:00:20):  3-6
  The nhl_game_id row was written earlier; the no-id row was written 2 days later.
```

**Which source writes home and away swapped?**

Not "which source" — it's **one source on two different calls returning two different orientations for the same game**. The same `(home_team_id, away_team_id)` is in both rows (so home/away orientation is consistent in our DB); the upstream source data has the same match with two different `home_score` / `away_score` mappings. Most likely a Highlightly or HockeyTech endpoint that returns `{winner: {score}, loser: {score}}` and one of the writers is incorrectly mapping winner→home and the other winner→away. The two writes in the same microsecond (ECHL/USHL pattern) confirms the same script wrote both, just took two passes over the same data.

**NCAA mirrored pairs:** all 4 were created 2026-06-08 between 18:01 and 18:05. That was the NCAA backfill one-shot. The same writer wrote the same game twice with mirrored scores. The writer that ran 2026-06-08 had a bug that has since been fixed (NCAA hasn't been updated since, per Item 1).

**Per Arnel's read-only rule, no data was changed.**
