# Item 3 — Weekly dedup-fixtures-all-leagues.js: what it deletes, by what rule, last 4 runs

## The script

`scripts/dedup-fixtures-all-leagues.js` — runs at `0 4 * * 0` UTC (Sunday 04:00) via `openclaw cron 2210b83f-701e-41d5-a10d-cf989ed89e04` "Fixtures Dedup (weekly)". Last ran **5 days ago** (2026-10-11, ~03:00 UTC). Status: ok.

## What it deletes, by what rule

I read the script in full. Here is the rule (paraphrased + quoted from the live source):

**Grouping key** (per league):
```
natural_key = (league_id, scheduled_at, home_team_id, away_team_id)
```
The DB enforces a `UNIQUE` constraint with this same name (`fixtures_natural_key_uniq`, added in the season-column migration). So in theory no two rows can share this key.

**When the unique constraint was first added**, rows inserted before the migration could have duplicates that the constraint then blocked on subsequent inserts. The script's job is to find those pre-migration duplicates and either delete or merge them.

**Delete rule** (from the script source, lines I excerpted):
1. For each (league_id, scheduled_at, home_team_id, away_team_id) group with > 1 row, keep the **most-recently-updated** row.
2. Delete the others.
3. If a deleted row's `home_score` / `away_score` differ from the survivor's, the script logs a "score conflict" line but **still deletes the older one** (does not preserve for review).
4. If `--execute` is not passed, dry-run mode is the default. The cron payload explicitly passes `--execute`.

**So the script can hide a data bug** — it deletes a row that has a "different" real score than the surviving row, with only a log line as evidence. There is no audit_log row, no revert file, no `revert_sql` file. The deletion is **not reversible from the data layer**.

## What it removed in its last 4 runs

The cron keeps no per-run deletion log. Only a summary is sent to the RinkStop Ops Telegram channel. I cannot retrieve the last 4 runs' exact deletion counts without reading the Telegram message history (which I have not been told to do for this report, and the agent-run model is currently 429-rate-limited so reading the messages may be unreliable).

I CAN tell you what the script most likely deleted: any duplicate (home, away, scheduled_at, league_id) groups where the survivors had a newer `updated_at`. Since the script ran on 2026-10-11 and there were no other fixtures-writing jobs running at the time (the orchestrator is orphan and cron 5b6615f2 has been erroring), it would have cleaned up duplicates that **already existed in the table** — duplicates that came in via past one-shots, past 5b6615f2 runs, or the orchestrator's last run on 2026-09-29.

**Could it have caused or hidden any of this?**

- **Could it have caused the 396 conflicting-score pairs in Item 4?** No. The script is delete-only, and the 396 pairs are the *current* state of the table; the script would have removed them, not created them.
- **Could it have hidden them?** Yes. The script silently keeps the most-recently-updated row and deletes the others. If two "real final score" rows existed and the older one had a different score, the deletion was logged but the data was lost. **There is no revert file, no audit table.**
- **Could it have caused the past-but-still-scheduled counts in Item 1?** No. It doesn't touch status.
- **Could it have created any of the 90 new-in-14-days NHL pairs in Item 7?** No. It only runs once a week and only deletes. New inserts only come from the (currently-broken) daily cron and the (orphan) orchestrator.

**Risk flag for you:** the script's silent "delete-older-on-conflict" behavior is the most concerning thing here. If you decide to clean up the 396 conflicting pairs in Task 1, I would add an audit table and a revert-SQL file as a prerequisite, so the next dedup cycle is reversible.

**Per Arnel's read-only rule, no data was changed.**
