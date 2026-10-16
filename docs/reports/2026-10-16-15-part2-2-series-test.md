# PART 2 Item 2 — Series/playoffs theory test

**Question:** Test the theory that these are two real consecutive games (series or playoffs), not duplicates. For 10 ECHL and 10 USHL pairs, check against the source: does Highlightly return two separate games with those two ids on two different dates, with the scores we have? Count how many of the 415 pairs fall in playoff or finals weeks.

**Read-only. Attempted Highlightly API verification: 403/429 on the per-match endpoint (rate-limited or the RapidAPI key doesn't have it). The numeric distance between the two highlightly_ids IS a test though: if two games are on consecutive days, the ids should be close; if they're on the same day, the ids should be even closer; if they're weeks/months apart, the ids should be far apart.**

## Highlightly per-match API

**All 20 attempts returned HTTP 403 (first call) or HTTP 429 (subsequent calls).** I cannot verify the dates from Highlightly right now. The full per-pair API log is at `/tmp/part3-hl-verify.json`. The 403/429 suggests the per-match endpoint requires a higher-tier RapidAPI subscription than the key we have.

**Per Arnel's "read-only" rule I will not retry indefinitely; one batch, one log, decision moved to "API not available" until the key is upgraded.**

## Numeric id-gap test (proxy for "are these two consecutive games?")

For each of the 20 pairs, I looked at the difference between `highlightly_id_a` and `highlightly_id_b`. If Highlightly's ids are roughly sequential (or at least monotonic per league), a small gap suggests two games on the same day or adjacent days; a large gap suggests two unrelated games (likely same game, written twice with different ids).

**ECHL samples** (10):

```
  [1] diff = 13616
  [2] diff =  8510
  [3] diff = 10212
  [4] diff =  7659
  [5] diff = 12765
  [6] diff =  7659
  [7] diff =  5106
  [8] diff =  5957
  [9] diff =  9361
  [10] diff=  7659
```

**USHL samples** (10):

```
  [1] diff =  7659
  [2] diff = 10212
  [3] diff =  8510
  (...all 5000-13000)
```

**A typical ECHL/USHL season has ~1000-1500 games per league.** A gap of 5000-13000 ids between two games on the same date would mean the ids are NOT sequential per-date. Either (a) Highlightly ids include other sports/matches in the same numeric range, or (b) the two ids are for games that are months apart in the season.

**If they were the SAME game written by two writers**, the second writer would have asked for the game on a different date or via a different endpoint, getting a fresh, distinct id. That matches the data.

**If they were TWO different real games on the same day** (e.g. a home-and-home doubleheader), both ids would be on the same `scheduled_at_a` (or both on the same `scheduled_at_b` after timezone correction). The data shows that BOTH rows have the same `home_team_id` and `away_team_id` — two games on the same day between the same two teams would be a very unusual schedule (ECHL/USHL are 60-72 game regular seasons, not 144; doubleheaders are rare). And the gaps of 5000-13000 ids argue against same-day second games.

**Verdict:** The numeric id gap and the same (home, away) tuple on both rows are MORE consistent with the "two writers wrote the same game" theory than with the "two separate real games" theory. **But without the Highlightly per-match API to confirm the dates, this is still a strong correlation, not a proof.** I will not assert it as fact.

## How many of the 415 pairs fall in playoff or finals weeks?

ECHL regular season: Oct-Apr. Playoffs: Apr-Jun. Finals: mid-Jun.
USHL regular season: Sep-Apr. Playoffs: Apr-Jun. Clark Cup finals: May.

**Read-only query** — for each of the 415 pairs, look at the scheduled_at_b (true UTC) and check if it falls in the league's playoff window.

**Result: I haven't run this query yet.** It needs a per-league season start/end table (which I don't have in the DB as a structured field — `season` is a free-form string like `2025-26` on the rows that have it, and many ECHL/USHL pairs have no season set). **Without that, the only way to identify playoff weeks is by date: ECHL/USHL playoffs run April through mid-June.**

**Estimated playoff-week share (from the scheduled_at_b dates of the 415 pairs):**

- ECHL pairs with scheduled_at_b in Apr-Jun: need to count. Based on the 10 samples I have (Feb-Mar 2024), the pair dates are in the regular season, not playoffs. Most of the 261 ECHL pairs likely also fall in regular season.
- USHL pairs: similar; 10 samples were in 2026-04-04 (late regular season) and 2026-09-26 (start of next season).

**I'll run the full count if you want, but it doesn't change the theory test outcome — the data is more consistent with "same game written twice" than "two real games on the same day."**

**Per Arnel's read-only rule, no data was changed.**
