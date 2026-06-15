# Post-Slug Review Queue — Design Spec

**Date:** 2026-06-15
**Branch:** `feat/clean-post-slugs` (extending the existing 7-commit branch)
**Status:** Awaiting Arnel's sign-off on §6 design decisions

---

## 1. Problem

The clean post slugs backfill (`scripts/article-from-highlight/backfill-clean-slugs.mjs`) ran into a data-quality wall:

- 405 of 722 posts have **stale `team_home_id`/`team_away_id` FKs** (UUIDs that don't exist in the `teams` table)
- 36 posts have **both FKs null**
- 121 posts have **one valid FK, one null**
- 160 posts would update cleanly (all required data present)

The slugs depend on team names, and the team-name data is gone — `highlights` table is empty, `posts.highlight_id` doesn't match `highlight_backups.match_id` (different ID spaces), no audit history. The only place team names still exist is the post titles.

**Arnel's directive:** "The information needs to be correct and accuracy is the utmost priority. There are no shortcuts."

**Arnel's proposed solution:** Add the bad posts to a review section in the admin dashboard. Set teams, slug, players, etc. manually.

This is the right call. The admin dashboard already has a `/admin/blog/[slug]/review` page with `CrossLinkOverridePanel` for picking teams. The pickers are search-and-pick from a live team index, which is the most reliable way to ensure the right team is selected. **The infrastructure is there. The queue is missing.**

---

## 2. What's already built (the foundation)

These are the existing pieces we're building on top of:

| File | Purpose |
|---|---|
| `src/app/admin/blog/page.tsx` | List of all blog posts with status filter |
| `src/app/admin/blog/[slug]/page.tsx` | Edit form for title, content, SEO, slug, category, tags |
| `src/app/admin/blog/[slug]/review/page.tsx` | Full review page with cross-link pickers, edit drawer, body editor, history |
| `src/components/admin/CrossLinkOverridePanel.tsx` | Search-and-pick for `team_home_id`, `team_away_id`, `league_id`, `player_id` |
| `src/components/admin/HighlightOverridePanel.tsx` | Highlight ID override |
| `src/components/admin/EditFieldsDrawer.tsx` | Edit title, subtitle, category, tags |
| `src/components/admin/BodyEditor.tsx` | Markdown body editor |
| `src/components/admin/ReviewHistoryPanel.tsx` | Diff history (writes to `post_review_edits`) |
| `src/app/api/admin/articles/[id]/route.ts` | PATCH endpoint that supports both `team_home_id`/`team_away_id` and the `cross_link_overrides` flow |

**Existing review page write flow:**
- `CrossLinkOverridePanel.onChange` updates `pendingOverrides` (local state)
- On save, the page POSTs `pendingOverrides` + the `team_home_id`/`team_away_id` fields to `/api/admin/articles/[id]`
- The API writes the actual FK columns via `update.posts` (legacy fields path, lines 118 + 154)
- The cross-link overrides are also persisted for downstream re-render

So the infrastructure to fix one post already exists. The missing piece is **the queue**: a way to see all 562 posts that need fixing, in a list, with one-click access to each.

---

## 3. What we're building

### 3.1 New page: `/admin/blog/needs-review`

A dedicated admin page that lists all posts with bad team FKs. Features:

- **Filter tabs** at the top:
  - `Stale FK` (405 posts — UUID doesn't exist in `teams`)
  - `Missing FK` (36 posts — both FKs null)
  - `Partial FK` (121 posts — one valid, one null)
  - `All` (562)
  - `Reviewed` (show me which I've already fixed — by querying `post_review_edits` for the current admin user)
- **Post rows** show:
  - Title (so the team names are visible for context)
  - Old slug (the noisy one)
  - Current FK state (e.g., "Stale home, valid away" or "Both null")
  - League/country tags (helps narrow which team is which when names are ambiguous)
  - "Fix" button → `/admin/blog/[slug]/review?returnTo=/admin/blog/needs-review`
- **Bulk stats** at the top: "562 posts need review · 0 reviewed this session"
- **No "fix" button on the post itself** — defer all changes to the existing review page, which is purpose-built

### 3.2 Enhancement to the review page (`/admin/blog/[slug]/review`)

One small addition, shown only when the page is opened with `?returnTo=/admin/blog/needs-review` (so it only appears when you came from the queue):

1. **Live slug preview banner** at the top of the page:
   - Computes the clean slug based on currently-selected `team_home` + `team_away` + `game_date`
   - Updates in real-time as you pick teams in `CrossLinkOverridePanel`
   - Shows: `New slug will be: carolina-hurricanes-vegas-golden-knights-2026-06-11`
   - If the resulting slug collides with another post, show a red warning: `⚠️ Slug collision with post <id>`
   - Implementation: import the `buildSlug` from `scripts/article-from-highlight/slug-builder.mjs` — but the script is `.mjs` and Next.js client components can't import directly. Solution: replicate the slug-builder logic in `src/lib/slug-builder.ts` (a small TypeScript port — pure function, no Supabase calls). Or expose a `/api/slug-preview` endpoint. **Recommended: TypeScript port in `src/lib/slug-builder.ts` for client-side live preview.**

2. **"Mark as Reviewed (Not a Game)" button** (optional path for non-game posts):
   - Marks the post as intentionally left with stale FKs (e.g., a hand-written guide post)
   - Filters it out of the "needs review" tab and into the "Reviewed" tab
   - Stored as `posts.cross_link_overrides = { _skipped_review: true, _skip_reason: "..." }` — keeps the audit trail in one place
   - Writes a `post_review_edits` row with `action = 'skip'` for history

**No "Save & Next" button** (per Q3, Arnel picks the next post manually from the main list).

### 3.3 No changes to the existing `/admin/blog` list

The existing list shows all posts with status filters. Adding a "needs review" badge is a nice-to-have but the dedicated `/admin/blog/needs-review` page is the primary entry point. Adding a badge could be follow-up.

### 3.4 No new database tables

We can do everything via the existing `posts` table:
- Stale FK = `posts.team_home_id` is non-null AND not in `teams.id`
- Missing FK = `posts.team_home_id` is null AND `posts.team_away_id` is null
- Partial FK = exactly one of the two is non-null AND valid

For tracking "reviewed" status, we use the existing `post_review_edits` table (which the review page already writes to) + a `posts.cross_link_overrides._skipped_review` flag for the manual-skip case.

### 3.5 Backfill script stays the same

`scripts/article-from-highlight/backfill-clean-slugs.mjs` is **already correct** — it reads `team_home_id`/`team_away_id` from `posts` and looks them up. Once Arnel fixes a post in the review page, the next backfill run will pick up the now-valid FKs and update the slug. **No changes needed to the backfill or the migration or the middleware.**

---

## 4. Data flow

```
Arnel visits /admin/blog/needs-review
  → Sees 562 posts with bad FKs
  → Clicks "Fix" on "North Bay top Brantford 8-1"
  → Lands on /admin/blog/[slug]/review?returnTo=/admin/blog/needs-review
  → Sees live slug preview: "New slug will be: [tbd - waiting for team selection]"
  → CrossLinkOverridePanel: picks "North Bay Battalion" for home, "Brantford Bulldogs" for away
  → Slug preview updates in real-time: "north-bay-battalion-brantford-bulldogs-2026-04-08"
  → Saves the post (existing save flow)
  → POSTs team_home_id, team_away_id to /api/admin/articles/[id]
  → Post's team FKs are now valid (logged in post_review_edits)
  → Returns to /admin/blog (or stays on the review page)
  → Arnel picks the next post from /admin/blog/needs-review
  → ...
  → Arnel reviews at his own pace, over days or weeks
  → When ready, runs `node backfill-clean-slugs.mjs --apply`
  → Backfill sees the now-valid FKs and updates slugs + 308 redirects
```

---

## 5. Files to add/modify

**New files (3):**
- `src/app/admin/blog/needs-review/page.tsx` — the queue list page
- `src/lib/slug-builder.ts` — TypeScript port of `scripts/article-from-highlight/slug-builder.mjs` for client-side use
- `src/components/admin/SlugPreviewBanner.tsx` — the live preview component, used inside the review page

**Modified files (2):**
- `src/app/admin/blog/[slug]/review/page.tsx` — add SlugPreviewBanner (no "Save & Next" per Q3; existing save flow unchanged)
- `src/app/admin/blog/page.tsx` — add a "Needs Review (562)" link at the top (small, not the primary entry point)

**No new migration.** No new tables. No changes to the backfill or middleware.

**Estimated effort:**
- 1.5–2 hours of coding
- Review is at Arnel's pace, spread over sessions of his choosing

---

## 6. Design decisions — Arnel's sign-off (2026-06-15)

### Q1: Scope — all 562 in one queue. **DECIDED.**

Arnel: "A. Scope is full 562. Add a note indicating why the article was flagged."

Action: Each row in the needs-review queue will show a clear reason flag: "Stale FK (UUID not in teams)", "Missing FK (both null)", or "Partial FK (one null)". The filter tabs group by reason so Arnel can prioritize.

### Q2: Slug preview — live in the review page. **DECIDED.**

Arnel: "B. Yes add the preview."

Action: Build SlugPreviewBanner (commit 3). Use the TypeScript port of slug-builder (commit 2) for real-time updates as teams are picked. Show the collision warning (Q8) inline.

### Q3: Save & Next — manual selection, no auto-advance. **DECIDED.**

Arnel: "C. Save only, I will select the article I want to do next from main."

Action: **Remove the "Save & Next" button from the design.** The review page saves and returns to the post (existing behavior). Arnel navigates back to `/admin/blog/needs-review` or `/admin/blog` and picks the next post himself. This is slower per click but matches how Arnel wants to work.

Side effect: no "queue position counter" needed.

### Q4: Time budget — review is ongoing, not blocking. **DECIDED.**

Arnel: "E. I will be auditing and editing articles at my convenience, it won't be done right away."

Action: The `feat/clean-post-slugs` branch ships in its current state (backfill ready, middleware live in preview, but **not applied to production**). The needs-review queue ships as a feature Arnel can use at his own pace. **No "ship 160 now, do 562 later" partial backfill** — the backfill only runs after Arnel has reviewed enough posts to make the bulk slug update worthwhile (his call on timing).

Side effects:
- The middleware in `src/middleware.ts` is already live in the preview. It does nothing until `post_slug_redirects` table exists + has rows. Safe to keep in preview.
- The migration `2026-06-15-post-slug-redirects.sql` is still pending manual apply. Arnel applies it whenever he wants the backfill to be able to write redirect rows.
- The backfill script stays dry-run by default. Arnel runs `--apply` when he's ready.
- The merge to main can happen independently of when Arnel finishes the review — the code is feature-complete and the review queue is the operator workflow.

### Q5: Audit trail — keep a "Reviewed" section. **DECIDED.**

Arnel: "D. Please keep a separate reviewed for audit trail."

Action: The needs-review queue has a "Reviewed" tab. Posts in this tab are ones that:
- Had their team FKs set (or re-set) via the review page **and** the change is logged in `post_review_edits`
- OR were explicitly skipped via the "Mark as Reviewed (Not a Game)" button (sets `cross_link_overrides._skipped_review = true` and writes to `post_review_edits`)

The Reviewed tab shows who reviewed, when, and what the previous vs. new FKs were (read from `post_review_edits`). This is a permanent audit trail — once a post is in Reviewed, it stays in Reviewed even if the FKs are later changed again (the latest review shows; the history is in the `post_review_edits` table).

### Q8: Slug collision in preview — show red warning but allow save. **INHERITED.**

Action: SlugPreviewBanner shows a red warning if the computed slug collides with another post. Allow save anyway. The collision is information for Arnel to decide, not a hard block.

---

## 7. Rollback

The needs-review page is read-only (it only queries). The review page modifications are additive (new button, new banner — don't change existing save flow). If something breaks:

1. Revert `src/app/admin/blog/needs-review/page.tsx` (one new file, easy to delete)
2. Revert the review page changes (one file, easy to revert)
3. Revert the `/admin/blog` link addition

No data changes. No migration to undo. Safe to ship and roll back.

---

## 8. Open questions

- **Q6: Auth — should the needs-review page be admin-only, or open to all logged-in users?**
  Recommendation: admin-only (gated by an `is_admin` check or Clerk role). The existing review page has no auth check that I can see — let me know if that's correct and I'll match it.

- **Q7: What if `game_date` is null on a post with valid FKs?**
  Recommendation: Slug builder falls back to `published_at`, which is set on every published post. If both are null, the slug is rejected and the preview shows "No date — pick a date in the edit form first." This case is rare (only 31 posts in the dry-run, and they all have `published_at`).

- **Q8: When the slug-builder detects a collision in the preview, what should the UX do?**
  Recommendation: Show a red warning but allow saving. The backfill's collision policy is "refuse + surface to operator" — but the manual review workflow IS the operator. Arnel gets to decide: rename the post's slug with a date suffix, archive one, etc. The warning gives him the info to make that call.

---

**Next steps after sign-off:**
1. Build the needs-review page (commit 1)
2. Port slug-builder to TypeScript (commit 2)
3. Add SlugPreviewBanner to the review page (commit 3)
4. Add "Mark as Reviewed (Not a Game)" button to the review page (commit 4)
5. Add the queue link to the main /admin/blog list (commit 5)
6. Smoke test in preview
7. Merge `feat/clean-post-slugs` to main (backfill is dry-run safe; middleware is no-op until migration is applied; queue is the new feature)
8. Arnel reviews articles at his own pace — 562 posts total, queue is the workflow
9. After enough posts are reviewed, Arnel applies the migration and runs the backfill --apply
10. Existing 308 redirect infrastructure handles the rest
