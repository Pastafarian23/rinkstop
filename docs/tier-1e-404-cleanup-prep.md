# Tier 1e — 404 cleanup (4 fixes + Bug A) — Prep Doc

## User directive

From `Project X` group chat at 2026-07-07 04:48 CDT:
> "A, but fix bug a in tier 1d as well"

Arnel approved option (a) from the audit's recommendation list (ship all 4 fixes), AND specifically called out Bug A (`'ututah'` → `'utah'` typo) as part of Tier 1d scope since I rewrote the state page route in `abe301d` and missed the typo.

## Scope

Five fixes, all surgical, in one cohesive patch:

### Fix 1 — `'ututah'` typo (Bug A, Tier 1d regression I missed)

**File:** `src/lib/city-page.ts:18`

**Change:** `'ututah': 'UT'` → `'utah': 'UT'`

**Recovers:** 7 Utah city URLs (park-city, ogden, orem, bountiful, west-valley-city, logan, provo). Verified by direct Supabase query — each has 1+ rinks in the DB that the page route currently can't reach.

**Source of state page's correct mapping:** `src/app/directory/united-states/[state]/page.tsx:18` already has `'utah': 'UT'` correct. The bug was only in the sibling `city-page.ts` file.

### Fix 2 — OR clause for full-name state tags (defensive, 18 rinks across 9 states)

**Files:**
- `src/lib/city-page.ts` — `applyRegionTag()` helper added; replaces `.eq('province_state', regionAbbr)` on both US and CA rinksQuery paths.
- `src/app/directory/united-states/[state]/page.tsx` — replaces `.eq('province_state', stateAbbr)` with `.or('province_state.eq.${stateAbbr},province_state.eq.${stateName}')` on the state-level rink query.

**Recovers:** 18 rinks across 9 states (Iowa 5, Nebraska 3, Alabama 3, Michigan 2, Wisconsin 1, North Dakota 1, Illinois 1, South Dakota 1, Ohio 1) that were tagged with `province_state='Iowa'` instead of `'IA'`.

**Why:** CA was checked separately — no full-name tagged CA rinks exist. So province route does NOT need this fix. Skipped to avoid scope creep.

### Fix 3 — `slugToTitle` apostrophe/period handling

**File:** `src/lib/city-page.ts` — new `CITY_NAME_OVERRIDES` map (4 entries) + `resolveCityName()` helper.

**Entries:**
- `coeur-d-alene` → "Coeur d'Alene" (ID)
- `sault-ste-marie` → "Sault Ste. Marie" (MI)
- `st-cloud` → "St. Cloud" (MN)
- `st-louis` → "St. Louis" (MO)

**Files updated to use `resolveCityName` instead of `slugToTitle`:**
- `src/app/directory/united-states/[state]/[city]/page.tsx` (2 call sites)
- `src/app/directory/united-kingdom/[city]/page.tsx` (2 call sites)

**Recovers:** 4 URLs that 404'd because `slugToTitle('st-cloud')` → `'St Cloud'` (no period), but DB had `city='St. Cloud'` (with period). `ilike '%St Cloud%'` did not match `'St. Cloud'`.

**Pragmatic note:** Hardcoded map of 4 entries. Alternative would have been a generic reverse-slugification strategy, but that risks incorrect matches (e.g., `st-cloud` could mean MN or FR). Verified only 5 US cities have apostrophe/period in their name — 4 of those are the broken URLs, 1 is `South St. Paul` (MN) which slugifies to `south-st-paul` and isn't currently broken.

### Fix 4 — Sitemap filter against team_workspaces

**File:** `src/app/sitemap.ts` — new fetch for `team_workspaces` slugs + filter on `filteredTeams`.

**Change:** Added `teamWorkspacesResult` fetch before the existing parallel Promise.all. Filter logic changed from `isHighQualityTeam(t)` to `isHighQualityTeam(t) && workspaceSlugs.has(t.slug)`.

**Eliminates:** 486 team URLs from the sitemap. Each of those URLs would 404 at the page handler (which reads from `team_workspaces`, not `teams`).

**Why filter sitemap instead of fixing page handler:** The team page is designed around the workspace concept (team_news, team_results, team_events, team_members — all things that require a claimed/managed team). Only 1 active workspace exists today (`cebu-ice-datus-test`). So the page 404 isn't a bug — it's correct behavior for unclaimed teams. The fix is to stop the sitemap from emitting URLs for teams that don't have a workspace.

## Affected files

| File | Lines | Fix |
|---|---|---|
| `src/lib/city-page.ts` | +30 / −6 | 1, 2, 3 |
| `src/app/sitemap.ts` | +18 / −1 | 4 |
| `src/app/directory/united-states/[state]/page.tsx` | +5 / −1 | 2 |
| `src/app/directory/united-states/[state]/[city]/page.tsx` | +3 / −3 | 3 |
| `src/app/directory/united-kingdom/[city]/page.tsx` | +3 / −3 | 3 |

Net: +59 / −14 lines.

## Total SEO impact

- **+11 URLs from 404 → 200**: 7 Utah cities (Bug A) + 4 apostrophe/period cities (Bug B).
- **+18 rinks newly visible** across 9 US states (defensive OR clause).
- **-486 team URLs** removed from sitemap (Bug 4).
- **Net GSC impact:** ~507 fewer 404 errors in Search Console, 11 more indexable URLs, plus 18 mis-tagged rinks now surface in state/city views.

## Verification (already run)

1. ✅ `npx tsc --noEmit --skipLibCheck` exit 0
2. ✅ `pnpm run build` exit 0 (no new errors, all static pages still build)
3. ⏳ Live URL spot-checks (post-deploy)

## Rollback plan

Single commit on `main`. Revert:
```bash
cd /root/.openclaw/workspace/rinkstop-platform
git revert HEAD --no-edit
git push origin main
```

Vercel redeploys the previous commit in ~30 seconds. Reverting restores:
- `ututah` typo → all 7 Utah city URLs back to 404
- `applyRegionTag` removed → 18 mis-tagged rinks back to invisible
- `resolveCityName` reverted to `slugToTitle` → 4 apostrophe/period city URLs back to 404
- Sitemap filter removed → 486 team URLs back in sitemap

## Must-keep-working audit checklist

Spot-check these on production AFTER deploy to confirm no regressions:

1. `/directory/united-states/new-york` (state page, working before) — should still load, NY state counts unchanged.
2. `/directory/canada/ontario` (province page, working before) — should still load, ON counts unchanged.
3. `/directory/united-states/new-york/new-york` (city page, working before) — should still load.
4. `/directory/locations/switzerland/luzern` (locations route from Tier 1c) — should still load (tested in 0472988).
5. `/directory/united-kingdom/london` (UK route) — should still load.
6. Sitemap `/sitemap.xml` — should still return 200, team count should be dramatically lower (was ~2,200, now ~1).
7. `/directory/united-states/california` — already curated, should still show LA/Anaheim/SJ, NOT Vegas/Seattle (verified in 0472988).

## Files NOT touched

- `src/app/directory/canada/[province]/page.tsx` — no full-name CA rinks in DB, defensive OR not needed.
- `src/app/directory/teams/[slug]/page.tsx` — page handler reads from team_workspaces by design; not a bug.
- `src/app/sitemap.ts` team_workspaces join alternative — the filter is the right fix; no need to migrate data.