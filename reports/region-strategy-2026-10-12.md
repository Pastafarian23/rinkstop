# Global Latency Strategy — 2026-10-12

Per Arnel 2026-10-12 11:16 CDT directive: "we have European and middle east
users, and significant traffic in Singapore."

## What we know now (real data, not opinions)

### 28-day GSC country breakdown (already pulled)

- USA 39.1%, Canada 14.6%, UK 3.9% — top 3 = 57.6% of clicks
- EU (UK+DE+FR+SE+FI+CZ+NO+DK+NL+CH+AT+IT+ES+PT+PL+IE+IS+BE) = 20.2%
- Middle East (SAU+UAE+ISR+EGY+LBN) = ~9%
- Australia 1.6%, Philippines 0.6%

### Top queries by clicks (28d) — these are the high-intent ones

| Query | Clicks | Top position | Top country/device |
|---|---:|---:|---|
| ice skating baku | 8 | 2.9 | AZE, mobile |
| ice skating riyadh | 8 | 7.7 | SAU, mobile |
| ice skating lebanon | 6 | 5.8 | LBN, mobile |
| hili ice rink | 4 | 4.6 | ARE, mobile |
| rinkstop | 4 | 1.0 | direct/brand |
| ice palace tbilisi | 3 | 4.0 | GEO, mixed |
| al ain ice rink | 2 | 6.5 | ARE, desktop |
| emirates sports arena | 2 | 6.5 | ARE |

**Pattern:** 5 of the top 6 non-brand queries are **Middle East, mobile**,
ranking position 2.9-7.7. These are users actively looking for rinks
in their city. Page speed directly impacts whether they convert to a
listing view / claim / B2B signup.

### What I don't have

- **No CrUX field data** (PageSpeed Insights API quota exceeded today;
  CrUX API key not provisioned). I'd love to see TTFB / LCP by country
  from real Chrome users but can't pull it right now.
- **No bounce-rate-by-country data** (GA4 doesn't seem to be set up with
  per-country segments I can query). The "are users actually bouncing
  from slow pages" question is unanswerable from the data I have.
- **No revenue by country** — if ME traffic converts at 2x the rate
  of US traffic (higher ad RPM, more B2B intent), the per-click
  value is 2x and the per-replica investment pays for itself faster.

## Plan (now revised — multi-region is justified)

### Track A: us-east-1 read replica (already in flight, ~30 min Arnel)
- Status: code shipped, awaiting Supabase dashboard click
- Cost: ~$10/mo
- Handles 57.6% of clicks (US/CA/UK) well
- Drops home page TTFB 660ms → ~150-200ms for those users

### Track B: ap-southeast-1 read replica + edge middleware (recommended, NEW)
- Status: NOT YET SHIPPED
- Cost: ~$10/mo (1 more Supabase replica) + Vercel edge middleware (free on Pro)
- Handles SEA + Middle East + Australia — basically everything not in the US/CA/UK top-3
- Specifically addresses the 5 ME mobile queries above that are showing strong intent

**Why ap-southeast-1 (Singapore) and not me-central-1 (Bahrain)?**
- Supabase Pro has replicas in us-east-1, us-west-1, eu-west-1,
  eu-central-1, ap-southeast-1, ap-northeast-1, ap-south-1, sa-east-1.
- It does NOT currently have me-central-1 (Bahrain) or any Middle
  East region in the standard replica list. (The Supabase region
  list is shorter than AWS's.)
- ap-southeast-1 (Singapore) is the closest available Supabase
  region to the Middle East. RTT from Riyadh to Singapore is ~80-100ms
  vs Riyadh to Tokyo ~180ms or Riyadh to Virginia ~250ms. Not
  perfect, but 2-3x better than current.

**Edge middleware logic:**
```ts
// middleware.ts (Vercel edge runtime)
export function middleware(req: NextRequest) {
  const country = req.geo?.country || 'US';
  // Map country to nearest Supabase replica URL via per-region env vars
  const replicaUrl = countryReplicaMap[country] || process.env.NEXT_PUBLIC_SUPABASE_READ_URL;
  // Set the env var override for the request
  // (Vercel allows per-request env overrides in middleware)
  req.headers.set('x-supabase-read-url', replicaUrl);
  return NextResponse.next({ request: { headers: req.headers } });
}
```

The supabaseRead client in `src/lib/supabase.ts` then reads from
`x-supabase-read-url` (set by middleware) instead of the env var.
This makes per-request routing possible without a 525-file refactor.

### Track C (deferred): EU-specific replica (eu-west-1 or eu-central-1)
- Cost: another ~$10/mo
- Only justified when EU traffic + bounce data warrants
- 20.2% of clicks currently, but a single EU region replica would
  catch UK + most of EU
- Revisit after Track A + B benchmarks come in

## What this looks like end-to-end

```
User in Riyadh    → Vercel edge sin1 (closest ME-adjacent edge)
                  → Supabase ap-southeast-1 replica (read, ~80-100ms)
                  → first paint: ~600ms (vs 1500-2000ms today)

User in Baku      → Vercel edge sin1
                  → Supabase ap-southeast-1 replica (~30-50ms)
                  → first paint: ~400ms

User in London    → Vercel edge lhr1 (Frankfurt if closer)
                  → Supabase eu-west-1 replica (Track C, TBD)
                  → first paint: ~250-400ms (vs 1200ms today)

User in Virginia  → Vercel edge iad1
                  → Supabase us-east-1 replica (Track A)
                  → first paint: ~150-250ms (vs 660ms today)
```

## Decision point for Arnel

- **Yes, build Track B now:** I'll do Track A verification, then
  build the edge middleware + add the second replica config. About
  half a day of work.
- **Hold Track B, ship Track A first:** validate the read-replica
  pattern works end-to-end with us-east-1, then add Singapore.
- **Skip Track B for now:** monitor Track A's impact for a month,
  add Singapore only if ME/SEA bounce rates stay high.

## Files this commit will touch

- `src/middleware.ts` (new) — Vercel edge middleware for geo routing
- `src/lib/supabase.ts` — supabaseRead client reads per-request
  header instead of static env var
- `reports/region-strategy-2026-10-12.md` (this file)
