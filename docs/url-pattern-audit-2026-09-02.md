# URL Pattern Audit — 2026-09-02

## Summary

Total URLs analyzed: **5,423**
- 7 sub-sitemaps (sitemap index entries)
- 5,416 actual page URLs (rinks, teams, players, leagues, news, locations, static)

## Length Distribution

| Metric | Value |
|---|---|
| Average URL length | 62.9 chars |
| Median | 60 chars |
| Max | 114 chars |
| Over 75 chars (Bing's soft cap) | 793 (14.6%) |
| Over 100 chars | 208 (3.8%) |
| Over 150 chars | 0 (0.0%) |

## URL Pattern Issues

| Issue | Count | % | Severity |
|---|---|---|---|
| URLs > 75 chars | 793 | 14.6% | ⚠️ Medium |
| Hex hash suffix (dedup markers) | 605 | 11.2% | ⚠️ Medium |
| Year+date pattern in news URLs | 300 | 5.5% | ℹ️ Low (intentional) |
| Score pattern (X-Y) in news URLs | 300 | 5.5% | ℹ️ Low (intentional) |
| Numeric game ID suffix | 172 | 3.2% | ❌ High |
| Unicode chars in directory URLs | 30 | 0.6% | ⚠️ Medium |
| URLs < 30 chars (might be too generic) | 12 | 0.2% | ℹ️ Low |

## Examples of Problem URLs

### Numeric game ID (172)
- `/news/montr-al-canadiens-new-jersey-devils-4-3-saturday-april-4-2026-2025021212`
- `/news/new-jersey-devils-detroit-red-wings-5-3-saturday-april-11-2026-2025021265`
- These 10-digit IDs at the end are Highlightly game IDs — they're useful for API lookups but bad for SEO

### Hex hash (605)
- `/directory/locations/belarus/minsk-220069`
- `/directory/locations/india/new-delhi-110070`
- These look like hash suffixes but are actually ZIP codes (Belarus 220069, India 110070, 122001)

### Score pattern + hex (300 news URLs)
- `/news/slovakia-sweden-4-2-2026-05-26-54`
- `/news/colorado-eagles-chicago-wolves-2-3-2026-06-02-1029052`
- The hex is the Highlightly game ID, hidden by an `-` separator

## Recommended Actions

### P0: Numeric game IDs in news URLs (172)
The 10-digit Highlightly game ID at the end adds nothing to the URL's SEO value. Two options:
1. **Drop the game ID** — use a slug based on team names + date only
2. **Add canonical rewriting** — `/news/{team-a}-vs-{team-b}-{score}-{YYYY-MM-DD}` to `/news/{team-a}-{team-b}-{score}-{YYYY-MM-DD}-{id}` to keep IDs in DB but URLs clean

This is a structural change to the news URL schema. Requires:
- 301 redirects from old URLs to new
- Updated sitemap
- Updated canonical tags

### P1: Hex hashes in directory URLs (605)  
- These are mostly ZIP codes mistakenly flagged. Real false-positive rate is low. No action needed.
- But for the `/news/{id}` suffixes, see P0 above.

### P2: Unicode in directory URLs (30)
- Bings handles Unicode in URLs fine (RFC 3987). No action needed.
- For ranking purposes, no measurable impact.

### P3: URLs over 75 chars (793)
- Bing's soft cap. Over 75 chars can hurt CTR in SERPs.
- The longest are rink name + city + state paths. Hard to shorten without losing descriptive value.
- **Suggestion:** Add display:url breadcrumbs in SERPs (via schema) so users see friendly paths.

## What We Don't Have

- **No redirects from non-canonical to canonical** — every page is self-canonical, so this is fine.
- **No uppercase URLs** — all lowercase.
- **No session IDs in URLs** — clean.
- **No excessive parameters** — all clean.
- **All HTTPS** — yes.

## Action Items

- [ ] **P0**: Strip Highlightly game IDs from news URLs (requires schema change)
- [ ] **P1**: Review the 12 short URLs (likely category landing pages — fine)
- [ ] **P2**: Verify the 30 Unicode URLs decode properly in Bing's crawler
- [ ] **P3**: Consider adding breadcrumb display to Bing SERPs

## Re-run Audit

```bash
node /root/.openclaw/workspace/rinkstop-platform/scripts/url-pattern-audit.mjs
```
