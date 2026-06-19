# Play 3 — Free Public Tools (SEO ranking bait)

## The theory

Free tools are the single highest-ROI SEO play for a directory. Why:
- They rank for very specific, intent-rich queries ("hockey cost calculator", "youth hockey cost", "ice time cost near me")
- Parents, players, and coaches search for these every day
- Each tool links back to the directory and to /pricing
- Each tool is unique content Google rewards
- Compounding: a good tool ranks for years, not weeks

## 3 tools I'd build (in order)

### Tool 1: Hockey Cost Calculator
**URL**: /tools/hockey-cost-calculator
**What it does**: User inputs their kid's age, level (house/select/travel), region, and the calculator shows estimated annual cost: registration, ice time, equipment, travel, tournaments.
**Why it ranks**: "hockey cost per year", "travel hockey cost", "youth hockey cost", "ice hockey expenses", "is hockey expensive".
**Monetization**: CTA at the end: "Find rinks and teams in your area" → /directory/rinks
**Data source**: Internal estimates from public data (USA Hockey annual surveys, regional cost-of-ice-time data).
**Effort**: 2 days. Pure client-side, no auth.
**Search volume estimate**: 2K-10K/month for "hockey cost" terms.

### Tool 2: Find a Hockey Camp Near You
**URL**: /tools/hockey-camps
**What it does**: User inputs city/state or uses geolocation, sees a list of hockey camps and clinics in their area (or nearest available) with dates, ages, costs.
**Why it ranks**: "hockey camps near me", "youth hockey camps 2026", "hockey clinics [city]", "summer hockey camps".
**Monetization**: Camp providers pay to feature / claim their camp. (New revenue stream!) "List your camp on RinkStop" CTA.
**Data source**: We have leagues and rinks already. We can seed camp data from public listings or scrape-and-list hockey camp aggregators.
**Effort**: 3-4 days (geolocation, data ingestion, filtering UI, claim flow).
**Search volume estimate**: 5K-50K/month for "hockey camps [year]" terms.

### Tool 3: Rink Capacity & Features Lookup
**URL**: /directory/rinks/capacity (or /tools/rink-finder)
**What it does**: Filter rinks by capacity range, ice size, surface type, country, city. Sort by capacity. Useful for booking events, planning tournaments, picking a practice facility.
**Why it ranks**: "hockey rink capacity", "largest hockey rinks", "NHL size rinks near me", "ice rink by size".
**Monetization**: "Run a rink? Add your facility" CTA → /add-listing
**Data source**: Already in our rinks table (capacity, ice_size, surface_type columns).
**Effort**: 1-2 days. Mostly a fancy filter UI on existing data.
**Search volume estimate**: 1K-5K/month for capacity / size queries.

## My pick: Start with Tool 1 (Hockey Cost Calculator)

Lowest effort (2 days), highest search intent (parents actively comparing costs), cleanest monetization path (parent → rink/team finder → claim). No external data needed. Pure client-side React form with realistic cost estimates.

## Effort + revenue estimate

- **Tool 1**: 2 days. Expected: 100-1,000 monthly visits at 30 days, 1K-5K at 90 days. 1-3% CTR to directory. Maybe $0-50 direct revenue in first 30 days.
- **Tool 2**: 4 days. Expected: 200-2,000 monthly visits at 30 days, 5K-20K at 90 days. Camp-listing revenue is speculative.
- **Tool 3**: 2 days. Expected: 50-500 monthly visits at 30 days, 500-2K at 90 days. Mostly supports the directory.

## Combined output (all 3 tools shipped)

- ~8 days of work
- 3 unique indexable tools, each with 5-20 unique entry keywords
- 350-3,500 monthly visits at 30 days
- 2K-25K monthly visits at 90 days
- Direct revenue: $0-200 in 30 days, $200-2,000 in 90 days
- Compounds forever (a good tool ranks for years)

## What I need

- Green light from Arnel (Play 3 of the proposed 4 plays)
- No external dependencies. No Resend, no Supabase changes.

## Risk: thin content / over-promised utility

Tools that are thinly disguised lead forms get penalized. The tools must be ACTUALLY USEFUL — not a calculator that asks for an email before giving you the answer. They must:
- Give a real, useful answer before any CTA
- Have unique value (not a generic "hockey cost is between $X and $Y")
- Be self-contained (no auth required to use)

If the tools are bad, they don't rank and they don't convert. If they're good, they become the highest-traffic pages on the site within 6 months.
