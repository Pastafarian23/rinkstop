# Item E — Stuck in_progress > 24h

**Question:** Any fixtures stuck in `in_progress` for over 24h?

**Read-only query, all 21,249 fixtures, status='in_progress', scheduled_at < now - 24h.**

## Result

```
Fixtures with status='in_progress' AND scheduled_at < now - 24h:  0
```

**Zero.** No fixtures are stuck in `in_progress`. The status transition is working correctly across all writers — when a game finishes, it gets moved to `completed` (or `final/awarded`).

## What this tells us

- The status pipeline is reliable. Scores may be missing, but the status field gets updated correctly.
- The "stuck in_progress" failure mode that I was specifically watching for is not present.
- The 156 past-but-still-scheduled rows from Item 1 are a different bug: games that should have been moved to `in_progress` or `completed` but weren't. They are NOT in `in_progress` (they're in `scheduled`). So they need a "promote scheduled → completed if start time is far past" step, not an "in_progress stuck" fix.

## Why this matters for Part 1.5 (the 24h-past-scheduled alert)

The alert you asked for in Part 1.5 should be on `status='scheduled' AND scheduled_at < now - 24h` (which has 156 rows today), not on `in_progress`. I'll wire it to the correct condition when I implement it.

**Per Arnel's read-only rule, no data was changed.**
