# Piece F Prep — Practice Plans Dark Theme Alignment

## Problem (user-reported, 2026-06-24 21:19 CDT)

Practice plan pages render with **dark backgrounds but light (slate) text/inputs**, producing
illegible text where slate-700 / slate-900 text appears on the site's dark `--bg: #0D1117`.

User's words: *"the practice plans for coach leads to pages with black background and dark text.
Please optimize to match branding of the rest of the site"*

## Root Cause

Six files in `src/components/plans/` and `src/app/dashboard/plans/` use light Tailwind utility
classes (`bg-white`, `bg-slate-50`, `text-slate-700`, `text-slate-900`, `border-slate-200`,
`bg-amber-50`, `bg-emerald-100`, etc.) that were written assuming a light-theme parent.

The rest of the site uses CSS tokens defined in `src/app/globals.css`:
- `--bg: #0D1117` (page bg)
- `--bg-2: #111823` (elevated surfaces)
- `--gold: #FFB81C` (accent / CTA)
- `--red: #C8102E` (action)
- `--navy: #041E42` (deep) — used inconsistently in plans as a button bg
- `--border: rgba(255,255,255,0.08)`
- `--muted: rgba(255,255,255,0.45)`
- `--dim: rgba(255,255,255,0.25)`

## Scope (files to change)

6 files. All in practice plans:

1. `src/app/dashboard/plans/page.tsx` — listing page
2. `src/app/dashboard/plans/[slug]/page.tsx` — detail page
3. `src/app/dashboard/plans/new/page.tsx` — new plan entry stub (renders PlanEditor)
4. `src/components/plans/PlanBuilder.tsx` — create form
5. `src/components/plans/PlanEditor.tsx` — edit form
6. `src/components/plans/PlanCard.tsx` — card on listing
7. `src/components/plans/MarkAsRunButton.tsx` — run-after-practice form
8. `src/components/plans/SaveButton.tsx` — save button (this one is OK — already uses red/white well)

Total: 7 files to fix. SaveButton.tsx reviewed and found compliant.

## Color Mapping (light → dark)

The translation rules, applied consistently:

| Light class | Dark replacement | Purpose |
|---|---|---|
| `bg-white` | `bg-[#111823]` (var --bg-2) | Card / surface background |
| `bg-slate-50` | `bg-[#0D1117]` or transparent | Section background (use page bg) |
| `text-slate-900` | `text-white` | Primary heading |
| `text-slate-700` | `text-white/80` | Body text |
| `text-slate-600` | `text-white/65` | Secondary text |
| `text-slate-500` | `text-white/50` | Muted / meta |
| `border-slate-200` | `border-white/10` | Card / input border |
| `border-slate-300` | `border-white/15` | Input border |
| `bg-[#041E42]` (navy button) | `bg-[#FFB81C]` with `text-[#0D1117]` | Primary CTA — match site accent |
| `text-[#041E42]` (link) | `text-[#FFB81C]` | Inline link |
| `hover:bg-[#041E42]/90` | `hover:bg-[#FFB81C]/90` | Primary CTA hover |
| `bg-amber-50` `text-amber-900` | `bg-[#FFB81C]/10` `text-[#FFB81C]` | Notice / coach notes (preserve gold theme) |
| `bg-red-50` `text-red-900` | `bg-[#C8102E]/10` `text-[#C8102E]` | Error alert |
| `bg-emerald-100` `text-emerald-900` | `bg-emerald-500/10` `text-emerald-400` | Success / saved |
| Focus badges (bg-blue-100 etc.) | Use gold-tinted equivalents with `text-white` for legibility | Focus chip |
| `bg-slate-100` `text-slate-700` (small pill) | `bg-white/5` `text-white/70` | Meta pills |

## Approach (one commit per file)

Per the Implementation Protocol (one-piece-at-a-time, isolated, no side effects):
- 7 commits, one per file
- Each commit only touches color className strings
- No logic, no schema, no query, no API changes
- After each file, audit: does the rest of the page still work? Did I miss any slate/white class?

Audit checklist per file (run `grep` after each edit):
- No remaining `text-slate-*` classes
- No remaining `bg-white` (except where intentional — none expected in plans)
- No remaining `border-slate-*`
- No remaining `bg-amber-50` / `bg-emerald-100` / `bg-red-50` in body content
- All CTAs use gold (#FFB81C) or red (#C8102E)

## Must-Keep-Working

After all 7 commits, on `https://rinkstop.com/dashboard/plans` and `/dashboard/plans/[slug]` and
`/dashboard/plans/new`:

1. **Plan listing loads**: filter form, plan cards grid, "Your saved plans" section
2. **Filters work**: focus/age/duration selects render and submit
3. **Plan card links navigate** to /dashboard/plans/[slug]
4. **Plan detail page renders**: title, summary, focus chip, equipment list, coach notes, segments
5. **Plan editor renders**: form fields, segment list, save button (SaveButton.tsx already correct)
6. **Mark as Run button**: opens form, submits, updates state
7. **No layout shift**: card heights and padding unchanged (only colors swapped)
8. **Other dashboard pages unaffected**: /dashboard, /dashboard/claims, /dashboard/identity still
   render with the existing colors (no global class leaks)

## What I'm NOT changing

- Logic, props, state, refs, callbacks — pure visual swap
- Component structure (no new components, no refactoring)
- API routes, server actions, or Supabase queries
- The SaveButton.tsx file (already uses correct theme)
- Tailwind config (`tailwind.config.js`) — using inline arbitrary values to avoid a config churn
- Other dashboard pages (out of scope; user only flagged practice plans)

## Out of scope (filed for future work)

- `team_owners` / `league_owners` / `rink_operators` audit (separate piece)
- Clean up 2 stale `didit_sessions` rows (destructive, needs explicit approval)
- Merge recovery branch (no longer needed — main already includes Pieces A-E + B)

## Ship plan

1. Write this prep doc (DONE)
2. Show Arnel the prep doc, ask "go"
3. Ship 7 commits to main, one file each, with audit grep between each
4. Final audit pass on all 7 files
5. Arnel visually checks `/dashboard/plans`, `/dashboard/plans/[slug]`, `/dashboard/plans/new`
6. Log to `memory/2026-06-24.md`