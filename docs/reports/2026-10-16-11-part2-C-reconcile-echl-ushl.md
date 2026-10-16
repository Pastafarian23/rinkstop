# Item C — Reconcile: Item 5 said 0 ECHL rows share an external id, but ECHL pairs "carry the same hl_match_id". Which is right?

**Direct answer: I was wrong in the prose of Item 5.** The "0" was right; the explanation was wrong. Here is the recount.

## What Item 5 said (the wrong part)

> ECHL/USHL/AHL/Liiga: these ARE two-source duplicates — both rows carry `hl_match_id` (the Highlightly / HockeyTech id), but the id is the SAME value on both rows.

## What the data actually shows (the recount)

I queried every ECHL and USHL pair and counted, by source id key, whether both rows have the key AND whether the values are identical across the pair.

| League | Total pairs | Both rows have `hl_match_id` | Both rows have SAME `hl_match_id` value | Both rows have `highlightly_id` | Both rows have SAME `highlightly_id` value | Mixed (one hl_match_id + one highlightly_id) |
|---|---|---|---|---|---|---|
| ECHL | 261 | **0** | 0 | **261** | **0** | 0 |
| USHL | 154 | **0** | 0 | **154** | **0** | 0 |

**Recount, in plain words:**

- **ECHL pairs (261):** both rows have `game_data.highlightly_id` set. **The two values are different on every single pair.** So the ECHL "duplicates" are two rows that each carry a different Highlightly match id, recording the same (home, away, day-window) game. This is "two writers" or "one writer using two different Highlightly endpoints" — the source data had two different ids for the same game.
- **USHL pairs (154):** same pattern. Both rows have `highlightly_id`, but the values are different. Not the same id; different ids, same game.
- **None** of the ECHL/USHL pairs use `hl_match_id`. That key is from a different writer path (the cron-fed `_daily-scores-ingest.cjs`). The ECHL/USHL pairs are written by the orchestrator (`_daily-scores-all-leagues.cjs`) or by other Highlightly paths, which use `highlightly_id` not `hl_match_id`.

**So the ECHL/USHL story is more like: "two writers each asked Highlightly for the same game and got back two different `highlightly_id` values, then wrote one row each."** Not "same id written twice."

## Why two Highlightly ids for the same game

The most likely cause is **two different Highlightly league endpoints** returning the same game under different league ids. ECHL on Highlightly has at least two endpoints visible in `_daily-scores-all-leagues.cjs`:
- `HL_LEAGUE_IDS` for ECHL — but I don't see ECHL in that map. Let me re-check the source: only AHL/OHL/WHL/SHL/DEL/KHL/MHL/VHL/SPHL/Liiga are mapped. ECHL is reached via HockeyTech.
- The orchestrator's lookup-by-name path could resolve ECHL games via a different Highlightly league id than a second writer does.

Without running the Highlightly API for a known ECHL game and comparing the two endpoints, I cannot prove which is which. The recount is the safest answer: **the two rows are real duplicates (same teams, same scores' meaning, different ids) — the bug is in id resolution, not in score parsing.**

## What this means for the cleanup

- The 396 conflicting-score pairs cannot be deduped by "same external id → keep one." Both rows have different external ids, and BOTH ids are real Highlightly ids for the game.
- The right dedup is by **(home_team_id, away_team_id, scheduled_at-window-in-UTC)** AFTER fixing the timezone bug (Item B). The current second-precision unique constraint is correct but the writers are violating it via the timezone offset.
- Once the timezone fix lands, the unique constraint will start rejecting the second write, and the dedup script's grouping will start matching.

**Per Arnel's read-only rule, no data was changed.**
