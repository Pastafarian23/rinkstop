# Phase 1c-4 — Advanced Player Analytics (Identity Plus)

**Status:** DRAFT
**Author:** KiloClaw
**Date:** 2026-07-08
**Source of truth:** Pricing page (https://rinkstop.com/pricing) — "Advanced player analytics" advertised at Identity Plus ($59.99/yr).

---

## 0. Why this piece

Identity Plus ($59.99/yr) promises "Advanced player analytics." Today a player's profile shows their highlightly-cached career stats as raw season rows. The "advanced" layer doesn't exist yet.

This piece adds: season-over-season stat trends, percentile rankings within age group, career milestone tracking, and a visual timeline that combines highlightly career stats + RinkStop user-generated achievements/media.

---

## 1. What this piece does

- Adds a `/dashboard/family/players/[id]/analytics` page (or inline in the existing player profile tab)
- Shows: season stat trends (goals/assists/points per season as a chart), career percentile within the player's age group, milestone achievements unlocked, and a combined timeline of highlightly stats + RinkStop achievements
- Tier gate: Identity Plus+ only (matches pricing — only Identity Plus+ gets this)
- Uses existing highlightly career stats (already cached in `highlightly_career_stats` table) — no new data source needed
- Uses existing `player_achievements` table for milestone data
- v1: charts are simple bar/line charts (no chart library dependency — use inline SVG or a lightweight approach)
- No export, no PDF, no comparison tool (v2)

### Does NOT do (deferred)
- Player-to-player comparison tool
- Export to CSV/Excel
- Predictive analytics / "projected stats"
- Mobile-optimized chart rendering (v2)
- AI-generated commentary on trends (v2)

---

## 2. Schema

No new tables. Reads from:
- `highlightly_career_stats` — per-season stat rows already cached
- `player_achievements` — existing
- `profiles` — for player bio/name/avatar
- `highlightly_players` — for NHL-level player data

---

## 3. Design

**Page:** `/dashboard/family/players/[player_id]/analytics` (or as a tab in the existing player profile page)

**Layout (TBD — to be confirmed with Arnel):**
- Stat trend chart (goals/assists/points by season)
- Percentile rank card ("Top 15% of 2006-born players in your region")
- Milestone achievements unlocked
- Combined timeline: highlightly stats events + RinkStop achievement events

**Style:** Consistent with existing dashboard dark theme. Chart colors from the RinkStop palette.

---

## 4. Tier gate

`requireUserTier(userId, 'identity_plus')` — Verified Identity and below see a "Upgrade to Identity Plus to see advanced analytics" prompt.

---

## 5. Edge cases

- Player has no highlightly stats (not an NHL/imported player): show "Analytics available for players with imported career data" message. Don't show empty charts.
- Player has highlightly stats but no achievements: show stats only, milestones section hidden.
- Identity Plus user tries to access another player's analytics (not their child): 403.

---

## 6. Rollback

- Delete the analytics page file + revert any query changes
- No schema changes, no migration needed
- One-command rollback: `git revert <commit>`

---

## 7. Verification checklist (pre-ship)

- [ ] Build exit 0
- [ ] `/api/player-achievements` still returns 200 for authenticated Identity Plus user
- [ ] No regressions to player profile page
- [ ] Tier gate: Verified Identity user gets 403 on analytics route
- [ ] Identity Plus user gets 200 + data
- [ ] Player with no highlightly stats shows graceful empty state
- [ ] No `eval`, no `dangerouslySetInnerHTML`, no `innerHTML`
- [ ] All chart data from Supabase (no third-party chart API calls)
