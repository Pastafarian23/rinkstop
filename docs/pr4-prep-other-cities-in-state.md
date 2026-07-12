# PR4 Prep — Other Hockey Cities in {State} on City Pages

**Date:** 2026-07-08
**Owner:** KiloClaw
**Status:** Prepared, awaiting Arnel approval (Arnel explicit go #35728)

## Goal
Every city page (US state city + Canada province city) gets a new
internal-link section: **"Other hockey cities in {region}"** — peer
cities in the same state/province that have rinks or teams.

This closes the last gap from the 2026-07-08 audit. After PR4, every
hub page type in the directory cross-links to its peers.

## Scope (in scope, only this)

1. **Add a `peerCities` array to `CityPageData`** — list of `{ name,
   slug, teamCount, rinkCount, href }` for other cities in the same
   region, sorted by total (teams + rinks) descending, limit 12.
2. **Add a new section** to `CityPageContent.tsx` rendering the peer
   cities as a grid of clickable cards. Conditional: skip when
   `peerCities.length === 0`.
3. **Insertion point**: between the "Pro Team Cross-Reference" section
   and the FAQ section. Falls between user-facing navigation sections
   and the structured FAQ — natural reading position.

## NOT in this PR

- "Other cities in {country}" cross-link — too broad, not useful
- Schema.org ItemList of cities (could be added later as SEO juice)
- Changing the existing Explore More section
- Filter logic beyond "same country + same region + is_active + city
  exists in directory"

## Affected files (2)

- `src/lib/city-page.ts` — extend `getCityPageData` to fetch peer cities
- `src/components/CityPageContent.tsx` — accept `peerCities` prop,
  render new section

## Query (added to existing `Promise.all` block in getCityPageData)

```ts
// Peer cities: other cities in the same region with at least 1 rink
// or team. Sort by total count desc, limit 12.
const { data: peersData } = await Promise.all([...]); // existing block

// New: peer cities query, also in parallel with the existing block.
```

Implementation note: the existing block fetches rinks filtered by city.
For peers, I need to query distinct cities in the same region. Best
approach:

```ts
// Rinks grouped by city in this region (excluding current city)
const { data: peerRinks } = await supabase
  .from('rinks')
  .select('city, country, province_state')
  .eq('country', countryName)
  .neq('city', cityName)
  .is('city', null) // reversed: actually .not('city', 'is', null)
  .eq('is_active', true)
  .limit(500); // over-fetch, dedupe in JS
// Then group by city, attach region filter in JS, dedupe, sort
```

Or — simpler, two small queries:

```ts
const { data: peerRinks } = await supabase
  .from('rinks')
  .select('city')
  .eq('country', countryName)
  .eq('is_active', true)
  .not('city', 'is', null)
  .neq('city', cityName);
if (regionAbbr || regionName) {
  const orClause = `province_state.eq.${regionAbbr || regionName},province_state.eq.${regionName || regionAbbr}`;
  peerRinksQuery = peerRinksQuery.or(orClause);
}
// Same pattern for teams — aggregate in JS to get counts per city
```

Then in JS: build a Map<city, { teamCount, rinkCount, href }>, sort,
slice to 12.

## Render output (skeleton)

```tsx
{peerCities.length > 0 && (
  <section style={{ ... }}>
    <h2>Other hockey cities in {regionName}</h2>
    <p>{peerCities.length} other {regionName} cities in the RinkStop directory...</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
      {peerCities.map(c => (
        <Link key={c.slug} href={c.href} style={...}>
          <div>{c.name}</div>
          <div>{c.rinkCount} rinks · {c.teamCount} teams</div>
        </Link>
      ))}
    </div>
  </section>
)}
```

## Conditional rendering

- Skip if `peerCities.length === 0` (defensive — no empty boxes)
- Skip the query entirely if no region context (`!regionAbbr &&
  !regionName`). International/non-state pages don't get peer-city lists.

## Must-keep-working checklist (audit before merge)

- [ ] City page still renders 200 for a US city with peers (e.g. /united-states/il/chicago)
- [ ] City page still renders 200 for a CA city with peers (e.g. /canada/on/toronto)
- [ ] City page still renders 200 for an international city with no region context
- [ ] Empty-state ("no hockey found in {city}") still renders correctly
- [ ] SEO metadata unchanged
- [ ] Canonical URL unchanged
- [ ] Build exits 0
- [ ] Smoke test: curl a city page with peers, verify new section present

## Rollback plan

2-file change. `git revert HEAD` + push. Vercel redeploys in ~30
seconds. City pages revert to their pre-PR4 shape exactly.

## Estimated risk

LOW. All changes are additive. The new query is in parallel with
existing fetches (no new round-trip cost). The new section is
conditional (length === 0 → skip). No existing behavior changes.

## Audit step (after deploy + runtime check)

- [ ] curl /directory/united-states/il/chicago | grep "Other hockey cities in Illinois"
- [ ] curl /directory/canada/on/toronto | grep "Other hockey cities in Ontario"
- [ ] Verify cross-link targets resolve to 200 (e.g. chicago → /directory/united-states/il/chicago)
- [ ] Verify section is absent for cities with no peers in their region
- [ ] Visual smoke test: section styled like PR1/PR3 (same dark-card pattern)