# Item 2 — Who updates ECHL / USHL / AHL / OHL / WHL / QMJHL / NCAA / KHL / PWHL scores today

**Direct answer: NOTHING updates the HockeyTech leagues today.** The cron exists in `openclaw cron list` but the orchestrator script it should call isn't wired to it, and the cron that's actually firing only covers NHL + Highlightly (8 leagues).

## The two score-updating pipelines

| Pipeline | Cron | Script | Leagues | Status |
|---|---|---|---|---|
| Daily multi-league (NHL + HL) | `5b6615f2-993e-4035-927e-7f3b98b06263` "RinkStop Daily Scores Ingest" — `0 7 * * *` UTC | calls `bash scripts/run-scores-ingest-detached.sh` → `scripts/_daily-scores-ingest.cjs` | NHL, SHL, DEL, KHL, MHL, VHL, SPHL, Liiga | **error 4x** in a row, last 22h |
| Daily all-league (NHL + HockeyTech + HL) | **NO CRON** | `scripts/_daily-scores-all-leagues.cjs` | NHL, AHL, ECHL, OHL, WHL, QMJHL, USHL, PWHL, SHL, DEL, KHL, MHL, VHL, SPHL, Liiga | orphan — last log 2026-09-29 |
| Weekly dedup | `2210b83f-701e-41d5-a10d-cf989ed89e04` "Fixtures Dedup (weekly)" — `0 4 * * 0` UTC | `scripts/dedup-fixtures-all-leagues.js` | all | ok, last 5d ago |

## Why is cron 5b6615f2 failing?

The error is **not in the script** — it's in the cron wrapper.

The cron payload is an **agent turn** (an AI model call), not a plain shell command. The agent is told: "Run `bash scripts/run-scores-ingest-detached.sh`, wait for the PID file, tail the log, report the summary line." The agent uses a model to interpret and act. The last 4 errors:

```
FallbackSummaryError: All models failed (2):
  kilocode/minimax/minimax-m3: 429 "[BYOK] Your API key has hit its rate limit."
  minimax/minimax-m2.7: ⚠️ API rate limit reached. Please try again later.
```

The script itself doesn't depend on a model. The agent that runs the script is rate-limited by the BYOK key. So the script has been failing to **start** for 4 days, not failing to run.

## What this means for the leagues

- **NHL / SHL / DEL / KHL / MHL / VHL / SPHL / Liiga:** no update since 2026-10-15 (yesterday). NHL still has activity (55 completed in last 7d) only because the previous run before the rate-limit window worked and the cache is still warm. **If the cron stays broken for 3+ more days, NHL will start showing stale scores too.**
- **AHL / OHL / WHL:** still updating in last 7d (32/20/27 respectively) — same reason as NHL: cache warmth from before the orchestrator went orphan. Will go stale in 1-2 weeks.
- **ECHL / USHL / QMJHL / PWHL / NCAA:** nothing updates them at all right now. (ECHL last updated 2026-06-16, USHL 2026-09-27, QMJHL 2026-05-17, PWHL 2025-05-03, NCAA 2026-04-11.)

## Recommended fix (no model, no agent turn)

Replace `cron 5b6615f2` with a plain **Vercel Cron** (or **system cron on the host**) that calls the existing detached wrapper directly. The wrapper `scripts/run-scores-ingest-detached.sh` already handles PID file, log rotation, in-flight reuse, and runs `scripts/_daily-scores-ingest.cjs` to completion.

**Option A — Vercel Cron (preferred, requires Vercel Pro+ for cron jobs):**
- `vercel.json` entry: `{ "crons": [{ "path": "/api/cron/scores-ingest", "schedule": "0 7 * * *" }] }` (or use the `vercel-cron` integration in the dashboard).
- Tiny API route `src/app/api/cron/scores-ingest/route.ts` that just runs the shell command via `child_process.exec` and returns 200/500.
- Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. Set `CRON_SECRET` in the project's env.

**Option B — system cron (works on any plan including Hobby):**
- `crontab -e` on the host: `0 7 * * * cd /root/.openclaw/workspace/rinkstop-platform && bash scripts/run-scores-ingest-detached.sh >> /var/log/scores-ingest.log 2>&1`.
- The host is already running all the other detached crons (per `openclaw cron list` — most are isolated runs that are cron-style).

**Effort: ~30 min, 1 PR.** The detached wrapper is already battle-tested. Risk: low. Cost: $0 (Vercel Cron on Pro is included; system cron is free).

**Do NOT build this without your approval.** Per your rule, I am only reporting.

## Bonus: wire `_daily-scores-all-leagues.cjs` to the same cron

The same cron could ALSO call the all-leagues orchestrator right after the first one. Effort +20 min, risk low. The orchestrator's own last run was 2026-09-29 and was working at that time. This would fix the ECHL/USHL/AHL/OHL/WHL/QMJHL/USHL/PWHL staleness in one shot.

**Per Arnel's read-only rule, no data was changed.**
