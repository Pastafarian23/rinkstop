# Phase 7: News Funnel — Design Spec

**Status:** Awaiting Arnel sign-off
**Date:** 2026-06-15
**Target branch:** `feat/news-phase-7-funnel`
**Owner:** KiloClaw (proposing) → Arnel (decides)

---

## 1. Audit of what already exists (verified 2026-06-15)

I checked before writing this. Here's the actual state, not assumptions:

| Item | Location | Status |
|---|---|---|
| `/blog/[slug]` | `src/app/blog/[slug]/page.tsx` | **Redirect only** — forwards to `/news/[slug]`. No real page. |
| `/news/[slug]` (real blog post) | `src/app/news/[slug]/page.tsx` | ✅ Live, 600+ lines |
| Related Hockey News block (blog → blog) | same file, line 451 | ✅ Server-rendered, only if 3+ matches |
| `<BlogRelated>` (blog → blog, client) | `src/components/BlogRelated.tsx` | ✅ In sidebar at line 430 |
| `<RinkRelated>` (rink → teams) | `src/components/RinkRelated.tsx` | ✅ Lives on rink pages only |
| `<TeamRelated>` (team → rink/league) | `src/components/TeamRelated.tsx` | ✅ Lives on team pages only |
| **News → Rinks cross-link** | — | ❌ **Missing** |
| **News → Teams cross-link** | — | ❌ **Missing** |
| **News → City / "hockey near you" CTA** | — | ❌ **Missing** |
| `posts.team_home_id`, `posts.team_away_id`, `posts.league_id`, `posts.country_slug` | `posts` table | ✅ Columns exist (migration `2026-06-12_posts_cross_links.sql`) |
| `/api/rinks?city=...` | `src/app/api/rinks/route.ts` | ✅ Working |
| `/api/teams?city=...` | `src/app/api/teams/route.ts` | ✅ Working |
| `/best-ice-rinks/[city]` | `src/app/best-ice-rinks/[city]/` | ✅ Hub pages exist (Phase 5B) |

**Net:** The blog-to-blog related block is already shipped. What's missing is the **down-funnel** — news article → city/team/rink directory pages. That's the actual link equity gap.

---

## 2. Goal

Drive internal link equity from high-traffic news articles into the directory pages (rinks, teams, cities) that rank for commercial-intent queries ("ice rink near me", "hockey team in [city]").

**Why this matters for SEO:** News articles attract top-of-funnel traffic (informational queries, social shares). Directory pages convert that traffic (people searching for a place to play). Internal links are how PageRank flows from one to the other. Right now there's a wall between the two halves of the site.

---

## 3. What to add (3 blocks on `/news/[slug]`)

All three render conditionally — if there's no data, the block doesn't show. No empty-state UI clutter.

### Block A: "Teams in this article" (highest priority)

**Source:** `posts.team_home_id` and `posts.team_away_id` from the loaded post.

**UI:** 2 small team chips (logo + name + link to `/directory/teams/[slug]`) inserted inline near the top of the article body, right after the lede. Style: subtle pill, navy background, white text, gold accent on hover.

**Fallback:** If neither team column is set, the block is omitted entirely.

**Schema:** Each team chip gets a `<link>` to its `SportsTeam` JSON-LD anchor on the same page (we already emit SportsTeam on team pages — add an inline `SportsTeam` node for these too).

### Block B: "Related Rinks" (mid-priority)

**Source:** The post's `tags` (e.g. `["Boston", "TD Garden"]`) → match against `rinks.city` and `rinks.name` via `/api/rinks?search=...&limit=4`.

**UI:** A 2- or 3-up card grid below the article body, before the "Related Hockey News" block. Same visual language as the existing Related Hockey News grid (navy cards, Bebas Neue heading, gold CTAs) for consistency.

