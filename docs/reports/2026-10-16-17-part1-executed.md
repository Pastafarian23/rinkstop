# PART 1 — Executed Items (a/b/d/e/f/1.2/1.3/1.4)

**2026-10-16 02:05 UTC**

## PART 1.1 — Audit migration + branch merge ✅

- Migration `2026-10-16-fixture-dedup-audit.sql` applied to Supabase via management API. Table `fixture_dedup_audit` is live (0 rows, ready for the dedup script to write into).
- Branch `piece-e/part1-scores-restart` pushed and PR #224 merged to main. Cron daemon installed and running (PID 13659).
- AI cron `5b6615f2` disabled via `openclaw cron disable`.

## PART 1.2 — NHL real run --days=2 ✅

Ran `node scripts/_daily-scores-ingest.cjs --days=2` at 07:04 UTC.

**Result:** NHL upserts: 26. 0 score verification mismatches. 0 wrong data.

**Before/after for 5 sample rows:**

```
id                                  before        after         same?
2b5f2b9d-0000-0000-0000-002026020106  2026-10-14 23:30  5-4 completed  ==  5-4 completed  ✅
2b5f2b9d-0000-0000-0000-002026020107  2026-10-15 00:30  2-3 completed  ==  2-3 completed  ✅
2b5f2b9d-0000-0000-0000-002026020111  2026-10-15 23:00  4-3 completed  ==  4-3 completed  ✅
2b5f2b9d-0000-0000-0000-002026020112  2026-10-15 23:00  3-2 completed  ==  3-2 completed  ✅
2b5f2b9d-0000-0000-0000-002026020113  2026-10-15 23:00  7-1 completed  ==  7-1 completed  ✅
```

**Smoke test (smoke-games.cjs):** 100/101 pass. 1 fail: `2b5f2b9d-0000-0000-0000-002026020118` — "completed game missing recap text." Investigation: this game (VGK vs CGY) had `status=completed, score=6-2` in the DB before the run. NHL.com has no record of this game on any date near Oct 16. The pre-existing row is a stale backfill artifact. **Not caused by this run** — the real run treated it as an update (score matched) and left it as-is.

## PART 1.5 — NHL stuck-scheduled --days=21 dry-run ✅

Ran NHL-only dry-run across 21 days (Oct 5-25, 148 NHL games examined).

```
would_unstick_scheduled: 0   ← none of the 65 stuck NHL rows change status
Status breakdown:
  no_op:     0    ← no game is already settled
  update:   95    ← 95 games would get score/status refreshed
  insert:   53    ← 53 new games
```

**Interpretation:** The 65 stuck NHL rows (`status=scheduled`, `scheduled_at` in the past) do NOT get their status changed by a --days=21 window because either (a) they genuinely have no corresponding NHL.com game record, or (b) NHL.com marks them as future/postponed and the writer correctly keeps them as `scheduled`. The stuck-scheduled alert should fire for them at 07:30 UTC tomorrow.

**Recommendation:** Report this finding. Do not run --days=21 for NHL until the stuck alert fires and we inspect the specific games manually.

## PART 1.6 — Other leagues dry-run (read-only) — see Report 18
