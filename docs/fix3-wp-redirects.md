# Fix 3 Prep — Legacy WordPress URL 301 redirects

**Date:** 2026-07-08
**Owner:** KiloClaw
**Status:** Prepared, Arnel explicit go #35886

## Goal
Stop 404'ing the legacy WordPress URLs (`/index.php/*`) that Google still
has indexed from the old site. Pass any residual link equity through 301
redirects to current RinkStop pages.

## Verified state (2026-07-08)
- All 4 `/index.php/*` paths return clean 404 (no WordPress ghost running)
- `/sitemap.xml` is already clean — contains zero `/index.php/*` entries
- `/contact`, `/news`, `/terms`, `/pricing` all exist + return 200
- `next.config.js` already has a working `async redirects()` block with
  precedent: `/scores → /directory/games`, `/draft/[year] → /draft/nhl/[year]`,
  `/directory/czechia → /directory/czech-republic`, etc. Same pattern.

## Redirects to add (8 entries)

| Old path | New path | Status |
|---|---|---|
| `/index.php/news` | `/news` | 301 |
| `/index.php/news/` | `/news` | 301 |
| `/index.php/news/:path*` | `/news` | 301 |
| `/index.php/store` | `/pricing` | 301 |
| `/index.php/store/` | `/pricing` | 301 |
| `/index.php/store/:path*` | `/pricing` | 301 |
| `/index.php/contacts-us` | `/contact` | 301 |
| `/index.php/contacts-us/` | `/contact` | 301 |
| `/index.php/contacts-us/:path*` | `/contact` | 301 |
| `/index.php/terms-and-conditions` | `/terms` | 301 |
| `/index.php/terms-and-conditions/` | `/terms` | 301 |
| `/index.php/terms-and-conditions/:path*` | `/terms` | 301 |

The `:path*` catch-all catches any sub-paths under each top-level path
(handles anything indexed as `/index.php/news/some-old-article/` etc.).

## Affected files (1)
- `next.config.js` — add entries to the existing `async redirects()` array.

## NOT in this PR
- Search Console URL removal submissions (Arnel's action, not code)
- External backlink audit (Ahrefs/Search Console, not code)
- Any other 404 sources — separate audit pass

## Must-keep-working checklist (audit before merge)
- [ ] All existing redirects still resolve (sample 3 from the existing block)
- [ ] No new redirects accidentally match existing live routes
- [ ] Build exits 0
- [ ] Smoke test: curl each old URL, confirm 301 with Location header
- [ ] Smoke test: curl each new URL, confirm 200 (didn't break the target)

## Rollback plan
1 file change. `git revert HEAD` + push. Vercel redeploys in ~30s.
Old URLs return to 404 (their current state). New URLs unchanged.

## Risk
VERY LOW. Pure config addition. Vercel edge handles 301s at the CDN level
(before the Next.js handler). No code paths touched, no data layer touched.

## Audit step (after deploy)
- [ ] curl -I each old URL → expect 301 + correct Location header
- [ ] curl each new URL → expect 200
- [ ] Vercel logs: no errors on the redirect paths

## Post-deploy housekeeping (Arnel, not code)
1. Submit `/index.php/*` URL pattern to Google Search Console → URL
   Removal tool (temporary removal, 90 days). Helps Google drop them
   from the index faster than waiting for re-crawl.
2. Optional: Ahrefs/Search Console backlink audit. If anything valuable
   is pointing at `/index.php/news/some-article`, set a more specific
   redirect (not needed for the launch cleanup; revisit if backlinks
   surface).