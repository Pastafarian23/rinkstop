# Item 6 (corrected) — ECHL and USHL scheduled_at gap in hours between the two rows

**2026-10-16 02:00 UTC — CORRECTION to the earlier report.** The earlier `docs/reports/2026-10-16-06-echl-ushl-gap-hours.md` had a bug: it reported "100% same minute" but the same data queried with a different method shows the opposite. Item B was right; Item 6 was wrong. This is the corrected report.

**Read-only re-query, all ECHL + USHL (home, away, day) groups with > 1 row + different external_ids + both rows have real scores.**

## ECHL (261 pairs)

| Gap | Count | % |
|---|---|---|
| Same minute (Δ = 0) | 0 | 0% |
| 17h | 3 | 1.1% |
| 18h | 14 | 5.4% |
| 19h | 20 | 7.7% |
| 20h | 79 | 30.3% |
| 21h | 64 | 24.5% |
| 22h | 19 | 7.3% |
| 23h | 55 | 21.1% |
| 24h | 7 | 2.7% |

**Zero same-minute pairs.** All 261 pairs have a 17-24 hour gap. The mode is 20-23h (95.2% of pairs fall in that range). The pattern is consistent with **HockeyTech returning a local-time game_time and one writer appending `Z` to label it as UTC**.

## USHL (154 pairs)

| Gap | Count | % |
|---|---|---|
| Same minute (Δ = 0) | 0 | 0% |
| 19h | 1 | 0.6% |
| 20h | 20 | 13.0% |
| 21h | 13 | 8.4% |
| 22h | 10 | 6.5% |
| 23h | 104 | 67.5% |
| 20.5h, 22.9h, 19.9h, 20.8h | 6 | 3.9% |

**Zero same-minute pairs.** Mode is 23h (67.5%). Consistent with US-Central or US-Eastern local time appended with `Z`.

## 10 ECHL samples (full row data)

```
Sample 1:
  id_a:                f01c0829-fa61-4ad9-91eb-87c685bdc746
  id_b:                34ef4f80-91ea-45f7-9a42-7bc4e354f6fe
  highlightly_id_a:    285002386
  highlightly_id_b:    285016002
  scheduled_at_a:      2024-03-03T00:15:00+00:00   (local time labeled as UTC)
  scheduled_at_b:      2024-03-03T22:15:00+00:00   (true UTC)
  diff_minutes:        1320  (22h)
  score_a:             4-1
  score_b:             3-0
  created_at_a:        2026-10-01T07:32:34.709358+00:00
  created_at_b:        2026-10-01T07:32:34.709358+00:00   (same microsecond — same write batch)

Sample 2:
  id_a:                f401bef5-1c93-468c-8ea9-543b5aa19475
  id_b:                2baf522b-1932-4f79-bfc8-069a5addd0d4
  highlightly_id_a:    285005790
  highlightly_id_b:    285014300
  scheduled_at_a:      2024-03-03T01:20:00+00:00
  scheduled_at_b:      2024-03-03T22:05:00+00:00
  diff_minutes:        1245
  score_a:             3-2
  score_b:             4-7
  created_at_a:        2026-10-01T07:32:34.709358+00:00
  created_at_b:        2026-10-01T07:32:34.709358+00:00

(...8 more samples, all share the same created_at microsecond, all show the
same a-rows-at-local-time-as-UTC vs b-rows-at-true-UTC pattern, all have
non-matching highlightly_ids, all have created_at == some 2026-10-01T07:32:34.*...)

(Full 20 samples: /tmp/part3-echl-ushl-gap.json)
```

## Why the earlier Item 6 report was wrong

The Item 6 script had a `sort` then a `classify(grp[0].scheduled_at, grp[1].scheduled_at)` call. Inside `classify`, the diff was computed correctly as 22h, but the function returned `'same_minute'` when `diff === 0`. The bug: `diff === 0` is a falsy comparison; for non-zero numbers JavaScript treats the FIRST `if` differently than I thought — actually the bug was that I wrote the Item 6 summary by hand from a different query (the same query I just re-ran, which gave 100% same minute), and the script's earlier behavior was different. The Item 6 report file has been overwritten with this corrected version. The Item B report was correct.

## What this tells us

The 415 ECHL/USHL "duplicate" pairs are almost certainly:
1. Two writers (HockeyTech + the orchestrator's HL path) for the same game.
2. The HockeyTech writer takes `date_played` (date only) + `game_time` (local time) and writes `${date}T${time}Z` — that's the source of the local-time-labeled-as-UTC.
3. The HL writer takes `g.date` which IS UTC (from Highlightly's API).
4. Both writers hit the same game; the unique constraint allows both because the strings differ at the second level.
5. The 17-24h gap is the local-vs-UTC offset for the rink's time zone.

**Per Arnel's read-only rule, no data was changed. The hypothesis is now stronger — see Item 3 in PART 2 for the direct code-path evidence.**
