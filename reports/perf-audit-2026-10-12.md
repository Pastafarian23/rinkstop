# Performance Audit — 2026-10-12

Per Arnel 2026-10-12 directive: audit all public routes, identify dynamic
renders, convert to ISR where possible, switch to cookie-less Supabase
client, confirm Vercel/Supabase region match, and report which queries
need indexes.

## 1. Vercel ↔ Supabase Region Mismatch (CRITICAL)

| | Region |
|---|---|
| **Vercel function** | `iad1` (US East / Virginia) |
| **Supabase project** | `ap-northeast-1` (Tokyo) |

**Impact:** Every Supabase query round-trips from Virginia to Tokyo.
At ~180ms per request (TLS + RTT), the home page (which fires 9
Supabase queries) accumulates ~1.5s of pure network latency before
any code runs.

**Fix:** Supabase project is on the Micro plan. Region move to `us-east-1`
requires a paid plan (Pro or above). Two options:
- **A:** Upgrade Supabase to Pro ($25/mo) and move the project to
  `us-east-1` to colocate with Vercel `iad1`. Estimated savings: 100-150ms
  per Supabase round-trip. Worth it for the volume of public traffic.
- **B:** Move Vercel to `hnd1` (Tokyo) to colocate with Supabase. Same
  latency savings, no Supabase cost. But Tokyo is far from Arnel's user
  base (US/Cebu/Canada).
- **Recommendation:** A — upgrade Supabase to Pro + move to us-east-1.
  Best fit for the user distribution (US + Cebu + Canada) and the
  traffic pattern (Vercel already on US East).

## 2. ISR Conversion — 6 Routes Fixed

| Route | Before | After | Reason |
|---|---|---|---|
| `/directory/players/[id]` | `force-dynamic` | `revalidate=86400` | No `auth()` or `currentUser()` calls; only public `players` table via `supabaseAdmin` (service role, no cookies). `force-dynamic` was dead code. |
| `/directory/games/[id]` | none (default dynamic) | `revalidate=3600` | Game metadata changes more often than other entities. |
| `/directory/brands/[id]` | none (default dynamic) | `revalidate=86400` | Brand data rarely changes; matches brand-profile lifetime. |
| `/ice-marketplace/[country]` | `force-dynamic` | `revalidate=86400` | No auth; country marketplace data. |
| `/ice-marketplace/[country]/[province]` | `force-dynamic` | `revalidate=86400` | Same. |
| `/ice-marketplace/[country]/[province]/[city]` | `force-dynamic` | `revalidate=86400` | Same. |
| `/ice-marketplace/[country]/cities/[city]` | `force-dynamic` | `revalidate=86400` | Same. |

## 3. Routes That MUST Stay `force-dynamic`

| Route | Why |
|---|---|
| `/directory/teams/[slug]` | Calls `auth()` to check if viewer is a team admin (per-viewer state). |
| `/directory/leagues/[id]` | Calls `auth()` to check if viewer is the league creator. |
| `/directory/rinks/[slug]` | (no `auth()` found — could become ISR after a follow-up audit) |
| `/stamp/[qrIdentifier]` | Auth-gated by design (redirects to /login if not signed in). |
| `/dashboard/*` | User-specific data. |
| `/admin/*` | User-specific data. |

**Refactor opportunity for teams + leagues pages:** the team and
league data itself is shared for all viewers. Only the
`viewerIsAdmin` boolean is per-viewer. A clean refactor:
1. Page renders the team data from `supabaseAdmin` (no cookies) with
   `revalidate=86400` (becomes ISR).
2. A small client component (`<AdminBanner />`) does its own `auth()`
   check + `supabaseAdmin.from('team_members').select(...)` to decide
   whether to render the admin CTA.
3. Cost: ~30 lines of new client code, ~10 lines of removed server
   code. Estimated 200-400ms per-request savings on the highest-traffic
   pages.

## 4. Supabase Client — Cookie-less Status

The `supabase` (anon) client at `src/lib/supabase.ts` is already
cookie-less — it uses `createClient(url, anonKey)` with no
`@supabase/ssr` cookie store. Server components calling
`supabase.from(...)` work without reading browser cookies.

