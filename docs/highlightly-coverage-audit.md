# Highlightly Coverage Audit

**Completed:** 2026-06-14
**Arnel's directive:** Audit Highlightly endpoints per league. Cross-verify with official sources before publishing.

## TL;DR

**Highlightly provides rich play-by-play + boxscore for NHL only.** All other leagues are score-only (final + period scores). NCAAH's boxscore arrays come back empty, so even NCAAH is effectively score-only.

The "/statistics, /events, /lineups" endpoints in the docs are misleading — those return 404. The real data is on `/matches/{id}`, and only NHL populates `events` and `overallStatistics`.

## Hosts (one RapidAPI key covers both)

| Host | Pairs with | Leagues actually covered |
|---|---|---|
| `hockey.highlightly.net` | `hockey-highlights-api.p.rapidapi.com` | 100 leagues: OHL, WHL, QMJHL, AHL, ECHL, USHL, PWHL, MHL, VHL, NMHL, KHL, SHL, Liiga, Naisten Liiga, DEL, DEL2, Extraliga, Hokiliiga, Swiss League, Swiss Cup, Slovakia Cup, Belarusian Cup, Memorial Cup, etc. (no NCAA) |
| `nhl.highlightly.net` | `nhl-ncaah-api.p.rapidapi.com` | NHL, NCAA (only — no AHL/ECHL/USHL/PWHL/OHL/WHL/QMJHL on this host) |

## Endpoint behavior (live tests)

| Endpoint | Behavior |
|---|---|
| `/matches?date=&limit=` | ✅ works on both hosts. Returns match list with `state.score.{current,firstPeriod,secondPeriod,thirdPeriod,overtimePeriod}` |
| `/matches?leagueId=&date=&limit=` | ✅ works on `hockey` host. Use this for non-NHL — `league` filter (string) doesn't work, must use `leagueId` (numeric) |
| `/matches/{id}` (detail) | ✅ works on both hosts. Returns full match as JSON array `[ {...} ]` |
| `/leagues` | ✅ works on `hockey` host (100 leagues). ❌ 404 on `nhl` host |
| `/lineups/{id}` | ✅ works on `nhl` host (returns `{home, away}`) |
| `/statistics/{id}`, `/events/{id}`, `/matches/{id}/statistics`, `/matches/{id}/lineups`, `/matches/{id}/events`, `/matches/{id}/play-by-play`, `/matches/{id}/boxscore` | ❌ All 404 |

## Per-league coverage

| League | Final | Periods | Events (play-by-play) | Boxscore (overallStatistics) | Cross-verify against |
|---|---|---|---|---|---|
| **NHL** | ✅ | ✅ | ✅ **296 events/game** — Period Start, Face Off, Stoppage, Shot, Blocked, Hit, Missed, Takeaway, Giveaway, **Goal** (with `isScoringPlay`), penalties (Roughing, Hooking, etc.) | ✅ **14 stats/team** — Blocked Shots, Hits, Takeaways, Shots, PP Goals, PP Opportunities, PP%, SH Goals, Shootout Goals, Faceoffs Won, Faceoff Win%, Giveaways, Penalties, Penalty Min | NHL.com (`nhl.com/api/v1/gamecenter/{id}/play-by-play`) |
| **NCAA** | ✅ | ✅ | ❌ (empty array) | ❌ (data arrays are empty `[]`) | NCAA.com game center |
| **OHL, WHL, QMJHL, AHL, ECHL, USHL, PWHL, MHL, VHL, KHL, SHL, Liiga, DEL, DEL2, Swiss League, Extraliga, Memorial Cup, Belarus, etc.** | ✅ | ✅ | ❌ | ❌ | League-specific official sources (HockeyTech game-detail, league API) |

**Critical:** no public API gives us play-by-play with named scorers for non-NHL leagues. To verify named-scorer claims in OHL/WHL/QMJHL/AHL/ECHL articles, we need HockeyTech's private game-detail endpoint or equivalent.

## Cross-verification plan

For each league, the cross-verification path is:

| League cluster | Primary | Cross-verify |
|---|---|---|
| NHL | Highlightly `/matches/{id}` (full events) | NHL.com `/gamecenter/{id}/play-by-play` (official, free) |
| AHL, ECHL, OHL, WHL, QMJHL, USHL, PWHL | Highlightly (score only) | HockeyTech game-detail endpoint (private client key per league) |
| NCAA | Highlightly (score only) | NCAA.com game center |
| KHL, MHL, VHL, Belarus | Highlightly (score only) | khl.ru public API |
| SHL, Liiga, DEL, NL, Swiss, Czech, etc. | Highlightly (score only) | League-specific official site |

**Cross-verification is invoked on-demand**, not nightly:
- When Highlightly's score doesn't match a published article
- When the article contains claims Highlightly can't verify (named scorers, save counts, etc. in non-NHL articles)
- The cross-verification runs the official source, gets a fact set, and compares claim-by-claim

## File reference

- Audit script: `rinkstop-platform/scripts/datasources/_probe-remaining.mjs` (run for the rest)
- Audit script: `rinkstop-platform/scripts/datasources/_probe-all-leagues.mjs` (initial pass)
- Raw output: `/tmp/highlightly-coverage.json`, `/tmp/highlightly-remaining.json`
- This doc: `rinkstop-platform/docs/highlightly-coverage-audit.md`

## Next step

The framework gets built on Highlightly (NHL = rich, others = score-only). Each league registers:
1. A Highlightly adapter (uses `/matches/{id}` for data)
2. A cross-verification adapter (HockeyTech / NHL.com / league API)

Per-claim verification flows:
- NHL: full claim check against Highlightly events
- NCAA + non-NHL: score + period + OT/SO claim only; named-scorer claims flagged as "unverifiable" (not false) unless cross-verification triggered
