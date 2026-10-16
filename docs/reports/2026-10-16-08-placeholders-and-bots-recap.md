# Item 8 — Recap: Task 2.2 / 2.3 (placeholder work) + Task 3 (bots) status

This is the recap of the cut-off material from the prior message.

## Task 2 — 0-0 placeholders

### 2.1 — Code change: write NULL for unstarted games

**Status: ALREADY SHIPPED for the one-shot path. NOT YET done for the cron-fed path.**

| File | Lines | Status |
|---|---|---|
| `scripts/ingest-2025-26-nhl-schedule.cjs` | 192-196 | **Shipped** in commit `53874d58 fix(ingest): write NULL scores for unstarted games instead of 0-0 placeholder` (merged via `69acebfa Merge Piece D`) |
| `scripts/_daily-scores-all-leagues.cjs` | 319-320 | **Shipped** in the same Piece D |
| `scripts/_daily-scores-ingest.cjs` (cron-fed) | n/a | **NOT DONE.** This is the only path that's still writing 0-0 for unstarted games. |

The change is one line: if `status === 'scheduled' || status === 'postponed'`, set `home_score` and `away_score` to `null` instead of `0`.

### 2.2 — Data cleanup of existing 0-0 placeholders

**Status: SHIPPED.** Commit `61e7f882 Add revert CSV + SQL for Task 2.2 (zero-zero scheduled placeholder cleanup)` exported the affected row ids + their current values to a file and shipped the `UPDATE fixtures SET home_score = NULL, away_score = NULL WHERE status = 'scheduled' AND home_score = 0 AND away_score = 0` SQL.

**A re-export would only contain rows created SINCE that commit.** Per Item 1, 156 past-but-still-scheduled rows exist across all leagues (NHL 68, USHL 38, Liiga 21, ECHL 18, AHL 4, OHL 3, SHL 3, NCAA 1). Of those, some may have scores = 0/0 still (the new ones written by the unfixed cron-fed path), and some may have null scores already. A re-export query is 1 read-only command.

### 2.3 — Other statuses (cancelled, postponed, in_progress) with placeholder scores

**Status: NOT RUN YET.** Per your read-only rule I haven't run a fresh query. The query is:
```sql
SELECT status, count(*)
FROM fixtures
WHERE status IN ('cancelled', 'postponed', 'in_progress')
  AND home_score = 0 AND away_score = 0
GROUP BY status;
```

I can run it (read-only) and report counts whenever you say. **No data will be changed.** For "in_progress", 0-0 is plausible early in a game; for "cancelled" or "postponed", 0-0 is almost certainly a placeholder.

## Task 3 — Bots

### 3.1 — Vercel plan

**Cannot be confirmed via API.** Hit `/v1/teams/{id}`, `/v1/billing/plan`, `/v9/projects/{id}` with the vcp_3DCG… token. The token works for the projects/deployments endpoints (used to verify production alias on the React #310 fix), but the billing endpoints need a billing-scoped token. **You need to tell me the plan** (Hobby / Pro / Enterprise). The plan decides the available API surface:
- Hobby: managed rulesets only, no custom rules.
- Pro: full Firewall API + custom rules.
- Enterprise: custom JS challenges + everything in Pro.

### 3.1a — Vercel Firewall setup via API

**Doable for Pro+ via `POST /v1/security/firewall/config`.** The right pattern for your "verified bots higher, unverified lower" rule:

1. **Managed rule "Bot Management"** (Pro+, available via `POST /v1/security/bot-management` with `action: "challenge"` for "definitely automated" and `action: "log"` for "likely automated"). This is Vercel's built-in bot verification — it uses IP ranges published by Google/Bing/DuckDuckGo/etc. **This is the rule that does the actual verification work.**
2. **Custom rate-limit rule for non-verified traffic** (`POST /v1/security/firewall/config` with a custom rule that checks `not user_agent in known_good_list` AND `not ip.in(verified_bot_ranges)` → `rate_limit(60/min)`).

Effort: 2-3 hours including testing. Risk: low. Cost: $0 (Firewall is included on Pro). Plan requirement: Pro or Enterprise.

**If we're on Hobby:** we can still apply the managed "Bot Management" ruleset via the dashboard, but cannot write a custom rate-limit rule against non-verified traffic. The path forward on Hobby is to upgrade OR move to a Cloudflare-in-front-of-Vercel setup.

### 3.2 — Upstash Redis (if code is needed for a counter)

**Recommendation: do not build it now.**

The current middleware in `src/middleware.ts` (Piece C, shipped 2026-10-15) is a per-instance 60-second sliding window using a `Map` — in-memory, per Lambda. So the 1000/min cap IS already shipping; it just isn't global. Vercel Edge doesn't share memory between regions/instances.

If you want a true global counter later:
- **Upstash Redis (HTTP, edge-compatible):** free tier 10k commands/day, $0.20/100k after. Sliding window via INCR+EXPIRE is ~1 line.
- **Vercel Storage (KV):** $0.10/100k commands, no free tier.
- **Vercel Edge Config** is read-mostly — NOT for atomic counters. (Your call-out was correct.)

Recommendation: ship Vercel Firewall first. If the 1000/min instance cap is still too loose after firewall is in place, add Upstash Redis as a 1-PR follow-up. ~$14/mo at 5k req/min × 1440 min. **Don't build it preemptively.**

### 3.3 — Cut crawler logging

**Status: SHIPPED.** Commit `57b13a5f fix(middleware): cut crawler logging to 'first seen' + 1% sample (Piece E, Task 3.3)` is on main. The current middleware (read it now):
- "first seen" of a new IP claiming a bot UA → 1 log line.
- 1% random sample of all other UA-claimed requests → 1 log line per 100.
- 429 cap-exceeded → always logged.
- Anomalous cases (UA claims a bot but fails verification) → handled by the Vercel managed rule, not by the middleware.

I have not added additional anomaly detection (e.g. "UA claims Googlebot but request rate is 50/sec") — that belongs in a Vercel Firewall custom rule (Task 3.1a), not in the middleware.

### 3.4 — Remove the 1000/min per-instance bypass

**Recommendation: DO NOT remove it until Task 3.1a is verified working.** The 1000/min cap is the only thing protecting against bad-UA scrapers right now. Honest summary of what is and isn't protected:

- **What's protected today:**
  - Real users: 100 req/min/IP (per instance).
  - UA-claimed crawlers (Googlebot, Bingbot, etc.) self-declared: 1000 req/min/IP (per instance).
  - 429 is always logged for both tiers.
- **What's NOT protected today:**
  - Verified-bot IP list: not enforced. UA can be spoofed.
  - Per-instance cap: N concurrent instances = N×1000 effective.
  - Single client opening 100 parallel connections can burst harder than the per-minute window.
  - No DNS / reverse-lookup verification.

**Removing the 1000/min cap now without Vercel Firewall in place is reckless.** Real verified bots (Googlebot, Bingbot) stay under 100/min/IP even at peak indexing, so dropping the cap to 100/min for UA-claimed-but-not-verified traffic would only hurt spoofers — but I'd rather hurt them via Vercel Firewall (where the verification is real) than via a blind 100/min for everyone.

**Per Arnel's read-only rule, no data was changed.**
