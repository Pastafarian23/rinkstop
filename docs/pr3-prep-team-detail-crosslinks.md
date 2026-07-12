# PR3 Prep — Team Detail Cross-Links (other teams + rinks in city)

**Date:** 2026-07-08
**Owner:** KiloClaw
**Status:** Prepared, awaiting Arnel approval

## Goal
Every public team profile page (`/directory/teams/[slug]`) gets two new
cross-link sections so a user landing on a single team can discover the
broader local hockey scene without navigating away:

1. **Other teams in {city}** — other public `team_workspaces` in the same
   home_city. Limited to 8.
2. **Rinks in {city}** — active `rinks` in the same city. Limited to 8.

Both gated by `length === 0` → skip.

## Why this PR (audit from 2026-07-08)
- Verified: team detail page (`PublicTeamProfile.tsx`) shows same-league
  peers (line 446) and home rink (line 432), but does NOT surface
  "other teams in {city}" or "rinks in {city}".
- The same-league cross-link is valuable for navigating within a league,
  but a user landing on a single team page via Google search has no
  obvious path to discover the broader local hockey scene. This is the
  same gap we closed for rink detail in PR1, just for teams.

## Schema (verified 2026-07-08)
- Table: `team_workspaces` (NOT `teams`). Columns used:
  `id, slug, name, home_city, home_country, country_code, is_active, visibility='public'`.
- Table: `rinks`. Columns used:
  `id, slug, name, city, province_state, country, is_active`.

The team detail page is `team_workspaces`, NOT `teams`. The earlier rink
detail used `rinks` directly — different tables. Don't conflate.

## Scope (in scope, only this)
1. Two new queries in `page.tsx` (parallel, conditional on `team.home_city`)
2. Two new sections rendered in `PublicTeamProfile.tsx` near the bottom
   of the page (after the two-column layout, before `</div>` close)
3. Pass new arrays as props from page → component

## NOT in this PR
- City-page work (PR4)
- Filtering teams by `league_id` (already covered by the same-league peers
  in the existing `TeamRelated` component for the legacy NHL client; for
  public workspaces, same-league isn't a useful filter anyway since most
  public workspaces don't have `league_id` set)
- Cross-link to "more teams in {country}" — country is too broad for a
  useful cross-link; city is the right granularity

## Affected files (2)
- `src/app/directory/teams/[slug]/page.tsx` — add 2 parallel queries,
  pass as props
- `src/app/directory/teams/[slug]/PublicTeamProfile.tsx` — accept new
  props, render 2 new sections at bottom

## New queries (parallel, both conditional on home_city)
```ts
// Other public teams in same city
const { data: cityTeams } = await supabase
  .from('team_workspaces')
  .select('id, slug, name, home_city, home_country')
  .eq('home_city', team.home_city)
  .eq('is_active', true)
  .eq('visibility', 'public')
  .neq('id', team.id)
  .limit(8);

// Active rinks in same city
const { data: cityRinks } = await supabase
  .from('rinks')
  .select('id, slug, name, city, province_state, country')
  .ilike('city', team.home_city)
  .eq('is_active', true)
  .limit(8);
```

Added to the existing Promise.all block — no new round-trip cost.

## Visual style (matches existing patterns)
- Same dark cards: `background: rgba(13,17,23,0.6)`, `border: 1px solid var(--border)`
- Same grid: `repeat(auto-fill, minmax(220px, 1fr))`
- Match the style of PR1's "Other rinks in {city}" section (consistency)

## Render order (insertion point)
Insert as a new `<section>` AFTER the closing `</div>` of the two-column
layout (`gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)'`) but BEFORE
the outermost `<div>` close. This puts the new sections at full width,
below the two-column area, matching where PR1 injected on rink pages.

## Conditional rendering
Both new sections: `if (length === 0) skip`. Same defensive pattern as
PR1. A team with no other teams and no rinks in its city renders zero
new sections — no empty boxes, no layout shift.

## Must-keep-working checklist (audit before merge)
- [ ] Team detail still renders 200 for a team with 0 other teams + 0 rinks in city
- [ ] Team detail still renders 200 for a team with multiple peers
- [ ] Recent Results / Upcoming / News sections unchanged
- [ ] Claim badge unchanged
- [ ] SEO metadata unchanged
- [ ] Canonical URL unchanged
- [ ] No new console errors / warnings
- [ ] Build exits 0
- [ ] Smoke test: pick a public team in Chicago or Boston, verify both
      new sections appear with real data

## Rollback plan
2-file change, all additive. `git revert HEAD` + push. Vercel redeploys
in ~30 seconds. Pre-PR3 behavior restored exactly.

## Estimated risk
LOW. All changes are additive. Sections only render when data exists.
The new queries both fail safely (empty array fallback). No existing
behavior changes.

## Audit step (after deploy)
- [ ] curl /directory/teams/{slug-of-team-with-peers} | grep -c "Other teams in"
- [ ] curl /directory/teams/{slug-of-team-with-peers} | grep -c "Rinks in"
- [ ] Verify cross-link targets resolve to 200
- [ ] Pick a team with no peers, confirm sections are absent