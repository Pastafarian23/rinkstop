# Piece F2 Prep — Practice Plans Layout Polish

## User-reported issues (2026-06-24 22:41 CDT, msg #23879)

> "I can see the text against the background, but it looks like a bunch of jumbled text with no clear division between drills. The dropdown filters at the top don't look like dropdowns either. Please improve the whole layout and match to branding"

**Two distinct issues:**

1. **Detail page (`/dashboard/plans/[slug]`)**: segments look like jumbled text, no clear division between drills
2. **Listing page (`/dashboard/plans`)**: filter dropdowns don't look like dropdowns

## Root cause

### Detail page jumble

The `PlanSegment` component renders each segment as:
```jsx
<li className="rounded-lg border border-white/10 bg-[#111823] p-4">
  <h3>name</h3>
  <span>{duration_min} min</span>
  {drills && <p><span>Drill:</span> {drills}</p>}
  {notes && <p className="italic">{notes}</p>}
</li>
```

**Problems:**
- "Drill:" label is inline-styled — easy to miss as a divider vs a paragraph continuation
- Notes (italic) and drills look like one continuous block of text
- No number/index per segment
- No visual anchor (icon/emoji) per segment type
- No section dividers between warmup/main/cooldown
- Duration badge is a small text pill, not visually anchored to the segment
- Equipment list (top of page) uses flat pills — same flat styling as everything else

### Listing dropdowns

The 3 `<select>` elements use `bg-[#0D1117]` + `text-white` but native browser `<select>` controls ignore most styling — they render the OS dropdown chrome. On macOS/Windows/Linux, the dropdown panel uses light system colors regardless. The result: a small dark box on the page that opens a light OS panel — looks broken / unstyled.

**Solution:** build custom dropdowns as client components (button + panel) instead of `<select>`. Or use `<select>` + heavy custom CSS (`appearance: none`) + custom dropdown indicator + explicit option styling via the `color-scheme: dark` CSS property.

## Scope (3 files modified)

### File 1: `src/app/dashboard/plans/[slug]/page.tsx` (detail page)

Restructure the `PlanSegment` component and add visual anchors:

- **Section header**: large heading with emoji + total duration badge on right; add a thin colored accent bar (warmup=red, main=gold, cooldown=teal)
- **Per-segment card**: numbered circle on left (1, 2, 3...), segment name as heading, duration pill on right; drills get a clear "DRILL" badge label, notes get a "NOTE" badge label with italic text in a muted style — clearly distinct blocks
- **Equipment section**: header gets an icon + count, items become visually distinct pills with a subtle border

### File 2: `src/app/dashboard/plans/page.tsx` (listing)

Replace native `<select>` dropdowns with custom button-driven dropdowns via a new `Dropdown.tsx` client component. Dropdown items:
- Gold accent border on focus / open
- Clear visual indicator (chevron) on the trigger
- Dark panel for the menu (matches site bg)
- Keyboard navigation (arrow keys, Enter, Esc)
- Click-outside to close

### File 3: `src/components/ui/Dropdown.tsx` (new)

Reusable dropdown that:
- Renders a styled `<button>` as trigger (visible dark chrome, gold border, chevron)
- Opens a `<ul>` panel below on click (dark bg, white text, hover highlight)
- Handles keyboard nav (Up/Down/Enter/Esc)
- Closes on outside click
- Submits the form via a hidden `<input type="hidden">` so server-side filter still works
- Accessible (aria-expanded, aria-haspopup, role=listbox)

## Files NOT changed

- Practice plans API (`src/app/api/plans/*`) — no logic changes
- Plan data schema — no migration
- Other dashboard pages (out of scope; only plans were called out)
- The plans/new and plans/[slug]/edit forms — those are working with the same dark theme and the user didn't flag them
- The plans/[slug]/edit page — if a user is editing, they presumably wrote the structure themselves and don't need fancy visual treatment
- PlanCard component — works fine in the listing
- SaveButton, MarkAsRunButton — already polished in Piece F

## Must-keep-working (audit checklist)

After F2 ships:
1. ✅ Filter dropdowns still submit server-side (form action, GET method)
2. ✅ Each dropdown still has all original options (focus/age/duration)
3. ✅ Apply filters / Clear buttons still work
4. ✅ Detail page segment cards still render all fields (name, duration, drills, notes)
5. ✅ Coach notes section still renders with gold accent
6. ✅ Equipment section still renders all items
7. ✅ Save / Mark as run buttons still work
8. ✅ PlanCard in listing still works
9. ✅ Edit page (`/[slug]/edit`) still renders
10. ✅ Mobile responsive (cards stack, dropdowns full-width)

## Out of scope (filed for future)

- Filter animation polish
- Multi-select filters
- Mobile bottom-sheet style dropdown
- Filter pill chips (URL-driven, no form submit)
- Calendar-style date filters
- Reordering segments via drag-drop
- Inline editing of segments on the detail page

## Ship plan

1. Write this prep doc (DONE)
2. Show Arnel, ask "go"
3. Ship 1 commit: Dropdown.tsx + plan page changes + detail page changes
4. Audit: type-check + curl + visit each page
5. Log to `memory/2026-06-24.md`

## Why 1 commit (not 3)

The 3 changes are tightly coupled: the dropdown style change only works because we have a `Dropdown` component. The detail page restructure doesn't need any external component. Combining into one commit is acceptable because:
- Single feature: "plans page readability"
- All changes in the plans section
- No risk to other features
- Reversible as a single revert

If we hit issues, can split later. One commit ships faster.