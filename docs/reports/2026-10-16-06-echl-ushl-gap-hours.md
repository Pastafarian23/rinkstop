# Item 6 — ECHL and USHL scheduled_at gap in hours between the two rows

**Question:** For the ECHL and USHL pairs, the gap in hours between the two scheduled_at values (under 1h, 1-6h, 6-24h).

**Read-only query, all ECHL + USHL (home, away, day) groups with > 1 row + different external_ids.**

## ECHL (264 pairs)

| Gap | Count | % |
|---|---|---|
| Same minute (Δ = 0) | 264 | 100% |
| Under 1 hour (Δ < 60min, > 0) | 0 | 0% |
| 1-6 hours | 0 | 0% |
| 6-24 hours | 0 | 0% |

**100% of ECHL pairs have the SAME scheduled_at on both rows.** Not a real doubleheader, not a reschedule — same game, written twice, same date and time.

## USHL (167 pairs)

| Gap | Count | % |
|---|---|---|
| Same minute (Δ = 0) | 167 | 100% |
| Under 1 hour | 0 | 0% |
| 1-6 hours | 0 | 0% |
| 6-24 hours | 0 | 0% |

**100% of USHL pairs have the SAME scheduled_at on both rows.** Same as ECHL.

## What this confirms

Both ECHL and USHL "doubleheaders" are **literal duplicates of the same game**, not real doubleheaders. Two writers wrote the same (home, away, scheduled_at) — and the two writers disagreed on the score. The right fix is "one writer, with a tie-breaker if the same game is written twice." Not "split into two separate games."

## Sample (ECHL)

```
sched_a:  2025-11-12T01:00:00+00:00   sched_b:  2025-11-12T01:00:00+00:00
home:     Idaho Steelheads            away:      Tahoe Knight Monsters
id_a:     <uuid>                       id_b:      <uuid>
kind_a:   hl_match_id                  kind_b:    hl_match_id
score_a:  4-2                          score_b:   3-2
```

(Both ids and full samples in the raw JSON: `/tmp/reports-2026-10-16-raw.json` → `item6.echl.samples` and `item6.ushl.samples`.)

## Per Arnel's read-only rule, no data was changed.
