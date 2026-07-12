# PR2 Prep — State/Province Page Claim CTA + Leagues

**Date:** 2026-07-08
**Owner:** KiloClaw
**Status:** Prepared, awaiting Arnel approval

## Goal
Every state/province page (`/directory/united-states/[state]` AND
`/directory/canada/[province]`) gets two new internal-link sections:

1. **Claim CTA strip** — visible at the top of the city list, encourages
   operators in that state to claim their listing. Currently the only path
   to /claim-your-listing is the nav footer, which is below the fold for
   the bulk of state pages. Verified 2026-07-08: state pages have NO
   claim CTA in the main content area.

2. **Top leagues in {countryName}** — re-uses the same-country leagues
   query that the rink detail page already does. Honest framing: leagues
   don't have state/province granularity in the DB (verified 2026-07-08:
   `leagues` table has `country` only, no `province_state`), so the
   correct label is "Hockey leagues in {countryName}" — the same leagues
   the rink page surfaces, just reachable from the state hub.

## Scope (in scope, only this)
1. Modify `src/components/StateProvincePageContent.tsx` to accept a new
   `topLeagues` prop and render the two new sections
2. Update `src/app/directory/united-states/[state]/page.tsx` to fetch
   top leagues and pass them as a prop
3. Update `src/app/directory/canada/[province]/page.tsx` to do the same

## NOT in this PR
- New API routes (uses existing Supabase patterns)
- City-page work (PR4)
- Team-page work (PR3)
- Filtering leagues by state (would require schema change — leagues table
  has no province_state column. Out of scope for an SEO PR.)

## Affected files (3)
- `src/components/StateProvincePageContent.tsx` — accept new prop, render
  new sections
- `src/app/directory/united-states/[state]/page.tsx` — fetch leagues, pass prop
- `src/app/directory/canada/[province]/page.tsx` — fetch leagues, pass prop

## Data fetch (added to each page)
```ts
const { data: topLeagues } = await supabase
  .from('leagues')
  .select('id, name, slug, country, level, logo_url')
  .eq('country', countryName)  // 'United States' or 'Canada'
  .eq('is_active', true)
  .limit(8);
```

This runs in parallel with the existing rink/team/city fetches — no
new round-trip cost. Same query shape as the rink detail page already uses.

## Render order (where they go in the component)
The existing component order is:
1. Breadcrumb
2. Hero (heading + intro + stats)
3. Hockey Canada Ad (Canada only, optional)
4. **Cities with Hockey in {regionName}** ← city list
5. **FAQ** accordion
6. Explore-more (only when cityCount === 0)

**New order:**
1. Breadcrumb
2. Hero (heading + intro + stats + claim CTA strip) ← claim CTA moves here
3. Hockey Canada Ad (Canada only, optional)
4. Cities with Hockey in {regionName}
5. **Top Leagues in {countryName}** ← new section, between cities and FAQs
6. FAQ accordion
7. Explore-more (only when cityCount === 0)

## Visual style (matches existing patterns)
- Same dark cards: `background: '#0f0f0f'`, `border: '1px solid #1e1e1e'`
- Claim CTA strip: red accent (uses existing `red` var #C8102E), single-row
  with prominent CTA button → /claim-your-listing
- Leagues section: same grid pattern as cities, Bebas Neue heading

## Conditional rendering
- Claim CTA: always shown (not conditional). The state page already exists;
  the funnel CTA should never be hidden.
- Leagues section: `if (topLeagues.length === 0) skip`. Defensive.

## Must-keep-working checklist (audit before merge)
- [ ] US state page renders 200 for Illinois (sample)
- [ ] Canada province page renders 200 for Ontario (sample)
- [ ] City list still renders correctly
- [ ] FAQ accordion still works
- [ ] Hockey Canada Ad still shows on Canada pages
- [ ] No new console errors / warnings
- [ ] SEO metadata unchanged
- [ ] Canonical URLs unchanged
- [ ] Build exits 0
- [ ] Smoke test: claim CTA visible on top of city list
- [ ] Smoke test: leagues section shows real data

## Rollback plan
3-file change, all additive. Revert is `git revert HEAD` + push. Vercel
redeploys in ~30 seconds. State/province pages revert to their pre-PR2
shape exactly — no other surfaces affected.

## Estimated risk
LOW. All changes are additive: new sections render below the existing
content. The leagues section is gated by length === 0 to prevent empty
boxes. The claim CTA is always shown but is a single inline `<section>`
with one button + one link — no interaction logic, no state.

## Audit step (after deploy)
- [ ] curl https://rinkstop.com/directory/united-states/illinois | grep -c "Claim your"
- [ ] curl https://rinkstop.com/directory/united-states/illinois | grep -c "Hockey leagues"
- [ ] curl https://rinkstop.com/directory/canada/ontario | grep -c "Claim your"
- [ ] curl https://rinkstop.com/directory/canada/ontario | grep -c "Hockey leagues"
- [ ] Verify league cards link to /directory/leagues/{slug}
- [ ] Verify claim CTA links to /claim-your-listing