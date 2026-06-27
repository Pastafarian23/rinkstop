# Piece F3: Drill Cards Redesign (Plan Detail View)

**Status:** Prep doc, awaiting Arnel's "go" before any code is written.

## Arnel's complaint (verbatim)

> "Going back to practice plans again, the drills are still not easily
> distinguishable. Please make each drill its own individual card to make
> a break and separate from each other. That way it can be seen which save
> and view plan is associated with which drill. Optimize the best possible
> in mobile as well"

## Source-of-truth code review (no guessing)

**Current state of PlanDetail (`src/app/dashboard/plans/[slug]/page.tsx`):**
- Each segment is rendered as an `<li>` card with 3px colored left border,
  numbered circle (1, 2, 3...), and a duration pill.
- **Inside** the segment card, the drill and notes are rendered as NESTED
  blocks — small bordered boxes inside the outer card. They are visually
  subordinate to the segment card, not equal-weight.
- The DRILL block uses `background: 'rgba(255,255,255,0.025)'` (very
  subtle dark) and `border: '1px solid rgba(255,255,255,0.06)'` (almost
  invisible on dark bg).
- Save / Mark as Run buttons are at the TOP of the page, attached to the
  whole plan. They scroll out of view as the user reads drills.

**Current state of mobile:**
- The segment card uses `padding: '1.25rem 1.25rem 1.25rem 4rem'` (room
  for numbered circle on the left). On a 360px viewport this means the
  drill text gets only ~270px of horizontal space.
- The numbered circle is `position: absolute, left: 16, top: 50%,
  transform: translateY(-50%)` — fine.
- The duration pill is in a flex-wrap row with the segment name, but
  segment name and duration are on the SAME row, which can cause line
  wrap on narrow screens.

## What "make each drill its own individual card" most likely means

Arnel is looking at the plan detail page. The drills are currently nested
boxes inside segment cards. He wants:

1. **Drill card to be a peer of segment header, not nested inside it.**
   A segment becomes a section header (with the segment name + total
   duration), and each drill is a standalone card below it.
2. **Clear visual separation between drill cards** — gaps, borders,
   numbered, so you can see "this is drill 1, this is drill 2."
3. **Plan context visible at all times** — so the user always knows which
   plan they're on while reading drills. (Sticky plan title? Floating
   action buttons? Both?)
4. **Mobile-optimized** — each drill card stacks cleanly, full-width,
   no cramped padding, no truncation.

## What this piece does NOT do

- ❌ Does NOT change the data model. `structure.main[]` segments remain
  the unit. Each segment may have one drill description; that single
  description becomes one drill card.
