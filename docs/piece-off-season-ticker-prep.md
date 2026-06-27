# Piece: Off-Season Welcome Ticker (replaces ScoreTicker)

**Status:** Prep doc, awaiting Arnel's "go" before any code is written.

## Scope (verified against Arnel's messages, no scope creep)

Replace the live NHL score ticker with a static off-season welcome strip. This is the **only** ticker visible for now. Arnel will explicitly tell me when to bring back the NHL score ticker (presumably preseason / opening night).

## Source of requirements

- Arnel's original ask: NHL season is over, Stanley Cup champions already crowned, scores are not relevant in the off-season.
- Arnel explicitly rejected: "Try hockey free this summer" chip (no free program to promote).
- Arnel explicitly chose chip 2: **C ("Find a rink near you" → /directory/rinks)** followed by **D ("Explore local hockey teams" → /directory/teams)**.
- Arnel explicitly chose order: A (welcome → rinks), then C, then D.

## Final chip list (locked — 4 chips, not 5)

1. 🏒 **Welcome to RinkStop — Find a rink near you** → `/directory/rinks`
2. ⛸ **Find a rink near you** → `/directory/rinks`
3. 🏒 **Explore local hockey teams** → `/directory/teams`
4. 📋 **Claim your team listing** → `/claim-your-listing`

**Chip 5 ("Find fall youth hockey programs near you") is DEFERRED.** Arnel confirmed we have no youth hockey data in the database yet. The chip stays out of the rotation until youth programs are populated. When that happens, this is a one-line addition (and a `/directory/youth` or equivalent route must exist first — verify before adding).

## Files this touches (verified)

| File | Change |
|---|---|
| `src/components/OffSeasonTicker.tsx` | **NEW.** Static off-season welcome strip. |
| `src/components/ScoreTicker.tsx` | **NO CHANGE.** Kept on disk for future restore. |
| `src/app/layout.tsx` | **MODIFY.** Swap `import ScoreTicker` → `import OffSeasonTicker` + replace `<ScoreTicker />` → `<OffSeasonTicker />` at the same position. |

No migrations, no env changes, no API changes, no new deps.

## What `OffSeasonTicker.tsx` does

- 38px strip, navy `#041E42` bg, red `#C8102E` bottom border — matches ScoreTicker's visual frame so the swap looks intentional.
- Pinned left label "WELCOME TO RINKSTOP" in red `#C8102E` uppercase — same position where ScoreTicker's "NHL" label was.
- 4 chips on a single horizontal track (not 5 — chip 5 is deferred until youth hockey data exists).
- Same CSS keyframe animation as ScoreTicker: `translateX(-50%)` over ~50s linear infinite, `animation-play-state: paused` on hover. Two copies of the chip array rendered sequentially for seamless wrap.
- Each chip is a `<Link>` with the emoji + text + arrow → href.
- Heights, font sizes, paddings, hover behavior mirror ScoreTicker's pattern so it reads as "the same component in a different mode."

## What this does NOT do

- ❌ Does NOT call `/api/nhl/playoffs/ticker`.
- ❌ Does NOT detect season status (no API check, no date check). It is the only strip, period.
- ❌ Does NOT auto-swap back to ScoreTicker. Restoration is a separate piece triggered by Arnel saying so.
- ❌ Does NOT touch `FeaturedTicker.tsx` (the red directory ticker). That keeps running below the new welcome strip.
- ❌ Does NOT modify any other layout, page, API route, or component.

## Must-keep-working checklist (verify on production after deploy)

- Homepage renders with the new off-season strip at the top.
- Strip height ~38px, navy bg, red bottom border.
- "WELCOME TO RINKSTOP" label pinned on the left.
- All 4 chips visible, rotating continuously, pausing on hover.
- All 4 chip hrefs resolve (200 / 307 redirect to auth, not 404):
  - `/directory/rinks` → 200
  - `/directory/teams` → 200
  - `/claim-your-listing` → 200
- FeaturedTicker (red strip below) still renders and rotates.
- Mobile viewport: chips overflow horizontally, animation continues, no layout shift.
- `ScoreTicker.tsx` still exists in the repo (untouched, just unimported).

## Rollback plan

One commit, one logical change. Revert = `git revert <commit>` + `git push origin main`. Vercel redeploys the previous commit in ~30s. Result: ScoreTicker returns to layout.tsx, off-season strip disappears.

## Audit gates (per Implementation + Audit Protocol)

1. **PREP** — this doc. ✅
2. **BUILD** — one commit, two files (new OffSeasonTicker.tsx + layout.tsx import swap).
3. **PRE-DEPLOY AUDIT**:
   - next build passes (zero new errors)
   - grep confirms ScoreTicker.tsx unchanged
   - grep confirms no other layout/page/API changes
   - All 5 chip hrefs verified live (curl each)
4. **SHIP** — Arnel says "ship it".
5. **POST-SHIP AUDIT**:
   - Re-curl rinkstop.com → 200, new strip visible
   - Re-curl the 3 must-not-break routes: /, /directory/rinks, /directory/teams → all 200
   - Watch Vercel logs for 10-15 min

## Open question (one, not asking twice)

None. Spec is locked. Awaiting Arnel's "go" / "ship it" / "tweak X" on this prep doc.
