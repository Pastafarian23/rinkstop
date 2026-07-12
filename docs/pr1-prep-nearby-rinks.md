# PR1 Prep — Nearby Rinks on Rink Detail Pages

**Date:** 2026-07-08
**Owner:** KiloClaw
**Status:** Prepared, awaiting Arnel approval

## Goal
Every rink detail page (`/directory/rinks/[slug]`) gets two new internal-link
sections so users landing on a single rink can discover the broader local
hockey scene. This is the single biggest missed internal-linking opportunity
on the site (verified 2026-07-08: rink pages had no nearby-rink cross-links,
only same-city teams and same-country leagues).

## Scope (in scope, only this)
1. **"Other rinks in {city}" section** — shown when `city` is set AND at least 1
   other rink exists in the same city (excluding the current rink). Limited to
   8 results.
2. **"More rinks in {state}" section** — shown when `province_state` is set AND
   at least 1 other rink exists in the same province/state (excluding the
   current rink AND excluding any that appeared in the city section). Limited
   to 8 results.
3. Two new parallel Supabase queries added to the existing Promise.all block.

## NOT in this PR (saved for later PRs)
- Cross-link to country page (already exists via breadcrumb)
- Cross-link to /claim-your-listing from rink page (PR2)
- "More rinks in {country}" — country-level is already covered by the leagues
  section; rinks already render via the city/state sections
- Related cities on state pages (PR4)
- "Other teams in {city}" on team detail pages (PR3)

## Affected file (1)
- `src/app/directory/rinks/[slug]/page.tsx`

## New types (local to the file)
```ts
type NearbyRink = {
  id: string;
  slug: string | null;
  name: string;
  city: string | null;
  province_state: string | null;
  country: string | null;
};
```

## New queries (parallel)
- Same city: `.from('rinks').select('id, slug, name, city, province_state, country').ilike('city', rink.city).neq('id', rink.id).eq('is_active', true).limit(8)` — only if `rink.city` is set
- Same state: same query but `.eq('province_state', rink.province_state).neq('id', rink.id).eq('is_active', true).limit(8)` — only if `rink.province_state` is set. Exclude IDs already in same-city set.

## Render order (where they go)
The existing page order is:
1. Header / breadcrumbs
2. About (blurb)
3. RinkGames
4. TEAMS IN THIS CITY (existing)
5. LEAGUES IN COUNTRY (existing)
6. PROGRAMS & AMENITIES
7. GETTING HERE
8. Details Grid
9. RinkGames
10. RinkReviews + ReviewForm

**Insertion point:** Between section 5 (LEAGUES IN COUNTRY) and section 6 (PROGRAMS). New order:
4. TEAMS IN THIS CITY
5. LEAGUES IN COUNTRY
6. **OTHER RINKS IN {city}** ← new
7. **MORE RINKS IN {state}** ← new
8. PROGRAMS & AMENITIES
9. GETTING HERE
10. Details Grid
11. RinkGames
12. RinkReviews + ReviewForm

## Conditional rendering
Both sections are gated: `if (cityRinks.length === 0) skip city section`,
`if (stateRinks.length === 0) skip state section`. A rink with no same-city
peers AND no same-state peers renders zero new sections — no empty boxes,
no layout shift.

## Visual style (matches existing patterns)
- Same dark card style: `background: 'rgba(13,17,23,0.6)'`, `border: '1px solid var(--border)'`, `borderRadius: '12px'`
- Same grid: `gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))'`
- Same link styling as the LEAGUES IN COUNTRY section
- Same "See all rinks in {city} →" footer link pattern → `/directory/rinks?city=...`

## Must-keep-working checklist (audit before merge)
- [ ] Rink detail still renders 200 for a rink with 0 same-city + 0 same-state peers
- [ ] Rink detail still renders 200 for a rink in a city with 3+ other rinks
- [ ] Rink detail still renders 200 for a rink with `is_active = false` (no change)
- [ ] RinkGames + RinkReviews + ReviewForm still render
- [ ] SEO metadata still produces correct title/description (no change to generateMetadata)
- [ ] Canonical URL still `/directory/rinks/{slug}` (no change)
- [ ] No new console errors or warnings
- [ ] Build exits 0
- [ ] Smoke test: `/directory/rinks/{slug-of-rink-with-peers}` shows the new sections

## Rollback plan
Single-file change. Revert is `git revert HEAD` + `git push origin main`.
Vercel redeploys the previous commit in ~30 seconds. Pre-existing rink
detail page behavior is restored exactly.

## Estimated risk
LOW. The change is additive: two new queries, two new optional sections.
Nothing existing changes. If the new queries fail, the sections silently
skip (length === 0 guard). The page can never regress to "worse than before"
because the new sections only render when they have data.

## Audit step (after deploy)
- [ ] curl https://rinkstop.com/directory/rinks/{slug} | grep -c "Other rinks in"
- [ ] curl https://rinkstop.com/directory/rinks/{slug} | grep -c "More rinks in"
- [ ] Watch Vercel deploy logs for 10-15 minutes post-deploy for any errors