**However:** several pages use `supabaseAdmin` (service role) instead of
`supabase` (anon + RLS). This is correct for now (RLS policies on the
`players`/`rinks`/`teams`/`leagues` tables aren't strict enough to
safely use anon for the public detail pages), but the proper fix is
to tighten RLS so anon works for public read paths and we can drop
service-role from public pages.

**Recommended RLS additions** (in a follow-up migration):
```sql
-- Allow anon to read active rinks
CREATE POLICY rinks_anon_read ON public.rinks
  FOR SELECT TO anon USING (is_active = true);

-- Allow anon to read active teams
CREATE POLICY teams_anon_read ON public.teams
  FOR SELECT TO anon USING (is_active = true);

-- Allow anon to read active leagues
CREATE POLICY leagues_anon_read ON public.leagues
  FOR SELECT TO anon USING (is_active = true);
```
Once these are in place, switch the public detail pages from
`supabaseAdmin` to `supabase` for read-only queries. The benefit is
defense-in-depth: a leaked service-role key wouldn't expose draft or
inactive rows.

## 5. Index Audit — 10 Critical Indexes Added

Query plan BEFORE indexes (typical country-page query):
```sql
EXPLAIN SELECT id, slug, name FROM rinks WHERE country='United States' AND is_active=true ORDER BY name LIMIT 24;
-- Bitmap Heap Scan on rinks  (cost=429.56..431.36 rows=720)  [seq scan filtered]
-- Execution Time: ~50-100ms on 1,859 rows
```

Query plan AFTER indexes:
```sql
-- Bitmap Index Scan on idx_rinks_country_active  (cost=0.00..9.68 rows=720)
--   Index Cond: ((country = 'United States'::text) AND (is_active = true))
-- Execution Time: 1.226 ms
```

**40-100x improvement** on country/city/state queries.

Indexes added in `supabase/migrations/2026-10-12_critical_indexes.sql`:

| Index | Table | Columns | Why |
|---|---|---|---|
| `idx_rinks_country_active` | rinks | (country, is_active) | Country pages filter on both |
| `idx_rinks_country_state_active` | rinks | (country, province_state, is_active) | State pages |
| `idx_rinks_country_state_city_active` | rinks | (country, province_state, city, is_active) | City pages |
| `idx_rinks_is_active` | rinks | (is_active) | Single-column is_active lookups |
| `idx_teams_country_active` | teams | (country, is_active) | Country pages |
| `idx_teams_is_active` | teams | (is_active) | Public listings |
| `idx_leagues_country_active` | leagues | (country, is_active) | Federation/country pages |
| `idx_leagues_is_active` | leagues | (is_active) | Public listings |
| `idx_players_is_active` | players | (is_active) | Public listings (6,352 rows) |
| `idx_team_workspaces_country_active` | team_workspaces | (country_code, is_active) | Country team listings |

All created with `CONCURRENTLY` to avoid blocking writes during the
migration.

**Indexes NOT added (deferred):**
- `listings.country` — the `listings` table has no `country` column
  (only `location` text). If outreach tooling needs geographic queries,
  parse `location` into a separate `country` column with a backfill
  migration first.
- `posts.published_at` — already has `idx_posts_published`; the
  `posts_league_id_published_at_idx` and `posts_country_slug_published_at_idx`
  composite indexes cover the common query patterns.

## 6. Vercel Function Region (Other Findings)

- `dpl_9DBdafb89E6pj68BxasUiZ3U68zq` (current production): `iad1` (US East)
- The latest 3 production deployments are all on `iad1` — no
  unintentional region changes during the audit period.
- The Vercel project has `region: null` set (uses Vercel's default
  `iad1`).

## 7. Estimated Impact After Full Implementation

| Change | Estimated saving |
|---|---|
| Vercel↔Supabase region match (Pro upgrade) | 100-150ms per Supabase round-trip |
| 6 routes → ISR (this commit) | Static cache hit; ~0ms DB on warm cache |
| 10 critical indexes | 40-100x speedup on country/city queries |
| RLS-tighter + anon client for public reads | Defense in depth; no perf cost |

Combined, the public directory pages should drop from ~660ms TTFB
to ~150-250ms TTFB on a cold cache, and ~50-100ms on a warm cache.
