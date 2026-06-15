# Clean Post Slugs — Design Spec

**Status:** Awaiting Arnel sign-off
**Date:** 2026-06-15
**Target branch:** `feat/clean-post-slugs` (off `main`, not off Phase 7)
**Owner:** KiloClaw (proposing) → Arnel (decides)

---

## 1. The problem

Current post slugs look like this:

```
carolina-hurricanes-vegas-golden-knights-4-2-thursday-june-11-2026-2025030415-d983bb
boston-bruins-dallas-stars-6-3-tuesday-march-31-2026-2025021178-cce2bc
```

What's in there:
- Team names (good, keep)
- Score `4-2`, `6-3` (Arnel: drop)
- Day-of-week `tuesday`, `thursday` (drop — implied by date)
- Verbose date `march-31-2026` (drop — `2026-03-31` is shorter and unambiguous)
- Long numeric `2025030415` (this is the Highlightly match id leaking through — drop)
- UUID prefix `d983bb` (collision dedupe suffix — drop for the new format)

What we want:

```
carolina-hurricanes-vegas-golden-knights-2026-06-11
boston-bruins-dallas-stars-2026-03-31
```

---

## 2. Decisions (from 2026-06-15 conversation)

1. **No separator** between team slugs (`carolina-hurricanes-vegas-golden-knights`, not `carolina-hurricanes-vs-vegas-golden-knights`).
2. **Use the matched `teams` table `slug` when available** — gives clean, authoritative URLs that match the directory. Fall back to slugifying the raw `home_team_name` if no team match, with a warning logged.
3. **On collision (same teams, same date):** refuse to insert, surface conflict in orchestrate output. Don't auto-dedupe.
4. **Existing posts get a clean URL via backfill + 308 redirect** from old slug → new slug. Not just the new code path.
5. **New branch:** `feat/clean-post-slugs` (off `main`, separate from `feat/news-phase-7-funnel`).

---

## 3. Architecture overview

Three pieces:

1. **Slug builder** — a new pure function used by `insertDraft()` to mint new slugs deterministically from `team_home_id` + `team_away_id` + `game_date`.
2. **DB-backed slug redirects** — a `post_slug_redirects` table. Middleware checks it on `/news/[slug]` miss. Old→new pairs are populated by a one-time backfill and by the new code path.
3. **Backfill script** — for every existing post with `team_home_id` set, compute the new slug, update the `posts.slug` column, and insert a redirect row pointing from the old slug → new slug.

### 3.1 Why DB-backed redirects, not `next.config.js`

We have ~30+ existing post slugs today, with more being added over time. A static `next.config.js` redirect array would need:
- A Vercel redeploy every time a new redirect is added
- Hand-maintained sync between DB and config

A `post_slug_redirects` table:
- Single source of truth
- Middleware lookup is O(1) by indexed column
- New redirects are inserted by the pipeline automatically (when it backfills a slug)
- Future URL changes don't require a redeploy

### 3.2 Why middleware, not a Next.js rewrite

Rewrites happen *before* middleware and don't preserve the original URL in the address bar. We want a 308 (Moved Permanently) so:
- Search engines update their index to the new URL
- Users see the clean URL in their address bar
- Old social shares / bookmarks converge to the new URL over time

Next.js's `redirects()` config supports regex via `source`, but only for path patterns — not for a DB lookup. So we need middleware for the dynamic part.

---

## 4. Slug format

### 4.1 New format

```
{home-team-slug}-{away-team-slug}-{YYYY-MM-DD}
```

- All lowercase
- Hyphens only (no underscores, no spaces)
- No `vs` separator
- Date is `YYYY-MM-DD` (ISO 8601, sortable, unambiguous)
- No score, no day-of-week, no IDs

Examples:

| Highlight | New slug |
|---|---|
| Carolina vs Vegas, 2026-06-11 | `carolina-hurricanes-vegas-golden-knights-2026-06-11` |
| Boston vs Dallas, 2026-03-31 | `boston-bruins-dallas-stars-2026-03-31` |
| Montréal vs Tampa Bay, 2026-03-31 | `montr-al-canadiens-tampa-bay-lightning-2026-03-31` |

