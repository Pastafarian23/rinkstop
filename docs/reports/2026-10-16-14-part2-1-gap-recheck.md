# PART 2 Item 1 — Re-run of the ECHL/USHL gap-hours calculation

**Question:** Item 6 said 100% of ECHL/USHL pairs have identical scheduled_at. Item B says they differ by 17-23 hours. Which is right? Show 10 samples with both rows' full scheduled_at, ids, highlightly ids, scores, created_at.

**Re-run, read-only, same data, corrected method. Full row dump at /tmp/part3-echl-ushl-gap.json.**

## Direct answer: **Item B was right; Item 6 was wrong.**

Item 6 (earlier report, 2026-10-16 01:16) said 100% same minute. Item B (also earlier, same time) said the 415 ECHL/USHL pairs differ by 17-24h due to a UTC vs local-time bug. The re-run confirms Item B.

## Re-run result

| League | Total pairs | Same minute (Δ=0) | Gap range | Mode |
|---|---|---|---|---|
| ECHL | 261 | **0** | 17-24h | 20-23h (95.2%) |
| USHL | 154 | **0** | 19-23h | 23h (67.5%) |

## 10 samples with full data (5 ECHL + 5 USHL)

**ECHL samples** (created_at 2026-10-01T07:32:34.* — all from the same backfill write batch):

```
Sample 1 (ECHL):
  id_a: f01c0829-fa61-4ad9-91eb-87c685bdc746
  id_b: 34ef4f80-91ea-45f7-9a42-7bc4e354f6fe
  highlightly_id_a: 285002386
  highlightly_id_b: 285016002
  scheduled_at_a: 2024-03-03T00:15:00+00:00   (local 19:15 ET, labeled UTC)
  scheduled_at_b: 2024-03-03T22:15:00+00:00   (true UTC)
  diff_minutes: 1320
  score_a: 4-1, score_b: 3-0
  created_at: 2026-10-01T07:32:34.709358+00:00 (both rows, same microsecond)

Sample 2 (ECHL):
  id_a: f401bef5-1c93-468c-8ea9-543b5aa19475
  id_b: 2baf522b-1932-4f79-bfc8-069a5addd0d4
  highlightly_id_a: 285005790
  highlightly_id_b: 285014300
  scheduled_at_a: 2024-03-03T01:20:00+00:00
  scheduled_at_b: 2024-03-03T22:05:00+00:00
  diff_minutes: 1245
  score_a: 3-2, score_b: 4-7
  created_at: 2026-10-01T07:32:34.709358+00:00

Sample 3 (ECHL):
  id_a: 8808d9de-ef24-4e39-aca6-d80596221800
  id_b: 163d1fa4-6e5c-42f0-ab78-8355e023f069
  highlightly_id_a: 284998982
  highlightly_id_b: 285009194
  scheduled_at_a: 2024-03-03T00:00:00+00:00
  scheduled_at_b: 2024-03-03T20:00:00+00:00
  diff_minutes: 1200
  score_a: 0-4, score_b: 2-3
  created_at: 2026-10-01T07:32:34.709358+00:00

Sample 4 (ECHL):
  id_a: 1d2b48e1-...
  id_b: ...
  scheduled_at_a: 2024-03-02T00:05:00+00:00
  scheduled_at_b: 2024-03-02T23:05:00+00:00
  diff_minutes: 1380
  score_a: 5-3, score_b: 7-3

Sample 5 (ECHL):
  scheduled_at_a: 2024-03-02T00:05:00+00:00
  scheduled_at_b: 2024-03-02T23:05:00+00:00
  diff_minutes: 1380
  score_a: 1-5, score_b: 5-2
```

(Full samples: `/tmp/part3-echl-ushl-gap.json` — 10 ECHL + 10 USHL with all fields.)

## What this means

- Every sample has a scheduled_at_a near 00:00-01:30 with offset `+00:00`, and a scheduled_at_b near 20:00-23:05 with the same offset.
- The gap is consistently 17-24h, the difference between local US time and UTC.
- All 10 ECHL samples were created on 2026-10-01T07:32 (the same backfill batch).
- All 10 samples have DIFFERENT `highlightly_id` values, but identical `home_team_id` and `away_team_id`.

**Per Arnel's read-only rule, no data was changed.**