**Fallback:** If no rinks match the tags AND the post has no team columns, skip. (We won't always have data; better to render nothing than a generic "Browse all rinks" link that adds no value.)

**Server-side or client-side:** Server-side, using `supabaseAdmin` directly (consistent with the existing `getRelatedPosts` pattern, avoids the self-loop perf issue we fixed in Phase 4).

### Block C: "Hockey in [City]" CTA (lower priority)

**Source:** Post's `country_slug` + the first matching `rinks.city` (or `team_home_id → teams.city`).

**UI:** A single prominent banner: "Hockey in {city}: {N} rinks · {M} teams · {L} leagues" with a single gold CTA "Explore {city}" → `/best-ice-rinks/[city]`.

**Fallback:** If we can't determine a city confidently, omit.

**Server-side or client-side:** Server-side.

---

## 4. What I am NOT proposing (and why)

- **Auto-injecting links into article body text** — too fragile, too much editorial risk. We'll only add explicit blocks.
- **"Read next" carousel with infinite posts** — already have Related Hockey News block. Don't duplicate.
- **Recomputing related on every request** — the server functions are cheap, but we should add `Cache-Control: s-maxage=600` like the existing `getRelatedPosts` does.
- **Replacing the existing BlogRelated sidebar** — keep it. Different slot, different intent (sidebar = quick scan, bottom block = more depth).
- **Writing 5 sample anchor posts** — TODO.md mentions this, but it's editorial work, not engineering. That's an agent content pipeline task, not this PR.

---

## 5. Implementation outline

### 5.1 New files

```
src/components/news/NewsTeamsChips.tsx       (server component, ~40 lines)
src/components/news/NewsRelatedRinks.tsx    (server component, ~80 lines)
src/components/news/NewsCityCTA.tsx         (server component, ~50 lines)
src/lib/news-related.ts                      (server-side fetch helpers, pure functions)
supabase/migrations/2026-06-15-news-city-index.sql  (optional, see §5.4)
```

### 5.2 Modified files

```
src/app/news/[slug]/page.tsx
  - Add team-chip block after the lede (Block A)
  - Add "Related Rinks" grid before the existing "Related Hockey News" block (Block B)
  - Add city CTA above the article footer (Block C)
  - Pull in the new helper functions
```

### 5.3 New server functions in `src/lib/news-related.ts`

```ts
// All return [] or null when there's no match — never throw.
getNewsTeams(post: Post): Promise<Team[]>
  → JOIN posts.team_home_id + team_away_id → teams table

getNewsRelatedRinks(post: Post, limit: number = 3): Promise<Rink[]>
  → Score: tag match (city name from tag) > team.city > league.country_slug
  → Returns top N rinks, deduplicated

getNewsCity(post: Post): Promise<{ city: string; country: string; counts: { rinks: number; teams: number; leagues: number } } | null>
  → Resolves city from team → city first, then first matching tag, then country_slug fallback
  → Counts via 3 small queries (already indexed)
```

All three use `supabaseAdmin` and run in parallel with `Promise.all` in the page component.

### 5.4 Database

**No new tables.** Existing columns (`posts.team_home_id`, `team_away_id`, `league_id`, `country_slug`) cover everything.

**Optional index:** If `getNewsCity` is slow, add a GIN/trigram index on `rinks.city` and `teams.city`. Check first — current `ilike` queries with leading wildcards are already slow. **Don't add the index unless `EXPLAIN ANALYZE` shows it's needed.** Tracked as a follow-up, not blocking.

### 5.5 Performance

- 3 new server-side queries per news page load. All hit indexed columns.
- Total added latency: ~50–150ms (3 parallel round-trips to Supabase).
- Page is already 1.5–2.5s TTFB so this is in the noise. Phase 4 perf work stays the bigger fish.
- All three queries wrapped in `try/catch` — a failure in any one returns `[]` and the block is omitted. The page never fails to render.

### 5.6 SEO impact (predicted)

- News article pages (informational, top-of-funnel) → directory pages (commercial, bottom-of-funnel)
- ~1 in 3 news articles has a `team_home_id` set (highlights category); ~1 in 10 has a city-rink match
- Net new internal links: ~3 per news article → ~50 per news article, depending on block activation
- Anchor text variety: team names, city names, "Explore {city}", rink names — natural, not stuffed
- No `nofollow`, no `rel="sponsored"` — these are genuinely related entities

---

## 6. Build plan (in commit order)

1. **`chore(news): scaffold news-related helpers and components`** — `src/lib/news-related.ts` + 3 components, no integration yet. Builds, ships nothing visible.
2. **`feat(news): add team chips to news articles`** — Block A only. One commit, one change. Easy to review, easy to revert.
3. **`feat(news): add Related Rinks block to news articles`** — Block B.
4. **`feat(news): add city CTA banner to news articles`** — Block C.
5. **`docs(news): update TODO.md to mark Phase 7 complete`** — after the 3 blocks ship and verify.

Each commit is independently testable. Each can be reverted without breaking the others.

---

## 7. Verification (before merge)

For each commit:
- [ ] `pnpm run build` passes
- [ ] `npx tsc --noEmit --incremental false` passes
- [ ] Manual test: `/news/{any-highlights-article}` shows team chips
- [ ] Manual test: `/news/{article with team and city}` shows related rinks
- [ ] Manual test: `/news/{article without teams}` shows no team chips, no broken UI
- [ ] View source on `/news/{slug}` — confirm new internal links are in server-rendered HTML (not just client-fetched)

Final smoke (after all 3 blocks):
- [ ] `curl -s https://rinkstop.com/news/{slug} | grep -c "directory/teams"` — non-zero
- [ ] `curl -s https://rinkstop.com/news/{slug} | grep -c "best-ice-rinks"` — non-zero (for city-matched articles)
- [ ] Vercel build green
- [ ] No 4xx/5xx spikes in Vercel function logs

---

## 8. Rollback

Each block is in its own commit. To roll back Block B, revert the `feat(news): add Related Rinks` commit. Page returns to current state.

If we need to kill the whole feature, revert the merge commit. No data migrations, no schema changes, no destructive ops.

---

## 9. Open questions for Arnel

1. **Block A placement** — team chips after the lede (above the fold, near the byline) or at the very top of the body, before the lede? My recommendation: **after the lede** — it's metadata, not content.
2. **Block C CTA copy** — "Explore {city}" or "Find hockey in {city}" or "Browse rinks in {city}"? My recommendation: **"Explore {city}"** (matches existing best-ice-rinks hub page).
3. **Block C aggressiveness** — show on every article that has a city (could be 60%+ of posts) or only when we have ≥3 rinks / ≥2 teams in that city (less, but higher signal)? My recommendation: **gate at ≥3 rinks** — same threshold we use for "Related Hockey News."
4. **Should `/blog` get the same treatment?** — Currently `/blog/[slug]` is a 308 → `/news/[slug]`. The redirect passes users through, but it also means search engines see the redirect, not the new content. The new content lives on `/news`. **My recommendation: don't change `/blog`** — it's a legacy URL, the redirect works, and 308 preserves link equity.
5. **Do you want me to write the 5 anchor posts (TODO.md item) as a separate workstream, or punt that to the content pipeline?** — Out of scope for this PR either way.

---

## 10. Estimated effort

- Components + helpers: 2–3 hours
- Page integration: 30 min
- Build/test cycle: 30 min
- Review/iterate: 1 round, 30 min
- **Total: ~4 hours, one session**

This is a single-PR feature. If you approve, I can ship it as one merge of 5 commits to a `feat/news-phase-7-funnel` branch.
