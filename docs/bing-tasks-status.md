# Bing + Microsoft News — Task Status (2026-09-02)

## Status

| # | Task | Owner | Status | Time | Blocker |
|---|---|---|---|---|---|
| 1 | Register IndexNow key in BWT (Settings → API access → IndexNow) | USER | in_progress | 1 min | — |
| 2 | Submit 8 sub-sitemaps in BWT UI | USER | pending | 3 min | BWT UI |
| 3 | Fetch as Bingbot on 20 top pages | USER | pending | 5 min | BWT UI |
| 4 | Build indexnow-auto-ping script | ME | **DONE** | 30 min | — |
| 5 | Microsoft News Partner Program application packet | ME | **DONE** | 2 hr | — |
| 6 | MSN-readiness audit of top 50 articles | ME | in_progress | 1 hr | need user input on findings |
| 7 | URL pattern audit | ME | pending | 30 min | — |
| 8 | Image sitemap generation | ME | pending | 1 hr | — |
| 9 | Alt-text audit script | ME | pending | 1 hr | — |
| 10 | BWT block-parameters config | ME | check first (read-only API) | 15 min | — |
| 11 | Bing Places claim | USER | pending | 10 min | BWT UI |
| 12 | Internal API endpoint for auto-ping on deploy | ME | **DONE** (`/api/indexnow`) | 1 hr | needs user to wire Vercel deploy hook |
| 13 | Geo-targeting in BWT | USER | pending | 1 min | BWT UI |
| 14 | Verify Bingbot CSS/JS rendering | ME | pending | 15 min | — |

## Shipped this session

1. **`/hockey-database` page live** (committed in 5ac5d8e2, deployed via dpl_3S6xYHkWddU9Yv7nVE9rEG7dcxo6)
   - 200 OK, 88KB body
   - FAQPage + BreadcrumbList + WebPage schema
   - Internal cross-links to /directory, /data-coverage, /data-methodology
2. **`/sitemap-static.xml` updated** with /hockey-database + /data-coverage entries
3. **`/llms.txt` updated** with Hockey Database entry for AI crawlers
4. **`/directory` cross-link** — Hockey Database link block above the category grid
5. **IndexNow key file deployed** at `https://rinkstop.com/d4a8b1e6f2c9a573b8e0f6d4c1a7b9e3.txt`
6. **`/api/indexnow` endpoint** — POST endpoint for Vercel deploy hook to auto-ping IndexNow
7. **`scripts/indexnow-ping.cjs`** — CLI tool for manual catch-up pings
8. **`/api/feed/msn`** — MSN-optimized RSS 2.0 feed (100 most recent articles, all MSN required fields)
9. **`docs/msn-partner-program-application.md`** — Application packet with content compliance table

## Key files

- `/api/indexnow` — `src/app/api/indexnow/route.ts`
- `/api/feed/msn` — `src/app/api/feed/msn/route.ts`
- CLI tool — `scripts/indexnow-ping.cjs`
- MSN application — `docs/msn-partner-program-application.md`
- Safeguards — `TOOLS.md` rule 23, `MEMORY.md` "Deployment verification chain"
- VCS-deploy skill proposal — pending workshop approval

## Bing Webmaster Tools API surface tested

- ✅ `GetUserSites` — works
- ✅ `GetCrawlStats` — works
- ✅ `GetQueryStats` — works
- ✅ `GetPageStats` — works
- ✅ `GetFeeds` — works (sitemap status read)
- ✅ `GetUrlInfo` — works (per-URL crawl status)
- ✅ `GetUrlSubmissionInfo` — works (URL submission status)
- ❌ `SubmitSitemap` — endpoint not found (no submit methods in legacy API)
- ❌ `SubmitUrl` / `SubmitUrlBatch` — same
- ❌ v3 API (`bing.com/webmasters/api/v3/*`) — returns HTML UI, not JSON (different auth scheme needs browser session)

**Conclusion:** Submit operations are browser-only via BWT UI. API key supports read + IndexNow URL submission only.
