# Item B — Unique constraint on fixtures, and why ECHL/USHL duplicates exist

**Question:** Show me the actual unique indexes and constraints on fixtures. The ingest uses `onConflict` on `(league_id, scheduled_at, home_team_id, away_team_id)`, so how can 264 ECHL and 167 USHL pairs with identical values exist? And why didn't the weekly dedup delete them?

## The unique constraint

**Source: `supabase/migrations/2026-06-10_fixtures_natural_key_uniq.sql`** (shipped 2026-06-10):

```sql
ALTER TABLE public.fixtures
  ADD CONSTRAINT fixtures_natural_key_uniq
  UNIQUE (league_id, scheduled_at, home_team_id, away_team_id);
```

There is also a single functional index on `game_data->>'nhl_game_id'` (`scripts/nhl-ingest/migrations/002_add_indexes.sql`), but that is not a unique constraint. No other unique constraints on `fixtures`.

The migration's own comment:
> Note: NULL team_ids are NOT covered by this constraint (NULL doesn't violate UNIQUE in SQL).

## Why the 261 ECHL + 154 USHL pairs coexist with the unique constraint

I queried every (home, away, day) pair in ECHL/USHL with real scores + different external_ids and checked whether each pair's two rows actually share the FULL natural key (all four values identical at sub-second precision).

**Result:**

| League | Total pairs | Identical natural key (subsec) | At least one NULL team_id | team_ids differ | schedule_at differs (subsec) |
|---|---|---|---|---|---|
| ECHL | 261 | **0** | 0 | 0 | **261 (100%)** |
| USHL | 154 | **0** | 0 | 0 | **154 (100%)** |

**None of the pairs share the full natural key.** In every single ECHL/USHL pair, the two rows have IDENTICAL `league_id`, IDENTICAL `home_team_id`, and IDENTICAL `away_team_id`, but DIFFERENT `scheduled_at` at the sub-second level.

### The schedule_at gap is a timezone bug

Gap distribution:

**ECHL** (261 pairs):
```
23h: 81,  22h: 50,  21h: 33,  20h: 25,
19h: 18,  18h: 14,  23.5h: 7,  21.5h: 7,
17h: 3,  19.5h: 4,  + smaller buckets
```

**USHL** (154 pairs):
```
23h: 104, 21h: 13,  20h: 20,  22h: 10,
20.5h: 1, 22.9h: 1, 19.9h: 2, 19h: 1, 20.8h: 2
```

**The 22h / 23h / 20h / 21h gaps are exactly the offset between US-local and UTC (varies by DST, by region, and by writer).** One writer stored the game's local time as `+00:00` (claiming it was UTC when it wasn't); the other stored it as actual UTC. So:

- Game at 7:00 PM Eastern on 2026-04-04 = 23:00 UTC
- One writer stored `2026-04-04T23:00:00+00:00` (correct UTC)
- The other stored `2026-04-04T00:00:00+00:00` (midnight UTC, the local time as if it were UTC)

The unique constraint `(league_id, scheduled_at, home_team_id, away_team_id)` is fine — these are genuinely different values at the second level. The constraint correctly lets both rows in.

**Sample (ECHL):**
```
sched_a:  2026-04-04T23:05:00+00:00   (UTC, correct)
sched_b:  2026-04-04T00:05:00+00:00   (local time labeled as UTC — wrong)
home:     23c6e58a-...                (same on both rows)
away:     82137c0d-...                (same on both rows)
```

**Sample (USHL):**
```
sched_a:  2026-09-26T23:05:00+00:00
sched_b:  2026-09-26T00:05:00+00:00
```

## Why the weekly dedup didn't delete them

The dedup script groups by `(league_id, scheduled_at, home_team_id, away_team_id)`. Because the two rows in each ECHL/USHL pair have **different `scheduled_at` at the second level**, the dedup script never sees them as a duplicate group — it sees them as two separate games. The script's grouping key matches the unique constraint's key, so the dedup behavior is consistent with the constraint.

**The dedup script does not normalize `scheduled_at` to UTC before grouping.** That's the bug. Adding a normalization step (`new Date(scheduled_at).toISOString()` before comparing) would let the dedup catch the timezone-pair duplicates. But that's a behavior change, and you've asked for no behavior changes without approval.

## Fix paths (not built)

1. **Add a pre-upsert step in both writers** that normalizes `scheduled_at` to canonical UTC. The current writer in `scripts/_daily-scores-ingest.cjs` and `scripts/_daily-scores-all-leagues.cjs` would each need: `scheduled_at: new Date(g.startTimeUTC || g.date).toISOString()`. Effort: 30 min, 1 PR. Risk: low.
2. **Add a partial unique index** on `(league_id, lower(scheduled_at_iso_normalized), home_team_id, away_team_id)` if you can normalize at write time. Supabase Postgres supports expression indexes; this is straightforward. Effort: 1 PR. Risk: requires backfilling old rows to normalized form first.
3. **Tighten the dedup script's grouping key** to `(league_id, date_trunc('minute', scheduled_at AT TIME ZONE 'UTC'), home_team_id, away_team_id)`. This is a behavior change but a small one. Effort: 1 PR. Risk: low. **Per Arnel's read-only rule, no behavior change yet.**

**Per Arnel's read-only rule, no data was changed.**
