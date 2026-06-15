# RinkStop SEO Platform — TODO

**Last updated: 2026-06-15**

## Completed ✅
- [x] Phase 1: Content depth — country/city/rink pages with rich contextual content
- [x] Phase 2: Contextual linking engine — inline links + bidirectional entity graph
- [x] Phase 3: Hub pages — NHL hub (/directory/nhl), Learn Hub (/learn), FAQ (/faq), Best Rinks programmatic pages
- [x] Phase 4: Freshness — Last Updated timestamps + Recent Activity Module on homepage
- [x] Phase 5: Programmatic pages — /best-ice-rinks/[city], /ice-rinks-near-me
- [x] Phase 6: Schema markup — SportsActivityLocation, SportsTeam, SportsOrganization on all entity pages
- [x] API enhancements — city param on /api/rinks, sort=recent on /api/rinks and /api/teams
- [x] Phase 7: News funnel — team chips (Block A), Related Rinks grid (Block B), City CTA banner (Block C) on /news/[slug]

## In Progress
- [ ] Monitor Phase 4A deploy — verify homepage Recent Activity Module loads correctly

## Remaining

### Phase 7: Article Funnel (Medium Priority) ✅ DONE
- [x] Add internal link strategy section to blog posts
- [x] Create blog → city → rink link flow in article templates
- [x] Add "Related Rinks" and "Related Teams" sections to blog post pages
- [ ] Write 5 sample anchor blog posts for top hockey cities (punted to content pipeline)

Spec: docs/PHASE-7-NEWS-FUNNEL-SPEC.md. Branch: feat/news-phase-7-funnel.

### Phase 8: Homepage Repositioning (Medium Priority)
- [ ] Review hero section messaging — does it clearly communicate value proposition?
- [ ] Add "Featured Rinks" or "Trending Cities" content block to homepage
- [ ] Evaluate whether "Join Now" CTA aligns with current product state

### Technical / SEO Housekeeping (Lower Priority)
- [ ] Add `/public-skate-near-me` and `/stick-and-puck-near-me` pages (expand on Phase 5B)
- [ ] Expand `/best-ice-rinks/[city]` to top 20-30 cities
- [ ] Add "Load More" pagination to directory listing pages
- [ ] Consider adding FAQ schema to hub pages (Who is RinkStop? Who runs it?)

---

## Notes
- Phase 7 requires actual blog content to be written — agent content pipeline can handle this
- Phase 8 is mostly cosmetic/repositioning and can be done in a single session
- Most impactful remaining work is Phase 7 article funnel since it drives internal link equity (DONE 2026-06-15)
