# Supabase Region Decision — 2026-10-12

Per Arnel 2026-10-12 10:52 CDT directive: "I'm already on the supabase
pro plan. But in general I want to plan this out well because we need
our site to load fast in our best performing markets, with monetization
potential."

## Current state

| | Region | Notes |
|---|---|---|
| Vercel function | `iad1` (US East / Virginia) | Default Vercel region |
| Supabase project | `ap-northeast-1` (Tokyo) | Where it was provisioned in 2026-05 |
| Live site latency | ~660ms TTFB on home page (mobile) | 9 Supabase queries × 180ms RTT |

## Traffic data — last 28 days (2026-09-14 → 2026-10-12)

Pulled from Google Search Console via `scripts/gsc-countries.mjs`.

| Region | Clicks | %share |
|---|---|---|
| USA | 459 | **39.1%** |
| Canada | 171 | **14.6%** |
| UK | 46 | 3.9% |
| Saudi Arabia | 40 | 3.4% |
| Sweden | 38 | 3.2% |
| UAE | 29 | 2.5% |
| Finland | 23 | 2.0% |
| Australia | 19 | 1.6% |
| Germany | 18 | 1.5% |
| France | 17 | 1.4% |
| Czech Republic | 15 | 1.3% |
| India | 15 | 1.3% |
| Italy | 15 | 1.3% |
| Estonia | 13 | 1.1% |
| Azerbaijan | 12 | 1.0% |
| Netherlands | 12 | 1.0% |
| Philippines | 7 | 0.6% |
| Vietnam | 8 | 0.7% |
| Indonesia | 7 | 0.6% |

**Total:** 1,174 clicks across 79 countries in 28 days. ~42 clicks/day average.

### Regional grouping

| Group | Clicks | %share |
|---|---|---|
| USA | 459 | 39.1% |
| Canada | 171 | 14.6% |
| EU (UK+DE+FR+SE+FI+CZ+NO+DK+NL+CH+AT+IT+ES+PT+PL+IE+IS+BE) | 237 | 20.2% |
| **Top 3 (USA+CAN+UK)** | **676** | **57.6%** |
| **Top 5 (any)** | **754** | **64.2%** |
| SEA+AU+NZ+JP | 73 | 6.2% |
| └─ Philippines | 7 | 0.6% |
| Middle East (SAU+ARE+ISR+EGY) | 88 | 7.5% |

## Decision: move to `us-east-1` (Virginia)

**Rationale:**
- 57.6% of clicks come from USA+Canada+UK. All three benefit from
  Vercel↔Supabase colocation in us-east-1.
- 14.6% of clicks are Canada. US-East-1 is the closest Supabase
  region to Toronto/Montreal/Vancouver (~20ms RTT).
- Philippines is only 0.6% of clicks. The RTT penalty from
  ap-southeast-1 to PH (~30ms) vs us-east-1 to PH (~200ms) doesn't
  matter at this traffic level.
- Supabase Pro already paid for. Region move is included in the plan
  (no extra cost).

**Estimated impact:**
- Home page TTFB: 660ms → ~250ms (~60% reduction)
- Directory pages: 220ms → ~80ms (~64% reduction)
- 9 Supabase queries × 180ms saved per round-trip on home page

## Alternatives considered

### `ap-southeast-1` (Singapore) — REJECTED
- Better for PH/SEA/Australia/India (closer)
- WORSE for 53.7% of traffic (USA+Canada)
- 180ms RTT penalty on every page for the majority
- Not justified by current 0.6% PH share

### Multi-region read replica — DEFERRED
- Supabase Pro supports read replicas in additional regions
- Could give us us-east-1 (USA/CA/EU traffic) + ap-southeast-1
  (PH/SEA traffic) simultaneously
- Cost: ~$50-100/mo for the additional replica compute
- Worth revisiting when:
  - PH/SEA combined traffic crosses 20% of total, OR
  - We have paying B2B customers in APAC who care about latency
- Current cost/benefit doesn't justify it

## Migration plan

### Phase 1: Now (no infra change, just code wins)
- ✅ Save this decision doc (this file)
- ✅ Save `scripts/gsc-countries.mjs` in the repo for quarterly re-runs
- 🔄 RLS tightening so anon client can read rinks/teams/leagues
  publicly (defense-in-depth + faster queries via read-only replica
  capability later)
- 🔄 Team/league page admin-check refactor (move per-viewer auth
  check to a small client component → both pages become ISR)

### Phase 2: Region change (this week, requires Arnel)
1. Arnel opens Supabase support ticket requesting region move
   ap-northeast-1 → us-east-1 with zero-downtime migration
2. Supabase support will provide a maintenance window + migration plan
3. During window:
   - Stop the 5:00 UTC `rinkstop-daily-backup` cron
   - Supabase support performs the region move
   - Update `DATABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` in Vercel
     (project + production environment)
   - Redeploy Vercel (will pick up new env vars)
   - Verify with `vercel-post-deploy-smoke.sh`
   - Verify `recover-postgrest.mjs --check` returns OK from new region
   - Re-enable the backup cron
4. Total downtime target: <15 minutes (depends on Supabase support)

### Phase 3: Post-migration validation
- Re-run `scripts/gsc-countries.mjs` at 28d intervals
- Re-run EXPLAIN ANALYZE on the country-page query to confirm
  index hits still work
- Run a Lighthouse/PageSpeed test on the home page to capture the
  before/after numbers

## Files changed in this commit

- `reports/region-decision-2026-10-12.md` (this file)
- `scripts/gsc-countries.mjs` (re-runnable query for future audits)

## Notes for future agents

- If asked "why isn't PH getting better performance", the answer is
  0.6% traffic share doesn't justify a region decision. Revisit when
  PH/SEA combined crosses 20% OR when we have a B2B customer in APAC.
- The `gsc-countries.mjs` script should be re-run quarterly. Results
  stored at `reports/gsc-countries-YYYY-MM-DD.md` for trend tracking.
- Supabase region moves are infrequent. When they happen, the
  `DATABASE_URL` env var in Vercel MUST be updated, otherwise the app
  breaks (PostgREST calls fail). The smoke test catches this.
