# Home Page — News Section Design Spec
**Last updated:** 2026-08-24  
**Status:** LOCKED

---

## What this document is

This is the canonical reference for how the news section on rinkstop.com should behave.
Any PR that changes behavior described here must update this document first.
A Playwright test (`e2e/home-news-section.spec.ts`) enforces the hard rules automatically.

---

## Visual layout

```
┌──────────────────────────────────────────────────────────────┐
│ LATEST                                                       │
│ HOCKEY NEWS                               [All News →]       │
│                                                              │
│ [card]          [card]          [card]                       │
│ [image 150px]   [image 150px]   [image 150px]              │
│ [badge]         [badge]         [badge]                     │
│ [title]         [title]         [title]                     │
│ [subtitle 2ln]  [subtitle 2ln]  [subtitle 2ln]              │
│ Read More →     Read More →     Read More →                 │
└──────────────────────────────────────────────────────────────┘
```

- **Section background:** `#111823` with `border-bottom: 1px solid rgba(255,255,255,0.06)`
- **Header:** "LATEST" label (`.label`) + "HOCKEY NEWS" in `.font-sport`, `color: #fff`, responsive size `clamp(1.625rem, 4vw, 2.25rem)`
- **"All News →" link:** `.sec-link` class, right-aligned
- **Grid:** `.news-grid` → 1 col mobile, 2 col ≥600px, 3 col ≥1024px
- **Cards:** `.card` with dark background, no border radius change, image fills top 150px `object-fit: cover`
- **Badge:** `.badge-red` with category label (news / blog / nhl-playoffs / etc.)
- **Title:** `color: #fff`, `font-weight: 700`, `font-size: 0.9375rem`
- **Subtitle:** `color: rgba(255,255,255,0.38)`, 2-line clamp
- **"Read More →":** `color: #C8102E`, uppercase, letter-spaced

---

## Loading behavior (LOCKED — do not change)

### Server render
- Section MUST be present in the server-rendered HTML (not lazy-loaded via JS import)
- Section renders a **shimmer skeleton** on server + during client hydration
- Skeleton shows 5 card placeholders matching the real card layout (image + title lines)
- Skeleton prevents layout shift when real content arrives

### Client fetch
- Single `GET /api/blog/posts?not_category=Highlights&limit=5`
- **Case-insensitive** category exclusion (`ilike`, not `eq` or `neq`)
- Shows skeleton while fetching
- If fetch fails or returns 0 posts: section is hidden entirely (`return null`) — do NOT show an error state or empty cards
- `useEffect` with `cancelled` flag to avoid setting state on unmounted component

### What NOT to do
- ❌ Do not paginate through multiple pages to find non-highlight posts
- ❌ Do not use `eq('category', 'highlights')` — DB has mixed casing ("Highlights", "highlights"); must use `ilike`
- ❌ Do not return an empty-state message if no posts found — hide the section
- ❌ Do not change the skeleton to a spinner
- ❌ Do not defer the section with `loading="lazy"` on a wrapper — the section shell must be server-rendered

---

## Content rules

- Always 5 posts maximum
- Categories shown as-is from DB (news, blog, nhl-playoffs, etc.)
- Ordered by `created_at DESC` (most recent first)
- Only `status='published'` posts
- Only posts where `category` does not match "Highlights" (case-insensitive)

---

## Related files

| File | Role |
|---|---|
| `src/app/page.tsx` | Renders `<HomeNewsSection />` after `<HighlightsGrid />` |
| `src/app/components/HomeNewsSection.tsx` | Client component — skeleton + fetch + render |
| `src/app/api/blog/posts/route.ts` | GET endpoint — `not_category` param + `ilike` filter |
| `src/app/globals.css` | `.news-grid`, `.skeleton`, `.skeleton-img`, `.skeleton-line` |
| `e2e/home-news-section.spec.ts` | Playwright test — loading behavior + content |

---

## Changelog

| Date | Change |
|---|---|
| 2026-08-24 | Locked. Previously: no skeleton + 8-page pagination loop + case-sensitive filter. |
