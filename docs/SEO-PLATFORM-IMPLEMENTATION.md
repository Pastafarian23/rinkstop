# RinkStop SEO Platform — Implementation Plan

**Goal:** Transform RinkStop from directory into high-authority programmatic SEO platform

---

## PHASE 1 — Content Depth Improvements

### 1A. Country Page Content
- Add 300-600 word intros to all `/hockey/{country}` pages
- Include: hockey popularity, notable leagues, major cities, rink counts, player development
- Link structure to city pages and league pages

### 1B. City Page Content
- Add 250-500 word city hockey overviews to `/hockey/{country}/{city}`
- Target "ice rinks in {city}", "hockey in {city}", "learn hockey {city}"
- Include: public skating, beginner info, youth hockey, nearby suburbs

### 1C. Rink Page Content
- Add structured content blocks to `/rinks/{country}/{city}/{rink}`
- Amenities, parking, seating, public skate, stick & puck, learn-to-play
- Nearby restaurants/hotels, local teams, related rinks

---

## PHASE 2 — Contextual Internal Linking

### 2A. Contextual Link Rules
- Inline links to related entities within page copy
- Auto-mention and link: teams, leagues, nearby rinks, cities

### 2B. Bidirectional Entity Graph
- Rink ↔ Team links (both directions)
- City ↔ Rink links
- League ↔ Teams links
- Create crawl loops for better indexing

---

## PHASE 3 — Topical Authority Hubs

### 3A. NHL Hub (`/nhl`)
- Teams, arenas, standings, history, beginner guides, featured players

### 3B. City Hockey Hubs
- `/chicago-hockey`, `/toronto-hockey`, `/boston-hockey`, etc.
- Local rinks, leagues, youth hockey, public skate

### 3C. Learn Hockey Hub (`/learn`)
- `/learn/hockey-rules`, `/learn/hockey-positions`, `/learn/how-to-skate`, `/learn/hockey-equipment`
- E-E-A-T building for beginner searches

---

## PHASE 4 — Freshness Signals

### 4A. Recent Activity Modules
- Homepage + hub pages show: recently added rinks, latest teams, upcoming tournaments

### 4B. Auto "Last Updated" Timestamps
- Display on all pages to improve freshness trust signals

---

## PHASE 5 — Programmatic SEO Landing Pages

### 5A. Best Rinks Pages
- `/best-ice-rinks-in-{city}` — generate for top 50 cities
- `/best-hockey-rinks-in-{city}`

### 5B. "Near Me" Search Pages
- `/ice-rinks-near-me`
- `/public-skate-near-me`
- `/stick-and-puck-near-me`

---

## PHASE 6 — Schema Markup

### 6A. Required JSON-LD
- SportsActivityLocation + LocalBusiness for rinks
- SportsTeam for team pages
- Organization for league pages
- BreadcrumbList for all pages

---

## PHASE 7 — Content Distribution Engine

### 7A. Article Strategy
- Daily: city rink guides, beginner guides, NHL articles, "best of" lists
- Each article links to directory pages

### 7B. Internal Funnel
- Article → city page → rink page
- Article → team page → league page

---

## PHASE 8 — Homepage Repositioning

### 8A. Hero Section
- "Find hockey rinks, teams, leagues, players, and public skate sessions worldwide."

### 8B. Featured Content Blocks
- Trending cities, featured rinks, latest articles, popular leagues

---

## IMPLEMENTATION PRIORITY

| Priority | Task | Impact |
|----------|------|--------|
| 1 | Country/City/Rink content templates | SEO depth |
| 2 | Schema markup (all entities) | Rich snippets |
| 3 | NHL Hub page | Topical authority |
| 4 | Learn Hub page | E-E-A-T |
| 5 | Contextual linking engine | Link equity |
| 6 | Best rinks programmatic pages | Long-tail traffic |
| 7 | Freshness modules | Crawl frequency |
| 8 | Homepage repositioning | User engagement |

---

## STATUS

- [x] Implementation Plan created
- [ ] Phase 1: Content templates (in progress)
- [ ] Phase 2: Linking engine
- [ ] Phase 3: Hub pages
- [ ] Phase 4: Freshness
- [ ] Phase 5: Programmatic pages
- [ ] Phase 6: Schema
- [ ] Phase 7: Article funnel
- [ ] Phase 8: Homepage