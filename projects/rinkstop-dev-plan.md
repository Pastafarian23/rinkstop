# RinkStop Development Plan — Post Model Upgrade
**Status:** Ready to execute after switching to Claude Sonnet 4.5
**Created:** 2026-05-13

---

## Priority 1: Fix & Complete Core Features

### 1.1 — Load Ice Rinks Data into Supabase
- **Current state:** 30+ arenas documented in `rinkstop-ice-rinks-directory.md` but NOT in the database
- **Action:** Write a migration/seed script to import all rinks into the `rinks` table
- **Includes:** Name, address, city, country, capacity, ice_size, surface_type, website, coordinates where available
- **Tables to populate:** `rinks`, `leagues`, `teams` (link teams to rinks and leagues)
- **Goal:** Directory is browseable on the live site

### 1.2 — Verify All Admin CRUD Pages Work
- Test: leagues, teams, players, rinks, brands, fixtures, blog
- Fix any routing issues, form bugs, or Supabase query errors
- Ensure Row Level Security policies are correct

### 1.3 — CoachBoard.pro & Scoresheet.pro
- **Current state:** Mentioned in status docs but no code in the platform
- **Decision needed:** Are these separate apps/domains, or features within the RinkStop Next.js app?
- **Minimum viable:** 
  - CoachBoard: A canvas/drawing tool for hockey drill diagrams (SVG or canvas-based)
  - Scoresheet: A digital scoresheet with timer, penalties, shots on goal tracking, PDF export

---

## Priority 2: Frontend Polish & UX

### 2.1 — Homepage Redesign
- Current: Basic Next.js landing page
- Goal: Professional directory feel — featured rinks, latest blog posts, search bar, league spotlight
- Design inspiration: IMDB meets sports directory

### 2.2 — Search & Filtering
- Global search across players, teams, leagues, rinks
- Filters: country, league level, ice size, position (for players)
- Autocomplete / instant search with debounce

### 2.3 — Responsive Design Audit
- Mobile-first check on all directory pages
- Card layouts for teams/players/rinks

### 2.4 — Player Profiles
- Bio, stats, headshot, team history
- Stats per season view

### 2.5 — League Pages
- Standings table, upcoming fixtures, recent results
- Linked teams

---

## Priority 3: Monetization Integration

### 3.1 — Ad Placement (AdSterra or similar)
- Banner placements: header, sidebar, between content
- Native ads within directory listings
- Responsive ad units

### 3.2 — Premium Listings
- Teams/rinks/players can pay for featured placement
- Admin toggle for "featured" status
- Stripe integration for payments

### 3.3 — Affiliate Gear Links
- Hockey equipment brands linked to affiliate programs
- "Buy this stick" / "Get this gear" CTAs on player/brand pages

### 3.4 — Stepdad's Risk Management Funnel
- Landing page on SativaExchange linking to risk management services
- Lead capture form → email nurture → consultation booking

---

## Priority 4: Content & SEO

### 4.1 — Blog System
- Already functional: 4 published posts in Supabase
- Add: categories, related posts, author bios, comment system (or Disqus)
- Schedule: 3-5 posts/week across all Arnel projects

### 4.2 — SEO Optimization
- Meta tags per page (already in schema, need to render in `<head>`)
- Sitemap.xml generation
- OpenGraph / Twitter Card meta for social sharing
- robots.txt

### 4.3 — Social Media Integration
- Auto-pull latest posts for social sharing
- OG images for each directory listing

---

## Priority 5: App Store Publishing (CoachBoard & Scoresheet)

### 5.1 — Web App First
- Make CoachBoard and Scoresheet work as PWA (Progressive Web App)
- Offline capability for scoresheet

### 5.2 — Mobile Wrappers
- Capacitor or similar to wrap web app for iOS/Android
- Or: native React Native build if performance demands it

---

## Technical Stack
- **Frontend:** Next.js 15 (already set up) + Tailwind CSS
- **Database:** Supabase (PostgreSQL) — already configured
- **Auth:** Supabase Auth (admin panel)
- **API:** Supabase REST API + Row Level Security
- **Hosting:** Vercel (already configured in `.vercel/`)
- **CMS:** Supabase tables (no external CMS needed)

---

## Notes
- All code lives in `/root/.openclaw/workspace/rinkstop-platform/`
- Team agents defined in `/root/.openclaw/workspace/dropbox-setup/RinkStop/`
- After model switch, start with Priority 1.1 (data import) and 1.2 (bug fixes)
- Keep Arnel's voice/tone in all user-facing content