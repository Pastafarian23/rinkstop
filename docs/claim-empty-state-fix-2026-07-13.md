# /claim-your-listing empty state audit 2026-07-13

## The funnel data

analytics_events last 30 days:
- 163 claim_search_viewed events
- 162 of them had `query_length=0, result_count=0`
- **0** claim_started events
- **0** claim_submitted events
- **0** claims in the database

The page is being hit by something (real users, SEO bots, refresh-after-focus). But no one is typing a search query. Zero claims have ever been filed.

## What's actually happening

The page handles empty-query badly:
```ts
const results = query.length >= 2 ? await searchEntities(query, type) : [];
```

When `query=""`, it renders the search form, the type tabs, and... nothing else. Visitors land on the page via organic Google traffic (keyword ranking for "claim your rink listing"), don't know what to type, and bounce.

## Plan

Add a "Featured claimable" section to `/claim-your-listing` that renders WHEN query is empty:

1. Pick the 6 most recent unclaimed rinks in popular hockey markets (Chicago, Boston, NYC, Toronto, Montreal, etc.) — verified unclaimed (`claim_type='rink' AND entity_id NOT IN (SELECT entity_id FROM claims WHERE status='approved' AND claim_type='rink')`)
2. Pick 6 most recent unclaimed teams and players
3. Render each as a card with name, location, and a single "Claim this" button
4. No new DB writes, no new tracking, no new tables — pure SELECT against existing `rinks`, `teams`, `players`, `claims` tables

This way a visitor who lands on /claim-your-listing can see "This is what claimable looks like — pick yours or search."

## Why this is the right fix

- A removes the dead-end empty state. Visitors now see what the page does before typing.
- B's post-search flow was correct. The leak isn't there.
- C's CTA chain on rink/team detail pages is correct.

The leak is between A and B: visitors never reach a search results page because they don't know what to type.

## Build order (one shippable slice)

1. Update `/claim-your-listing/page.tsx` to query for claimable rinks/teams/players when query is empty
2. Render 6 of each as cards with "Claim this" button using the existing `ClaimButton` subcomponent
3. Style these as "Featured" (not random — pre-curate for SEO markets)
4. Build, commit, deploy

## What we measure after

- `claim_started` events in the next 7 days. Pre-fix: 0. Post-fix target: at least 1 per 100 visits.

## Risks

- The "featured claimable" section could look empty if all rinks in those cities are claimed. Need to pick markets where claimable supply exists.
- Could collide with C's CTA on individual rink pages. Need to ensure /pricing?tier=business_listing deep-link works for rinks (already verified in claim-your-listing/page.tsx).

## Scope

ONE slice. One migration = 0. One new feature = the empty-state rendering. Ship, measure, iterate.
