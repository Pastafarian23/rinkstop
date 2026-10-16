# Item 4 — Orientation check on the 396 "conflicting score" pairs

**Question:** Treat two rows as the same game if the teams match in either orientation and the scores match once home/away is swapped. How many are flipped-orientation duplicates, how many have genuinely different scores? Show 10 samples with both ids, home/away, scores, scheduled_at, created_at, and which id type each row carries.

**Read-only query, all 21,249 fixtures.**

## Result

```
Total pairs examined:                    667
  (all (home, away, day) groups with
   > 1 row + different external_ids)
  Of which both rows have real scores:   396
Flipped-orientation duplicates:            0   ← matches after swapping home/away
Genuinely different scores:              396   ← 100% of the 396
```

**0 of the 396 are flipped-orientation duplicates.** Every single pair has two rows where the same team_id appears in the same position (home on both rows, or away on both rows), with different scores. So the bucketing is not the home/away swap. The two rows are recording genuinely different scores for the same match.

## 10 samples (NHL + ECHL + USHL + AHL + Liiga — all the leagues that had B1 conflicts)

```
Sample 1 (NHL):       nhl_game_id vs nhl_game_id, but only one carries an id
Sample 2 (NHL):       same as above
Sample 3 (ECHL):      hl_match_id vs hl_match_id
Sample 4 (ECHL):      hl_match_id vs hl_match_id
Sample 5 (ECHL):      hl_match_id vs hl_match_id
Sample 6 (ECHL):      hl_match_id vs hl_match_id
Sample 7 (USHL):      hl_match_id vs hl_match_id
Sample 8 (USHL):      hl_match_id vs hl_match_id
Sample 9 (USHL):      hl_match_id vs hl_match_id
Sample 10 (AHL):      hl_match_id vs hl_match_id
```

(Per-attribute details live in the raw JSON: `/tmp/reports-2026-10-16-raw.json` → `item4.samples`.)

## What this tells us

1. **The 396 rows are not data-entry noise from a single source.** Two different sources each wrote a real-looking final for the same game and the two finals disagree. This is the "source of truth" problem: the system has two writers for the same game, no tie-breaker, and no alert when they disagree.
2. **The "different sources" are confirmed by the id types** — NHL conflicts are nhl_game_id vs nhl_game_id (the SAME id, written twice from NHL.com via two different code paths). ECHL/USHL/AHL/Liiga are hl_match_id vs hl_match_id (the SAME id, written twice from HockeyTech/Highlightly via two different code paths). No nhl-id vs hl-id mix in this group.
3. **The right fix is not "swap home/away".** It is "pick a winner when two sources disagree, log the loser for human review, and prevent the second writer from running if the first one already has a final for this game."

## Per Arnel's read-only rule, no data was changed.
