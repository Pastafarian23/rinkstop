# RinkStop SEO URL Structure — SPEC

## Goal
Transform the RinkStop hockey directory into a scalable, SEO-optimized URL architecture with full internal linking between countries, cities, leagues, teams, and rinks.

---

## PHASE 1: New Route Structure

### Routes to CREATE (new files):
```
src/app/
  hockey/
    [country]/
      page.tsx              → /hockey/{country}
      [city]/
        page.tsx            → /hockey/{country}/{city}
  rinks/
    [country]/
      [city]/
        [rink]/
          page.tsx          → /rinks/{country}/{city}/{rink}
  teams/
    [country]/
      [league]/
        [team]/
          page.tsx          → /teams/{country}/{league}/{team}
  leagues/
    [country]/
      [league]/
        page.tsx            → /leagues/{country}/{league}
  search/
    page.tsx                → /search
    rinks/
      page.tsx              → /search/rinks
    teams/
      page.tsx              → /search/teams
```

### Routes to KEEP (legacy, for backward compat):
- `/directory` — directory hub
- `/directory/rinks/[id]` — rink by slug (existing)
- `/directory/teams/[slug]` — team by slug (existing)
- `/directory/{country}` — country page (existing)
- `/directory/countries` — countries list (existing)
- `/directory/nhl`, `/directory/pwhl`, etc. — league shortcuts

---

## PHASE 2: URL Normalization Rules

### Slug format
- All lowercase, hyphen-separated
- Examples: `chicago-blackhawks`, `united-states`, `united-center`
- No special characters, no spaces

### Pattern
```
/hockey/{country}              → e.g., /hockey/united-states
/hockey/{country}/{city}       → e.g., /hockey/united-states/chicago
/rinks/{country}/{city}/{rink} → e.g., /rinks/united-states/chicago/united-center
/teams/{country}/{league}/{team} → e.g., /teams/united-states/nhl/chicago-blackhawks
/leagues/{country}/{league}    → e.g., /leagues/united-states/nhl
```

---

## PHASE 3: Internal Linking System

### Country Page (`/hockey/{country}`)
- List all cities in country (each linking to `/hockey/{country}/{city}`)
- List all leagues in country
- List top/featured teams
- List featured rinks
- "Explore Country" → related countries

### City Page (`/hockey/{country}/{city}`)
- Primary: list all rinks in city (linking to `/rinks/{country}/{city}/{rink}`)
- List teams based in city (linking to `/teams/{country}/{league}/{team}`)
- Breadcrumb: Home → /hockey/{country} → {city}
- "Nearby cities" section

### Rink Page (`/rinks/{country}/{city}/{rink}`)
- Home rink link for teams playing here
- City page link (`/hockey/{country}/{city}`)
- Country page link (`/hockey/{country}`)
- Teams that play at this rink (linking to `/teams/{country}/{league}/{team}`)
- "More rinks in {city}" section
- "More rinks in {country}" section
- Search link to find more rinks

### Team Page (`/teams/{country}/{league}/{team}`)
- League page link (`/leagues/{country}/{league}`)
- Home rink page link (if exists)
- Country page link (`/hockey/{country}`)
- Other teams in same league
- Rink the team plays at

### League Page (`/leagues/{country}/{league}`)
- All teams in league
- Country page link
- Standings (if available)

---

## PHASE 4: SEO Content Rules

### H1 patterns
- Country: "{Country} Hockey" — e.g., "United States Hockey"
- City: "Hockey in {City}" — e.g., "Hockey in Chicago"
- Rink: "{Rink Name} — {City}, {Country}"
- Team: "{Team Name} | {League}" — e.g., "Chicago Blackhawks | NHL"
- League: "{League Name} ({Country})" — e.g., "NHL (United States)"

### Meta description patterns
- Country: "Find hockey teams, rinks, and leagues in {country}. The complete {country} hockey directory."
- City: "Ice rinks, hockey teams, and leagues in {city}, {country}."
- Rink: "Hockey at {rink name} in {city}, {country}. Teams, games, schedules."
- Team: "{team name} roster, schedule, and home arena information."

### Required page sections (minimally):
1. Breadcrumb
2. H1 + intro paragraph (150-300 words)
3. Entity listings with internal links
4. "Explore more" footer links (min 3)

---

## PHASE 5: Chicago Example (Only Valid Dataset)

### URL mapping
```
/hockey/united-states                          → USA country page
/hockey/united-states/chicago                  → Chicago city page

/rinks/united-states/chicago/united-center     → United Center rink page
/rinks/united-states/chicago/madison-square-garden → (if data exists)

/teams/united-states/nhl/chicago-blackhawks     → Chicago Blackhawks
/teams/united-states/nhl/detroit-red-wings      → Detroit Red Wings

/leagues/united-states/nhl                     → NHL (USA)
/leagues/united-states/ncaa                    → NCAA
```

### Internal links for Chicago
```
/hockey/united-states/chicago →
  /rinks/united-states/chicago/united-center (Chicago Blackhawks home rink)
  /teams/united-states/nhl/chicago-blackhawks
  /leagues/united-states/nhl
  /hockey/united-states (country page)
```

```
/rinks/united-states/chicago/united-center →
  /hockey/united-states/chicago (city page)
  /hockey/united-states (country page)
  /teams/united-states/nhl/chicago-blackhawks (home team)
  /rinks/united-states/chicago/madison-square-garden (related rink)
```

```
/teams/united-states/nhl/chicago-blackhawks →
  /leagues/united-states/nhl (league page)
  /rinks/united-states/chicago/united-center (home rink)
  /hockey/united-states (country page)
  /teams/united-states/nhl/detroit-red-wings (related team)
```

---

## PHASE 6: Scalability Rules

1. **Auto-slug generation** — when a rink/team/league is created in Supabase, a slug is auto-generated from the name
2. **Slug uniqueness** — scoped per entity type (e.g., two teams can't have the same slug)
3. **No orphan pages** — every new page immediately gets links from at least: city page, country page, search index
4. **Bidirectional links** — if A links to B, B links back to A (where relationship exists)
5. **Breadcrumbs on every page** — Home > Country > City > Rink (or equivalent)
6. **hreflang for multi-country** — for leagues/teams spanning countries

---

## Implementation Order

1. Create `/hockey/[country]/page.tsx` + `[city]/page.tsx`
2. Create `/rinks/[country]/[city]/[rink]/page.tsx`
3. Create `/teams/[country]/[league]/[team]/page.tsx`
4. Create `/leagues/[country]/[league]/page.tsx`
5. Create `/search/page.tsx`
6. Add internal links to existing country pages (`/directory/{country}`)
7. Update country/city pages to cross-link to new structure
8. Add "Explore more in {country}" links to rink/team pages