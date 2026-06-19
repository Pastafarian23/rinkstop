# Play 2 — Programmatic SEO City Pages

## What we're building

A city-level directory page for every city in the RinkStop database that has 2+ rinks. Each page is a unique, indexable URL that ranks for "[city] hockey rinks", "[city] ice rinks", "[city] youth hockey", etc.

## The data (verified live, 2026-06-16)

- **1,858 active rinks** in the database
- **1,488 unique (city, state, country) combos**
- **230 cities** with 2+ rinks (decent content for a city page)
- **70 cities** with 3+ rinks (rich content)
- **20 cities** with 5+ rinks (premium content)

Top 5 cities: Beijing (8), Minneapolis (7), Providence (7), Oslo (7), Toronto (7), Saint Paul (7).

## URL structure

- `/directory/rinks/[city-slug]` (e.g. `/directory/rinks/chicago-il`, `/directory/rinks/toronto-on`)
- Slug format: lowercase, hyphenated, `city-state-abbrev` for US/CA, `city-country` elsewhere
- Single source of truth: a `buildCitySlug(city, state, country)` helper

## What each city page contains

1. **H1**: "12 Ice Rinks in Chicago, IL" (count-driven)
2. **Editor intro** (50-100 words): derived from rinks' notes + city context. Auto-generated but readable.
3. **List of rinks** (2-8 per page) with: name, address, capacity, type (community/arena/training), link to detail page
4. **Local teams section** (cross-link): if there are teams in this city, show top 5 with links
5. **Local leagues section**: top 3 leagues in this city/region
6. **Hockey camps & programs** (Phase 2 — link out to partner pages or generated content)
7. **CTA strip** at bottom: "Run a rink in Chicago? Claim your listing on RinkStop" with link to /pricing
8. **Cross-link footer**: "Browse all [country] rinks" / "Browse all rinks in [state/region]"

## SEO targets

- Title: "{N} Ice Rinks in {City}, {State} — Public Skating, Hockey & Figure Skating | RinkStop"
- Meta description: auto-generated with rink count + city + "Browse {N} rinks in {City} with addresses, hours, capacity, and reviews. Find public skating, hockey leagues, figure skating, and learn-to-skate programs near you."
- Canonical: absolute URL
- Open Graph: og:title, og:description, og:image (RinkStop logo)
- JSON-LD: ItemList of Place (rink) entries
- Sitemap: every city URL added to sitemap.xml with lastmod

## Implementation

- **File**: `src/app/directory/rinks/[city]/page.tsx` (Server Component)
- **Data**: query `rinks` table with `city = ? AND province_state = ? AND country = ?`, plus teams + leagues in same city
- **Caching**: `revalidate: 86400` (24h) — rink data is slow-moving
- **Static gen**: at build time, `generateStaticParams()` pre-renders all 230 city pages
- **Error handling**: 404 if city has 0 rinks (defensive)
- **No auth required**: public pages, free tier users can browse

## Effort estimate

- 1 day for the page component, queries, slug helpers, sitemap, tests
- Day 2 for editorial intro generation (50-100 word auto-blurb per city)
- Day 3 for cross-link logic (teams + leagues + camps)
- Day 4 for SEO polish (JSON-LD, OG images, internal linking)
- **Total: ~4 days of work, end-to-end. Indexable in 7-14 days. Ranking in 30-60 days.**

## Honest expected output

- 230 indexable city URLs shipped in 1 PR
- Google indexes ~50% in 14 days, ~80% in 30 days
- Organic search traffic: 50-500 visits/month at 30 days, 500-5K visits/month at 90 days
- Conversion to pricing view: 1-3% of organic traffic
- First paid conversion from SEO: 30-60 days (realistic)

## What this play does NOT do

- Won't hit $500 in 14 days (the math doesn't support it)
- Won't produce direct revenue this month
- Won't help the current "zero traffic" problem until 30+ days in
- Is the foundation for the $1K-$3K/month targets (60-90 days out)

## What I need to ship this

- Green light from Arnel (Play 2 of the proposed 4 plays)
- Nothing else. No Resend, no Supabase changes, no Stripe changes. Pure code.

## Risk: content quality

230 pages of pure programmatic content can look thin to Google. Mitigations:
- Each page has 50-100 word unique intro
- Real rink data (no placeholder text)
- Cross-linked to high-quality content (rink detail pages, team pages, league pages)
- All pages have unique title/meta/OG

If Google penalizes thin content, the failure mode is: pages don't rank, but no manual action. We can always add 1-2 sentences of editorial to any city page later.

## Recommendation: build it

This is the highest-ROI long-term play for a directory business. The 1,488 unique (city, state, country) combos are an asset we're not using. Programmatic SEO is the way to monetize that asset. Even if it produces $0 in 14 days, it produces $500-2K/month in 90 days.
