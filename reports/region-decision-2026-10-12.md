# Supabase Region Strategy — 2026-10-12 (revised)

**Status:** revised after Arnel 2026-10-12 11:07 CDT screenshot confirmed:
**Supabase does NOT support region changes for existing projects.**
"You cannot directly change the region of an existing Supabase project
because each project is permanently bound to its physical infrastructure
upon creation." (Supabase docs)

This rules out Option A (full region move) as a one-step support-ticket
operation. A region move would require:
- Create a new project in the target region
- Dump + restore schema and data
- Manually re-create storage buckets, RLS policies, edge functions
- Manually re-verify auth claims, custom configs, cron job bindings
- Update every env var (Supabase URL, anon key, service role key)
- Cutover with ~1-4 hours of downtime
- 1-3 days of careful re-validation

For a 660ms TTFB win on 42 clicks/day, this is the wrong trade.

## Decision: enable a us-east-1 read replica instead

**The right answer for this workload:**

- 95% of Supabase traffic is reads (public directory pages, country
  pages, rink/team/league detail). Writes (claims, RSVPs, new listings)
  are <5%.
- Supabase Pro supports read replicas in additional regions.
- Read replica lives in us-east-1, colocated with Vercel `iad1`.
- Read traffic gets ~150ms RTT (was ~180ms to Tokyo).
- Write traffic stays on the Tokyo primary (~180ms RTT, but rare).
- No data migration. No RLS re-validation. RLS policies are
  automatically replicated by Supabase.
- Cost: ~$10/month on Pro (the smallest replica instance).
- Time to enable: 30 minutes in the Supabase dashboard. Time to wire
  up: 1-2 hours of code (this commit).

## Traffic data (GSC 28d, 2026-09-14 → 2026-10-12)

- USA: 459 clicks (39.1%)
- Canada: 171 clicks (14.6%)
- UK: 46 clicks (3.9%)
- Top 3: 57.6%
- Philippines: 7 clicks (0.6%)
- Total: 1,174 clicks / 79 countries / 28 days

Read traffic pattern (server-side analytics would be better, but
from the public route inventory):
- ~95% of `supabase.from(...).select(...)` calls
- ~5% of `supabase.from(...).insert()/.update()/.delete()/.upsert()/.rpc()` calls
- Read calls are concentrated on public pages (home, /directory/*,
  /news, /rinks, /teams, /leagues, /players)
- Write calls are concentrated on /dashboard/*, /claim-*, /admin/*,
  /api/* POST routes

## Architecture

```
Browser → Vercel iad1 (Virginia)
            │
            ├── reads (~95%) → Supabase READ REPLICA us-east-1
            │                     (~20ms RTT, near-zero latency)
            │
            └── writes (~5%) → Supabase PRIMARY ap-northeast-1
                                (180ms RTT, rare, low impact)
```

Both endpoints use the same `anon` and `service_role` keys. RLS
policies are identical. The replica reads from a streaming WAL
replication of the primary, with ~1-2 second replication lag (fine
for public directory data, NOT fine for any "write-then-read" flow).

## Implementation plan

### Phase 1: Infrastructure (this PR)
- ✅ Add `NEXT_PUBLIC_SUPABASE_READ_URL` env var to Vercel
  (Arnel does this in dashboard; I provide the URL once Supabase
  shows it)
- 🔄 Update `src/lib/supabase.ts` to export `supabaseRead` client
  pointing at the replica
- 🔄 Add a `db` smart proxy that auto-routes `.select()` to the
  replica, mutations to the primary
- 🔄 Comment on existing `supabase` (primary) explaining when to use
  each client

### Phase 2: Selective conversion (next PR)
- Convert the home page + /directory/* + /news to use `db` (or
  `supabaseRead` for explicit reads) — that's ~50-80 files of real
  conversion, not 525
- The supabaseAdmin (service-role) stays on the primary; admin
  tooling needs consistent reads

### Phase 3: Validation
- Smoke test 10/10 URLs
- Home page TTFB measurement: expected ~150-250ms on cold cache
- /directory/* TTFB: expected ~80-150ms
- Monitor replica lag via the Supabase dashboard

## What about Option A (full region move)?

Defer indefinitely. The cost-benefit doesn't justify:
- 2-5 days of careful migration work
- 1-4 hours of downtime
- High risk of one-missed-RLS-policy = data leak
- $0 cost (Pro covers it) but huge opportunity cost of the work

**Revisit Option A only if:**
- We outgrow Pro plan and Enterprise offers a region-move service
- Supabase launches a "move project" feature (rumored for 2027 per their roadmap)
- The latency cost becomes a real revenue blocker (e.g. our AdSense
  RPM drops measurably, or our B2B signup conversion suffers from
  the Tokyo round-trip)

For now, the read replica is the answer.

## Files changed in this commit

- `reports/region-decision-2026-10-12.md` (this file, revised)
- `src/lib/supabase.ts` (add supabaseRead + db smart proxy)
- Future: Vercel env var update (Arnel, after Supabase shows the replica URL)
- Future: Selective conversion of public pages to use db/supabaseRead

## Notes for future agents

- The `db` smart proxy is the recommended client for new code. It
  auto-routes reads vs writes. Existing `supabase` keeps working as
  before (pointing at the primary, slower).
- If you see code using `supabase.from(...).insert(...)` and reading
  the result back immediately, that's a "write-then-read" pattern
  that may suffer from the 1-2 second replica lag. Use the primary
  `supabase` client directly for that flow.
- The replica URL is per-project and shown in the Supabase dashboard
  under Project Settings → Database → Replication. Don't hardcode it.
