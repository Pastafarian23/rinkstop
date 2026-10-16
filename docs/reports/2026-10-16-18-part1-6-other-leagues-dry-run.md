# PART 1.6 — Other leagues dry-run (read-only)

**2026-10-16 02:10 UTC**

## Methodology

Ran `node scripts/_daily-scores-ingest.cjs --dry-run --days=2` at 07:09 UTC. Read-only. Source data: `/tmp/daily-scores-dry-run-report.json`.

## Per-league status

| League | Source | Games in window | Would insert | Would update | Would 2nd-row | Score drift | Status |
|---|---|---|---|---|---|---|---|
| **NHL** | `nhl-com.cjs` | 11 | 1 | 26 | 0 | 0 | ✅ Working — 1 insert, 26 updates, 0 drift |
| **DEL** | HL orchestrator | 1 | 0 | 1 | 0 | **1** | ⚠️ HL covers it but 1 game has score drift |
| **KHL** | HL orchestrator | 2 | 0 | 4 | 0 | **4** | ⚠️ HL covers it but 4 games have score drift |
| **SHL** | HL orchestrator | 7 | 0 | 0 | 0 | 0 | ❌ HL finds games but ALL teams not in DB (wrong league or missing) |
| **Liiga** | HL orchestrator | 7 | 0 | 0 | 0 | 0 | ❌ HL finds games but ALL teams not in DB |
| **MHL** | HL orchestrator | 7 | 0 | 0 | 0 | 0 | ❌ HL finds games but ALL teams not in DB |
| **VHL** | HL orchestrator | 4 | 0 | 0 | 0 | 0 | ❌ HL finds games but ALL teams not in DB |
| **SPHL** | HL orchestrator | 3 | 0 | 0 | 0 | 0 | ❌ HL finds games but ALL teams not in DB |
| **QMJHL** | HockeyTech (broken) | — | — | — | — | — | ❌ No source — HockeyTech orchestrator broken since 2026-09-29 |
| **NCAA** | HockeyTech (broken) | — | — | — | — | — | ❌ No source — HockeyTech orchestrator broken since 2026-09-29 |
| **USHL** | HockeyTech (broken) | — | — | — | — | — | ❌ No source — HockeyTech orchestrator broken since 2026-09-29 |
| **ECHL** | HockeyTech (broken) | — | — | — | — | — | ❌ No source — HockeyTech orchestrator broken since 2026-09-29 |
| **AHL** | HockeyTech (broken) | — | — | — | — | — | ❌ No source — HockeyTech orchestrator broken since 2026-09-29 |
| **OHL** | HockeyTech (broken) | — | — | — | — | — | ❌ No source — HockeyTech orchestrator broken since 2026-09-29 |
| **WHL** | HockeyTech (broken) | — | — | — | — | — | ❌ No source — HockeyTech orchestrator broken since 2026-09-29 |
| **PWHL** | HockeyTech (broken) | — | — | — | — | — | ❌ No source — HockeyTech orchestrator broken since 2026-09-29 |

## Summary

**Working today (via system cron at 07:00 UTC):** NHL, DEL, KHL, SHL, Liiga, MHL, VHL, SPHL.

**Not working (no cron coverage):** QMJHL, NCAA, USHL, ECHL, AHL, OHL, WHL, PWHL — HockeyTech orchestrator broke in the 2026-09-29 incident and has not been replaced.

**DEL and KHL score drift:** 1 DEL and 4 KHL games have score drift (existing DB scores differ from HL API scores for games already in DB). This needs human review before running for real — confirm whether the drift is correct or indicates a bad backfill.

**SHL/Liiga/MHL/VHL/SPHL:** HL API finds games, but every game has at least one team with no DB match. These leagues could be covered if team names were mapped into the DB. Not a source problem — a data problem.

## Recommendation

Run NHL, DEL, KHL for real (after reviewing the DEL/KHL score drift). Leave SHL/Liiga/MHL/VHL/SPHL as-is until team mapping is done. QMJHL/NCAA/USHL/ECHL/AHL/OHL/WHL/PWHL need a new data source — the HockeyTech orchestrator is not coming back.
