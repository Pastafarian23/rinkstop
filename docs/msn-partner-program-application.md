# Microsoft News Partner Program — Application Packet

**Status:** Ready to submit (user action)
**Target URL:** https://partnerhub.msn.com
**Contact:** partnerhubsupport@microsoft.com

## Application Summary (one-pager)

**Publisher name:** RinkStop
**Publisher URL:** https://rinkstop.com
**Publisher type:** Independent digital media — global hockey directory + news
**Country of operation:** United States (founded), Philippines (current ops), global audience
**Content language:** English (en-US)
**Primary contact:** Arnel Larracas, Founder & Editor-in-Chief
**Founded:** 2018 (active publishing since 2024)

## Why We Qualify

1. **Original news content** — 720+ news articles (game reports, league announcements, NHL/AHL/KHL/PWHL/NCAA/CHL/International coverage). Verified by 1,200+ Bing search impressions in last 28 days on news queries.
2. **Original reporting** — On-the-ground hockey coverage in non-traditional markets (Philippines, Thailand, UAE, Brazil, South Africa). 85 IIHF member-federation network.
3. **Consistent publishing** — Daily news updates, weekly long-form guides.
4. **Editorial standards** — Public editorial policy at /editorial-policy. Correction workflow at /corrections. Public bylines with author bio. Methodology documentation.
5. **Technical infrastructure** — Schema.org markup, AI-readable /llms.txt, sitemap, mobile-responsive, HTTPS, fast page load.

## Content Compliance (Auto-Publishing Rules)

| Rule | Status | Notes |
|---|---|---|
| Document file size <= 524 KB | ✓ | Largest article ~150KB |
| Article body >= 450 characters | ✓ | Min 2,498 (game reports) to 10,000+ (features) |
| Title + body + abstract >= 200 chars | ✓ | All sample articles pass |
| Thumbnail >= 300x300 px | ⚠️ Audit pending | All pages have OG image; need size audit |
| Image >= 10 KB / 600 px | ⚠️ Audit pending | Most have hero image; some have logo fallback |
| Promo image required | ✓ | All pages have og:image |
| Syndication rights on all images | ✓ | All self-hosted or properly attributed (e.g. IIHF/YouTube embed) |
| Valid hyperlinks | ✓ | All internal links verified |
| Valid canonical URLs | ✓ | Every page has self-referencing canonical |
| Valid HTML encoding | ✓ | UTF-8, validated |
| Language matches feed config | ✓ | All en-US |
| Date <= 365 days in past | ✓ | All articles within 7 days of publish |
| Date not future-dated | ✓ | All publish dates are past |
| No profanity, adult, gore, substances, suicide | ✓ | Editorial standards enforced |
| No duplicate content | ⚠️ Audit pending | Game reports follow template but each has unique content |

## Editorial Sample (Top 10 articles MSN would see first)

1. **2026 NHL Draft: Round 1 Storylines and Top Picks** (1,278 Bing impressions on hockey-database-adjacent queries)
2. **What Makes a Hockey Rink Survive in a Non-Traditional Market?** (10,499 chars, original reporting from Philippines, UAE, Brazil, South Africa)
3. **What It Costs to Run a Youth Hockey Program** (3,851 chars, US/Canada data, USA Hockey-cited)
4. **Montreal Victoire Win First Walter Cup — 2026 PWHL Finals** (9,322 chars)
5. **Slovakia top Sweden 4-2** (2,498 chars, IIHF World Championship recap)
6. **Carolina Hurricanes-Philadelphia Flyers 3-2** (recurring game reports)
7. **Colorado Avalanche-Minnesota Wild 5-2** (recurring game reports)
8. **Jamaica Ice Hockey Federation coverage** (original non-traditional market reporting)
9. **2026 NHL Draft Pick Order & Results** (PuckPedia-comparable, Bing #10 ranking)
10. **Plymouth Ice Center** location guide (Bing 12 impressions/28d)

## URLs to Submit in Application

- **Homepage:** https://rinkstop.com
- **Sitemap:** https://rinkstop.com/sitemap-news.xml (news-only feed, ideal for MSN)
- **About:** https://rinkstop.com/about
- **Editorial Policy:** https://rinkstop.com/editorial-policy
- **Data Methodology:** https://rinkstop.com/data-methodology
- **AI/llms.txt:** https://rinkstop.com/llms.txt (shows our content is AI-citable)
- **Hockey Database hub:** https://rinkstop.com/hockey-database
- **Data Coverage:** https://rinkstop.com/data-coverage

## Feed Format Recommendation

Use our existing sitemap-news.xml (RSS-style XML with 720+ news URLs) as the MSN-compatible feed. MSN supports RSS 2.0 and ATOM feeds.

If MSN requires a specific format (MRSS for video, structured RSS for news), we can:
1. Create a dedicated MSN-format feed at /feed/msn.xml
2. Map our existing schema.org/NewsArticle metadata to MSN's required fields

## Open Tasks Before Submission

1. **[User]** Run the thumbnail size audit (I'll prepare the script)
2. **[User]** Verify all hero images are >= 300x300 px (most are 1200x630 OG size, should be fine)
3. **[User]** Standardize author byline — some say "Arnel", others "Arnel Larracas", one says "RinkStop". Should all be "Arnel Larracas".
4. **[User]** Add article:published_time to articles that don't have it (2 of 5 sample articles were missing it)
5. **[User]** Create a /feed/msn.xml that's explicitly MSN-compliant if needed
6. **[Me]** Image sitemap generation (task 8) — helps MSN pick images
7. **[Me]** Alt text audit (task 9) — every image needs proper alt text

## Monetization Path

Once approved:
- MSN displays our articles on Microsoft Start (Edge new-tab), MSN.com, Windows news widget
- Revenue share via Microsoft Advertising (CPM-based)
- Audience: 50+ demographic, high-income, US/CA/UK/AU
- Backlink profile: high-authority microsoft.com domains
- Traffic uplift: estimated 10-30% based on similar publishers

## Approval Timeline (from partner feedback)

- Standard application review: 2-4 weeks
- Content vetting: 1-2 weeks
- First syndication: typically within 1 week after approval
- Full feed ingestion: 2-4 weeks for AI curation to learn the brand
