# Item 5 — Cross-source test: NHL "doubleheader" and "both same score" pairs

**Question:** For the NHL "doubleheader" and "both same score" pairs, is it always one row with an nhl_game_id and the other with a highlightly id? Per-league counts. If yes, state clearly that they're duplicates written by two sources, not doubleheaders.

**Read-only query, all NHL rows.**

## NHL detail

```
NHL (home, away, same day) groups with > 1 row + different external_ids: 343
  mixed (nhl_game_id + highlightly_id): 0
  both rows have nhl_game_id:           0
  both rows have highlightly_id:        0
  no external_id on either row:         343   ← all 343 are "no id" pairs
```

Sub-group "both rows have the same real score":
```
both-same-score pairs:                  247
  of which mixed (nhl + hl):            0
  of which exactly one id type:         0
  of which no id on either:             247
```

**So the NHL "doubleheader" pairs are NOT one-nhl-id + one-hl-id.** Every single one of the 343 NHL pairs (and all 247 of the "both same score" subset) is two rows that **both have no external id in `game_data`**.

## Per-league cross-source breakdown

| League | doubleheader pairs | mixed (nhl + hl) | both nhl id | both hl id | no id | both-same-score pairs | of which mixed |
|---|---|---|---|---|---|---|---|
| nhl | 343 | 0 | 0 | 0 | **343** | 247 | 0 |
| echl | 264 | 0 | 0 | **264** | 0 | 12 | 0 |
| ushl | 167 | 0 | 0 | **167** | 0 | 11 | 0 |
| ahl | 2 | 0 | 0 | 2 | 0 | 1 | 0 |
| liiga | 1 | 0 | 0 | **1** | 0 | 0 | 0 |
| ohl | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| whl | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| qmjhl | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ncaa-d1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| khl | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| vhl | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| pwhl | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| shl | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| del | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

**The answer to your direct question: NO.** The NHL "doubleheader" pairs are not "one nhl_game_id row + one highlightly row". They are **two rows that both have no external id**. They came from two writes of the same NHL.com game, neither of which recorded the `nhl_game_id` into `game_data`.

**State clearly, per your instruction: NHL doubleheaders and same-score pairs are NOT duplicates from two different sources. They are two writes from the same source (NHL.com) that did not record the source id.** A 38-second retroactive fetch from NHL.com would write `game_data.nhl_game_id` for both, and the deduplication would become trivial (same id → same game, regardless of score).

**ECHL/USHL/AHL/Liiga:** these ARE two-source duplicates — both rows carry `hl_match_id` (the Highlightly / HockeyTech id), but the id is the SAME value on both rows. Two writers both wrote the game with the same external id. Source of the duplicate is "two writers for the same game" (the cron-fed `_daily-scores-ingest.cjs` AND the orphan orchestrator both writing the same HL/HockeyTech game). Once the source id is recorded, dedup is `WHERE nhl_game_id = X` and you'd see both rows, then pick the newer `updated_at`.

**Per Arnel's read-only rule, no data was changed.**