- ❌ Does NOT add multi-drill-per-segment support. (Could be a future
  piece, but it's a data model change, not a UI polish.)
- ❌ Does NOT change PlanBuilder or PlanEditor forms. Those are
  create/edit views, and the user is complaining about the READ view.
  The editor already renders segments as `<li>` cards with the same
  shape; if Arnel wants the editor polished too, separate piece.
- ❌ Does NOT change SaveButton / MarkAsRunButton. They stay at the
  top of the page (per-plan actions).
- ❌ Does NOT touch other pages (plans listing, equipment, etc.).
- ❌ Does NOT add new API routes, env vars, or migrations.

## Final design (locked)

### Plan Detail page structure

```
[Sticky header bar — NEW]
  Plan title (truncate to 1 line)
  Plan summary (truncate to 1 line)
  Save / Mark as Run buttons (compact)
  [Scrolls with the page, sticks to top once user scrolls past original header]

[Page header — EXISTING, but compact]
  Focus chip + duration + age + skill level pills
  ← Back to plans

[Section header — NEW shape]
  🔥 WARMUP · 5 MIN TOTAL
  (section name + total minutes, colored accent bar)

[Drill card — NEW shape, replaces the inner nested block]
  ┌─────────────────────────────────────────────┐
  │ #1                              ⏱ 5 min    │
  │ Light jog around rink (2 laps)              │  ← segment name as card title
  │ ─────────────────────────────────────────── │
  │ DRILL                                        │  ← drill block, prominent
  │ No pucks. Focus on form.                    │
  │ ─────────────────────────────────────────── │
  │ 📝 COACH NOTE                                │  ← notes block, prominent
  │ (only if present)                           │
  └─────────────────────────────────────────────┘

[Next drill card]
  ┌─────────────────────────────────────────────┐
  │ #2                              ⏱ 10 min   │
  │ Forward strides — length and power          │
  │ ─────────────────────────────────────────── │
  │ DRILL                                        │
  │ Mark 4 lines across ice. Players skate      │
  │ full-ice focusing on full extension...      │
  │ ─────────────────────────────────────────── │
  │ 📝 COACH NOTE                                │
  │ Knees bent, full reach, full recovery...    │
  └─────────────────────────────────────────────┘

(etc.)
```

### Visual specs

- **Drill card:** distinct card with its own border + bg
  - `background: #111823` (slightly lighter than page bg #0D1117)
  - `border: 1px solid rgba(255,255,255,0.12)` (more visible than current)
  - `border-left: 3px solid {sectionAccent}` (colored accent preserved)
  - `border-radius: 10px`
  - `padding: 16px` (mobile) / `20px` (desktop)
  - `gap: 12px` between drill cards
- **Numbered badge (#1, #2):** prominent top-left
  - Same color as section accent, but always visible (not absolutely
    positioned in the side gutter)
- **Drill block + Notes block:** flat inside the drill card, separated by
  thin dividers. Not nested boxes anymore.
- **Mobile (≤640px):**
  - Card padding reduces to 12px
  - Duration pill moves to a NEW line under segment name
  - No left-side accent gutter — accent is the left border only
  - Drill text is full-width
- **Sticky plan context bar (NEW):**
  - Sticky to top, shows: plan title + Save + Mark as Run
  - Hides on the initial header (where those buttons are), shows
    when user scrolls past it
  - Backdrop blur + dark bg so it doesn't fight content
  - Pure CSS `position: sticky; top: 0; z-index: 50` on a wrapper

### Section header shape

- Section title (WARMUP, MAIN DRILLS, COOLDOWN) + total minutes badge
- Colored 2px border-bottom under it (same as current)
- NO list of drills inline anymore — drills are below as separate cards

## Files this touches

| File | Change |
|---|---|
| `src/app/dashboard/plans/[slug]/page.tsx` | MODIFY — rewrite PlanSegment into separate SectionHeader + DrillCard components, add sticky plan context bar |
| `docs/piece-F3-prep-drill-cards-redesign.md` | NEW — this prep doc |

No migrations, no env changes, no new components imported.

## What "must keep working" — verified on production after deploy

- Plan page loads at `/dashboard/plans/{slug}` for ANY plan (no 500)
- All section types (warmup / main / cooldown) render correctly
- All chip pills (focus / duration / age / skill) still present
- Save / Mark as Run buttons still functional
- Back link to `/dashboard/plans` works
- Coach notes section still appears at bottom
- Equipment section still appears (if present)
- "Your plan" badge + Edit link still appears (if user owns the plan)
- Mobile viewport (≤640px): no horizontal scroll, all text readable
- Tablet (641-1024px): cards stack with appropriate spacing
- Desktop (>1024px): cards centered, max-w-4xl preserved

## Rollback plan

One commit, one logical change. Revert = `git revert HEAD` +
`git push origin main`. Vercel redeploys the previous commit in ~30s.
Result: plan detail returns to the old "nested box inside segment card"
shape.

## Audit gates (per Implementation + Audit Protocol)

1. **PREP** — this doc. ✅
2. **BUILD** — one commit, one file modified.
3. **PRE-DEPLOY AUDIT**:
   - next build passes (zero new errors)
   - grep confirms no other files touched
   - ship-check.sh: PASSED (no new imports — using existing next/link)
   - SHIP GATE explicitly re-run on the modified file
4. **SHIP** — Arnel says "ship it".
5. **POST-SHIP AUDIT**:
   - Re-curl rinkstop.com homepage: 200, ticker still working
   - Re-curl a public plan-like page: 200
   - Arnel reviews the actual plan detail page in their browser at
     `/dashboard/plans/u8-u10-skating-fundamentals` (or any plan)
   - Watch Vercel logs for 10-15 min

## Open question for Arnel (one)

**Q1.** Should the editor (PlanBuilder, PlanEditor) get the same drill-card
treatment, or only the detail (read) page?

My read: only the detail page is what Arnel is complaining about. He said
"the drills are still not easily distinguishable" which sounds like a
viewing complaint, not a creation complaint. The editor already has
segment cards with the same shape, and the user's wording is about
distinguishing drills when reviewing/reading, not when creating.

**My recommendation: detail page only, this piece. Editor polish =
separate piece if Arnel wants it later.**