### 4.2 Team slug resolution

Priority:
1. **`posts.team_home_id` → `teams.slug`** if the post has `team_home_id` set. Use the team's existing `slug` from the `teams` table (e.g. `carolina-hurricanes`).
2. **Slugify the raw `home_team_name`** if no team match. Lowercase, strip diacritics, replace non-alphanumeric with hyphens, trim hyphens. Log a warning so we can spot these in the output.

Same for away team. Same logic for the backfill script.

### 4.3 Date source

For new posts (in `insertDraft`):
- `highlight.match_date` → `YYYY-MM-DD` (it's already an ISO timestamp on the highlight row)
- Or `posts.game_date` if set

For the backfill:
- `posts.game_date` is the canonical source (it's a `date` column added by the 2026-06-12 cross-links migration)
- Fall back to `posts.published_at::date`

### 4.4 Collision handling (rare)

The same two teams play twice on the same day in only one scenario I can think of: a double-header in a tournament (Memorial Cup, World Juniors) or a neutral-site game + a regular-season game on the same day. Genuinely rare.

If `posts.slug` is already taken when we try to insert a new post:
- **Don't insert.** Log the conflict with both the new and existing `highlight_id` + `match_date`.
- **Skip the article** in the orchestrate run output (the rest of the pipeline continues for other highlights).
- **Don't auto-dedupe** with `-g2` / hash suffix. Per Arnel: surface and revisit.

Implementation: in `insertDraft`, after computing the proposed slug, do a `select id from posts where slug = ?`. If a row exists, throw a typed error `SlugCollisionError` that `processHighlight` catches and reports in the run output.

---

## 5. Database changes

### 5.1 New table: `post_slug_redirects`

```sql
create table post_slug_redirects (
  id uuid primary key default gen_random_uuid(),
  from_slug text not null unique,
  to_slug text not null,
  post_id uuid references posts(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index post_slug_redirects_from_slug_idx
  on post_slug_redirects (from_slug);

-- Used by middleware. Single-row lookup, hot path.
```

A reverse-uniqueness check: `to_slug` should also be unique, but since `to_slug` is the canonical slug on `posts.slug`, the FK + posts.slug uniqueness already covers that.

### 5.2 No changes to `posts` table

`posts.slug` column already exists. The backfill updates it in place. No schema changes needed.

### 5.3 Migration file

`supabase/migrations/2026-06-15-post-slug-redirects.sql` — must be applied manually because Supabase Management API is blocked by Cloudflare in this env (per MEMORY.md).

---

## 6. Middleware changes

### 6.1 What changes

`src/middleware.ts` currently does Clerk cookie checks. Add a slug-redirect lookup *before* the auth check, on the `/news/[slug]` route only.

```ts
// Pseudocode, not real
if (pathname.startsWith('/news/') && !pathname.startsWith('/news')) {
  const slug = pathname.split('/news/')[1];
  // Skip if it's the index (/news) or a known-bad path
  if (slug) {
    const redirect = await getRedirect(slug);
    if (redirect) {
      return NextResponse.redirect(new URL(`/news/${redirect.to_slug}`, request.url), 308);
    }
  }
}
```

### 6.2 Performance

- 1 extra Supabase round-trip per `/news/[slug]` request that doesn't hit a static page
- 1 indexed lookup (`post_slug_redirects.from_slug_idx`)
- Typical: <50ms added latency
- Cache: `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` — slug redirects are nearly immutable, so we can cache aggressively

### 6.3 What if Supabase is down?

Middleware should fail open: if the redirect lookup errors, just continue serving the page (with the old slug). The page might 404, but at least we don't break the whole site. Log the error.

### 6.4 What about non-`/news` paths?

Out of scope. The only old post slugs in production are on `/news/[slug]`. If we ever route other content types through the same pattern, we extend the middleware.

---

## 7. Code changes

### 7.1 New files

```
scripts/article-from-highlight/slug-builder.mjs
  - buildSlug({ homeTeam, awayTeam, gameDate, sb })
    Pure-ish (only the team lookups are async). Returns:
      { slug: string, source: 'team-slug' | 'raw-name' | 'collision' }
    Refuses to produce a colliding slug — returns { collision: true, existing: { id, slug } } instead.

supabase/migrations/2026-06-15-post-slug-redirects.sql
  - CREATE TABLE post_slug_redirects + index.

scripts/article-from-highlight/backfill-clean-slugs.mjs
  - For every published post: compute new slug, update posts.slug, insert redirect row from old → new.
  - Dry-run mode by default (--apply to actually write).
  - Skips posts where new slug == old slug (no-op, no redirect needed).
  - Skips posts where team IDs aren't set (hand-written SEO guides; we don't touch those).

scripts/article-from-highlight/verify-slug-backfill.mjs
  - Post-backfill: every post.slug should match what slug-builder would produce.
  - Every old post slug should have a redirect row.
  - Reports: total posts, posts updated, posts skipped, posts with collision, posts without team data.
```

### 7.2 Modified files

```
scripts/article-from-highlight/orchestrate.mjs
  - insertDraft: replace lines 507–512 with a call to slug-builder.
  - Catch SlugCollisionError in processHighlight, surface in result output.

src/middleware.ts
  - Add slug-redirect lookup at the top of the middleware chain.
  - Fail open on Supabase error.

next.config.js
  - No changes. (Middleware handles dynamic redirects; the static redirects() array stays for the host redirects.)

src/lib/supabase.ts
  - No changes.
```

### 7.3 What I am NOT doing

- **Touching `blog` slug format.** `/blog/[slug]` is a 308 → `/news/[slug]` redirect. The redirect from old `/blog` posts to `/news` posts is fine; we don't need to add another redirect for the inner slug.
- **Touching non-post URLs.** This is only about post slugs on `/news/[slug]`.
- **Adding 410s for the very oldest posts** (the Carolinas/Vegas one with the `2025030415` ID is from a Highlightly match id that means nothing to humans). They're not deleted, just redirected.
- **Updating social share counts / OG image URLs.** The `og_image_url` is stored on the post row and is independent of the slug.

---

## 8. Build plan (in commit order)

1. **`chore(slugs): scaffold slug-builder module + collision detection`**
   - `scripts/article-from-highlight/slug-builder.mjs` with `buildSlug()` + `SlugCollisionError`
   - Unit-test fixture in the commit message
   - **No integration yet.** Safe to ship and test in isolation.

2. **`feat(slugs): use slug-builder in orchestrate insertDraft`**
   - Replace lines 507–512 in `orchestrate.mjs`
   - Catch `SlugCollisionError`, surface in `processHighlight` result
   - Adds: import, async team lookup before insert, error handling
   - Removes: hardcoded `slugBase` + `slugTaken` logic

3. **`chore(db): add post_slug_redirects table migration`**
   - `supabase/migrations/2026-06-15-post-slug-redirects.sql`
   - Applied manually (per MEMORY.md, Supabase Management API is blocked)

4. **`feat(middleware): add /news/[slug] redirect lookup`**
   - Edit `src/middleware.ts`
   - Add `getRedirect(slug)` helper
   - Test: visit an old slug, get 308 to new slug
   - Test: visit a non-existent slug, get 404 (not a redirect loop)

5. **`feat(slugs): backfill existing posts to clean slugs + populate redirects`**
   - `scripts/article-from-highlight/backfill-clean-slugs.mjs`
   - **Dry-run by default.** Show what would change. Arnel reviews.
   - `scripts/article-from-highlist/verify-slug-backfill.mjs` for verification.

6. **`docs(slugs): update TODO.md and add release notes`**
   - Mark slug cleanup as done.
   - Add a "What changed" section: the URL pattern, the redirect chain, what users see.

Each commit is independently deployable. Commits 1–4 change behavior only for new posts. Commit 5 is the big one — only run after Arnel has reviewed the dry-run output.

---

## 9. Verification

After commit 2 (orchestrate change):
- [ ] `npx tsc --noEmit --incremental false` clean
- [ ] Manual run of orchestrate on a single highlight: produced slug is `team1-team2-YYYY-MM-DD`
- [ ] `console.error` log shows `team-slug` source for matched teams, `raw-name` for unmatched

After commit 4 (middleware):
- [ ] Visit `/news/old-bad-slug` → 308 to `/news/clean-new-slug`
- [ ] Visit `/news/clean-new-slug` → 200 (no redirect loop)
- [ ] Vercel function logs: middleware lookup time < 50ms p95

After commit 5 (backfill):
- [ ] `pnpm backfill-clean-slugs.mjs --dry-run` shows the change list for Arnel review
- [ ] After Arnel approves, `--apply` runs successfully
- [ ] `verify-slug-backfill.mjs` shows: 0 posts out of sync, 0 missing redirect rows
- [ ] Spot-check 3 random old posts: each old URL 308s to the new URL

Final smoke:
- [ ] `curl -sI https://rinkstop.com/news/carolina-hurricanes-vegas-golden-knights-4-2-thursday-june-11-2026-2025030415-d983bb` returns 308 → `/news/carolina-hurricanes-vegas-golden-knights-2026-06-11`
- [ ] Search engine sitemap regenerated with new URLs (Next.js auto-generates `/sitemap.xml`)

---

## 10. Rollback

If something goes wrong:

- **Commits 1–2 (slug builder, orchestrate change):** revert the commit. New posts go back to the old slug format. No data loss.
- **Commit 4 (middleware):** revert the commit. Old URLs 404 instead of redirecting, but new posts still work. **Do this if middleware is causing perf issues or redirect loops.**
- **Commit 5 (backfill):** run `scripts/article-from-highlight/restore-old-slugs.mjs` (which I'll write as part of commit 5 as a sibling script). It inverts the redirect rows: updates `posts.slug` back to the old value and flips the redirect row to point the other way. **Or** just delete the redirect rows and re-run with old slugs. I'll write the restore script to be idempotent and safe to run twice.

---

## 11. Open questions for Arnel

1. **Middleware vs. next.config.js redirects** — I recommend middleware (DB-backed, no redeploy needed). Static config requires hand-maintaining the array. Do you have a preference?

2. **Backfill scope** — should the backfill also update the canonical `posts.slug`, or should it leave the post row alone and only create redirect rows? My recommendation: **update `posts.slug`** so the canonical URL is the clean one. Redirects point old → new. This is the most SEO-friendly approach (no double-redirects) and makes the URL the single source of truth.

3. **Posts without `team_home_id` set** — for these (hand-written SEO guides, "best of" articles, etc.), we don't have a deterministic new slug. Three options:
   - (a) **Leave them alone.** Old slug keeps working, no redirect needed, no backfill changes.
   - (b) **Derive a new slug from the title.** Slugify the post title. Risk: might collide with future highlight posts.
   - (c) **Manually rewrite them.** Pull a list, Arnel picks new slugs.
   - My recommendation: **(a) leave them alone.** They're not the problem you flagged, and the risk of collision is real but rare.

4. **Verification of the `team_home_id` match** — for the backfill, we trust the existing `posts.team_home_id` value. If that value points to the wrong team (rare but possible if the pipeline ever mis-matched), the new slug will be wrong. Should the backfill script validate each `team_home_id` against the highlight that the post was generated from? My recommendation: **yes — add a sanity check** that compares the team's name in the `teams` table to the post's title. If they don't share tokens, log a warning. Don't fail the backfill, just flag it.

5. **When to run the backfill** — before or after the Vercel deploy of the new middleware? My recommendation: **deploy middleware first** (no data dependency), then run backfill (creates redirect rows). That way, if the backfill finds a collision and pauses, the old URLs still work because the middleware hasn't been told to redirect them yet.

---

## 12. Estimated effort

- Slug builder: 1 hour
- Orchestrate integration: 30 min
- Migration: 15 min
- Middleware: 1.5 hours (incl. testing)
- Backfill script + dry-run: 2 hours
- Verification script: 30 min
- **Total: ~6 hours across 5 commits, 1-2 sessions**

The backfill dry-run needs your eyes before `--apply`. Plan to spend 15-30 min reviewing the output of the dry-run.
