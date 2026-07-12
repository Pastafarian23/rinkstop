# Profile Page Redesign — Prep Doc (2026-07-05)

## Why

Arnel: "improve the profile page overall rinkstop.com/profile/arnel — none of the
buttons, share, and text match and seem inconsistent. We have a brand already
built around the same design and esthetic!"

Live state confirmed:
- Action row: Connect (shows "…" — loading-state never resolves when not signed
  in), Message (teal #14B8A6, no border-radius consistency), Share (navy +
  gold border, different border-radius). 3 buttons, 3 styles, no shared rhythm.
- Text: Inter 2xl display name, Inter muted @-handle, ad-hoc tier pill, role
  badges, location — all floating with no card or container.
- No Bebas Neue on the page even though the rest of the site (nav, pricing,
  ticker, dashboard) uses `font-sport` (Bebas Neue) for display.
- Photo history: 96px squares, white/10 borders, dates under each — looks
  like an afterthought.

## Scope (one piece, tight)

Restyle `/profile/[slug]/page.tsx` only. No new components, no API changes,
no DB changes, no other pages touched.

### 1. Single card container

Wrap the whole profile in a card that matches the rest of the dark-theme UI:
- `background: linear-gradient(180deg, #0A1A33 0%, #041E42 100%)` (navy gradient)
- `border: 1px solid rgba(255,255,255,0.08)` (the `--border` token)
- `border-radius: 16px`
- `padding: clamp(1.25rem, 4vw, 2rem)` (responsive)
- Page-level padding: `py-12 px-4` → keep, the card sits inside the 3xl container

### 2. Brand typography

- Display name: `font-sport` (Bebas Neue) `clamp(1.75rem, 5vw, 2.25rem)`,
  `letter-spacing: 0.04em`, white, line-height 0.95 — matches `welcome/page.tsx`
  pattern.
- Section labels (Roles, Photo history, Connected profiles): same Bebas Neue
  `0.875rem` `letter-spacing: 0.1em` uppercase, `color: rgba(255,255,255,0.5)`.
- Body / handle / bio: Inter (default).
- Tier pill: keep `<TierBadge size="md" />` (already correct).

### 3. Standardized action row

All three buttons share:
- `font-size: 0.875rem`
- `font-weight: 600`
- `padding: 0.5rem 1rem`
- `border-radius: 8px` (the site convention, not 999px pills)
- `display: inline-flex; align-items: center; gap: 0.5rem`
- `transition: all 0.15s`
- Min-height: 36px

Color hierarchy:
- **Connect** (primary): `background: var(--red)`, `color: #fff`,
  `border: 1px solid var(--red-dark)`. On hover: `background: var(--red-dark)`.
- **Message** (secondary): `background: rgba(255,184,28,0.12)`,
  `color: #FFB81C`, `border: 1px solid rgba(255,184,28,0.4)`. Hover: brighter.
- **Share** (tertiary): `background: rgba(255,255,255,0.05)`,
  `color: #fff`, `border: 1px solid rgba(255,255,255,0.15)`. Hover: brighter.

Connect button when viewer is NOT signed in → render a single "Sign in to
connect" link to `/login?redirect=...` (no more "…" loading state).
Connect button when viewer IS the profile owner → render "Edit profile" →
`/dashboard/profile` instead.

### 4. Metadata strip

One line: `@handle · 📍 location · <TierBadge size="xs" />`
All in `text-sm text-white/60`, separated by `·` bullets.
Display name + Founding Member badge / IdentityVerified sit on the line above.

### 5. Photo history restyle

- Section header: "PHOTO HISTORY" in Bebas Neue (same as Roles/Connected).
- Tile size: 80×80 (was 96) to feel more compact within the card.
- Current photo: red border `2px solid var(--red)`, gold checkmark badge in
  corner (matches brand).
- Past photos: `1px solid rgba(255,255,255,0.1)`.
- Date under each: `text-[10px] uppercase tracking-wider text-white/40`.

### 6. Layout cleanup

- Add a divider between the header block and the bio: `border-top: 1px solid
  var(--border)` (matches the `dashboard/profile/page.tsx` pattern).
- Bio: `text-[15px] text-white/80 leading-relaxed` — slightly bigger than
  current and roomier.
- Connected profiles section: leave the existing section intact (already
  well-styled per Piece 1.2). Just bring the section header into the new
  Bebas Neue style.
- Footer "Joined 2/7/2019": move inside the card, `text-xs text-white/40`,
  `border-top: 1px solid var(--border)`, `pt-6`.

## Files

| File | Change |
|------|--------|
| `src/app/profile/[slug]/page.tsx` | +180/-180 lines, same file |

## Untouched (must not change)

- `src/components/ConnectButton.tsx` — internal status logic stays.
- `src/components/SocialActions.tsx` — internal logic stays; we wrap its
  output with our own button-style CSS via inline overrides or a thin local
  wrapper.
- `src/components/IdentityVerified.tsx`
- `src/components/AccountTypeBadges.tsx`
- `src/components/TierBadge.tsx`
- API routes (`/api/profiles/*`, `/api/connections/*`)
- `src/app/profile/[slug]/page.tsx` data fetching (`fetchProfile()`)
- `generateMetadata()` — leave exactly as is (SEO-critical)
- All other `/profile/*` pages and the dashboard `/profile`

## Rollback plan

- `git revert <commit>` + `git push origin main` — Vercel redeploys in ~30s.
- Or, since the change is one file: `git checkout <last-good-sha> -- src/app/profile/[slug]/page.tsx`.

## Must-keep-working checklist

- [ ] `/profile/arnel` returns 200, renders for logged-out viewer
- [ ] `/profile/<non-existent-slug>` returns 404
- [ ] `generateMetadata` still emits correct title/description/og:image
- [ ] `isIdentityVerified` logic unchanged (the shield still gates on hardened helper)
- [ ] Connect button still works when signed in (all 6 states: loading, none,
      pending-incoming, pending-outgoing, connected, blocked, self)
- [ ] Message link still routes to `/dashboard/messages?with=<userId>`
- [ ] Share popover still has X / Facebook / LinkedIn / WhatsApp / Reddit / Email / Copy link
- [ ] Photo history still shows newest-first with the current photo marked
- [ ] Connected profiles section still renders the 4 buckets (records, teams, leagues, family)

## Verification

1. `rm -rf .next && pnpm run build` — exit 0
2. `npx tsc --noEmit` — clean
3. Live: `curl -s https://rinkstop.com/profile/arnel | grep -E 'font-sport|Card|Photo history|Identity Plus'`
4. Live: `curl -s -o /dev/null -w "%{http_code}" https://rinkstop.com/profile/arnel` → 200
5. Live: `curl -s -o /dev/null -w "%{http_code}" https://rinkstop.com/profile/nonexistent-user-xyz` → 404
6. Visual: check `/profile/arnel` in browser at 3 widths (375 mobile, 768 tablet, 1280 desktop)
7. `git diff --stat` before commit
8. Ship: push to main, verify Vercel auto-deploy succeeds, re-curl in 60s
