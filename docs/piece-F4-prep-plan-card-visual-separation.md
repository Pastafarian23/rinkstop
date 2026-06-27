# Piece F4 Prep — Practice Plans List: Visual Card Separation

## User feedback (msg #24215)

> "The drills still don't look separated. All I see are text and emojis, no definitive containers."

Photo attached showing the Plans tab on mobile. The plan cards appear as a continuous block of text with no visible separation between items. No card borders, no background contrast, no spacing that reads as "this is one card."

## Verification (no assumptions)

I read the actual rendered source, not just what I think shipped.

**1. Which page is this?** Mobile browser, bottom nav shows `MY TEAM | SCHEDULE | PLANS | INBOX`. URL is `/dashboard/plans` — the **plans listing page**, NOT the plan detail page. So the previous F3 drill-card redesign (which I shipped in `2799bb0`) is unrelated — that's `/dashboard/plans/[slug]`. Different page.

**2. What does the listing page render?** `src/app/dashboard/plans/page.tsx`:
- Wraps each plan in `<PlanCard ... />` (line 149 for "Your saved plans", line 255 for "All plans")
- Outer grid: `grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3` (saved) / `gap-4` (all)

**3. What does PlanCard render?** `src/components/plans/PlanCard.tsx` line 74:
```tsx
<div className="flex flex-col rounded-lg border border-white/10 bg-[#111823] p-4 shadow-sm transition hover:shadow-md">
```

So the markup IS there: rounded card, white/10 border, `#111823` background, padding, shadow.

**4. So why does the screenshot look like no cards?** Color math:
- Page background (`globals.css`): `#0D1117`
- Card background (`PlanCard.tsx`): `#111823`
- Difference: R(+4), G(+7), B(+12). On a dark theme this is **essentially imperceptible** at mobile screen size.
- Border: `border-white/10` = white at 10% opacity. Against `#111823`, that line is barely visible.

So the cards ARE rendering, but **the contrast between card and page is too low to perceive visually.** The screenshot is accurate: no visible card containers.

**5. Why didn't F (dark theme) or F2 catch this?** Both of those pieces shipped on desktop viewport previews. On a 390px-wide iPhone screen, the subtle dark-on-darker contrast washes out completely. Desktop / wide tablet is fine. Mobile is broken.

**6. The filter bar at the top of your screenshot** also uses `bg-[#111823] border-white/10` (`plans/page.tsx` line 192). Same low-contrast issue. So the issue is the same throughout the page, not just the cards.

## Scope (this piece)

### What I'm fixing

**One piece, detail-page UI only.** Make plan cards on `/dashboard/plans` clearly visible as discrete items on mobile.

**A. Card visual upgrade** (`src/components/plans/PlanCard.tsx`)

Change card container from:
```
rounded-lg border border-white/10 bg-[#111823] p-4 shadow-sm
```
to something with **perceivable mobile contrast**:

Option I prefer (background lighter + accent left border):
```
rounded-lg border border-white/15 bg-[#161F2E] p-4 shadow-md
+ 4px left border accent colored per focus (skills=red, conditioning=gold, etc.)
```

- `bg-[#161F2E]` is +9/+14/+23 brighter than page bg → visible on mobile
- `border-white/15` slightly more visible than /10
- `shadow-md` adds elevation cue
- Left accent color uses focus color from the existing `FOCUS_LABELS` map (skills=red, goalie=teal, conditioning=gold) — instant visual scan of plan types

**B. Filter bar fix** (`src/app/dashboard/plans/page.tsx` line 192)

Apply same `bg-[#161F2E] border-white/15` upgrade to the filter form so the filter box doesn't also wash out.

**C. Mobile spacing bump**

- Cards: `gap-4` → `gap-3` (closer stacking so multiple cards feel like one section, but still distinctly separated by the border + accent)
- Mobile-only card padding: `p-4` → keep `p-4` (already good)
- Add `min-h-[180px]` so all cards have the same height in a row — improves visual rhythm

### What I am NOT touching in this piece

- Plan detail page (`/dashboard/plans/[slug]`) — already rebuilt in F3 with proper drill cards
- PlanBuilder / PlanEditor (create / edit forms) — separate piece if needed
- Data model, API routes, env vars, Clerk/Supabase/Stripe
- Filter bar **behavior** — only its visual styling
- Plan detail page navigation

## Must-keep-working checklist

Before I say "ship," I will smoke-test all of these on the preview URL:

- [ ] `/dashboard/plans` loads and shows cards with visible containers on mobile (390px viewport)
- [ ] `/dashboard/plans` filter form still works (Apply filters, Clear all)
- [ ] `/dashboard/plans?focus=skills` server-side filter still works
- [ ] Tapping a card navigates to `/dashboard/plans/[slug]` (the detail page I already rebuilt)
- [ ] Save button (heart icon) still toggles save state and persists to `user_saved_plans`
- [ ] "Your saved plans" section still appears when a user has saved at least one plan
- [ ] Mobile bottom tab bar (MY TEAM / SCHEDULE / PLANS / INBOX) still shows PLANS as active
- [ ] Homepage (`/`), directory, pricing, news, login, sign-up, tools all still 200

## Rollback plan

Single-file change to `PlanCard.tsx` + single-file change to `plans/page.tsx` (filter bar). Revert with:
```bash
git revert <merge-commit> && git push origin main
```
Vercel redeploys in ~30s.

## Open question

**Card height consistency.** Two options:
1. **Equal-height cards** (`min-h` set, content fills bottom with `mt-auto`) — clean grid, but variable content (summary length) means some cards have lots of empty space.
2. **Natural-height cards** — content dictates size, more compact but cards in a row may have different heights.

I prefer option 1 (equal height) because mobile is single-column anyway and equal-height looks more professional on tablet/desktop. Tell me if you'd rather natural-height.

## Files I'll change

- `src/components/plans/PlanCard.tsx` (card styling + left accent border per focus + min-h)
- `src/app/dashboard/plans/page.tsx` (filter bar bg/border upgrade, no logic changes)

## Build verification I'll run

```bash
# Before commit
pnpm run build                                  # exit 0
# ship gate
git diff --cached --name-only                   # confirm only the 2 files above
# after merge
curl -I https://rinkstop.com/dashboard/plans    # auth-gated, expect 307 → /login
curl -I https://rinkstop.com/                   # 200
curl -I https://rinkstop.com/pricing            # 200
curl -I https://rinkstop.com/directory/rinks    # 200
curl -I https://rinkstop.com/news               # 200
```

Then I'll ask you to reload on mobile and confirm the cards are now clearly visible as discrete items.

---

**Ready to build?** Say **go**.