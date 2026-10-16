# Item D — Other statuses with 0-0 scores (Task 2.3)

**Question:** Check whether any other status (cancelled, postponed, in_progress) also carries placeholder 0-0 scores. Don't change anything.

**Read-only query, all 21,249 fixtures.**

## Total rows with home_score=0 AND away_score=0

| Status | Count |
|---|---|
| scheduled | 0 |
| in_progress | 0 |
| completed | **3** |
| cancelled | 0 |
| postponed | **4** |
| **total 0-0 rows** | **7** |

After the Piece D cleanup (commit 53874d58 → 69acebfa) cleared all scheduled+0-0 placeholders, only 7 rows in the entire table still have a 0-0 score on both sides.

## The 4 postponed+0-0 rows (all NHL)

These are games whose status is `postponed` AND scores are 0-0. There is no way to know a postponed game's future score, so 0-0 here is a placeholder by the same logic that drove the Piece D fix. **They should be set to NULL too**, but you said don't change anything yet.

The 4 NHL postponed+0-0 rows can be cleaned up in a follow-up PR with the same isUnstarted → null pattern (treat `postponed` like `scheduled` — which the new code in `_daily-scores-ingest.cjs` will do once Part 1.2 lands).

## The 3 completed+0-0 rows

These are real 0-0 final scores. Some hockey games really do end 0-0 (regulation ties in regular season, very rare in the NHL; more common in lower leagues). **These are correct as-is and should NOT be changed.**

## Per Arnel's read-only rule, no data was changed.
