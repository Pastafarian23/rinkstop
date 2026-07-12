# Phase 1c-5 — Youth-Friendly Player Analytics

**Status:** DRAFT (awaiting Arnel approval before implementation)
**Author:** KiloClaw
**Date:** 2026-07-08
**Parent piece:** Phase 1c-4 (commit `8284ba7`, deployed) — Advanced Player Analytics, Identity Plus+
**Source of truth:** Arnel msg #35403, #35444, #35470 — "most users will not have any highlightly stats… not applicable to youth players"

---

## 0. Why this piece

Phase 1c-4 shipped analytics that only renders meaningful data when a player has rows in `highlightly_career_stats`. That table is populated from NHL/NCAAH/PWHL sync only — youth players (the bulk of the RinkStop audience) will never have rows there. The Identity Plus feature therefore shows an empty-state for 90%+ of the paying audience.

This piece makes the analytics card useful for youth parents by surfacing data we ALREADY collect: their kid's achievements, documents, team memberships, and milestones. No new data source, no new sync.

---

## 1. What this piece does

Adds three "RinkStop history" stat cards to the existing analytics section on `/dashboard/family`, shown alongside (and instead of, when no highlightly data) the current empty-state message:

1. **Achievements** — count from `player_achievements` for this player. If 0, shows "Add your first achievement →" link to the existing achievement form.
2. **Documents** — count from `player_documents` for this player. If 0, shows "Upload a document →" link.
3. **Team Memberships** — count from `team_members` for this player. If 0, shows "Add a team →" link.

Layout:
- Three side-by-side cards above the existing highlightly stats block
- If highlightly stats are present: highlightly block stays, RinkStop history sits BELOW it
- If highlightly stats are absent: RinkStop history is the entire visible content (replaces the current "No career stats found" message)

Tier gate: unchanged from 1c-4 (Identity Plus+). The data shown is already free for the user; we're just rendering it in the analytics surface.

### Does NOT do (deferred)
- Aggregate stats across all linked children ("your family has 12 achievements total") — v2
- Trend over time ("achievements per month") — needs more data than v1
- Achievements by category breakdown — v2
- Documents-by-type breakdown (birth cert, waiver, medical) — v2

---

## 2. Schema

No new tables. Reads from:
- `player_achievements` — existing, has `player_id` FK to `players.id`
- `player_documents` — existing, has `player_id` FK to `players.id`
- `team_members` — existing, has `player_id` (or whatever the linking column is — verified in §3)

---

## 3. Design — pre-implementation checks

Before coding, the prep needs to verify three things against the live code:

**(a) `player_documents.player_id` — uuid FK to players.id?**
Need to confirm. The 1b-1 migration should have set this. If not, query against `managed_profiles.profile_id` instead.

**(b) `team_members` linkage to players.**
team_members is the team-workspace roster. Need to find the column that links a team_members row to a `players.id` (could be `user_id` for adults or some `player_id` for youth). This is the riskiest assumption in the prep — verified live before writing the query.

**(c) Current PlayerAnalyticsClient data flow.**
The existing client fetches from `/api/player/[id]/stats/season-trends`. Three options for adding the new counts:
- **Option 1 (preferred):** Extend the existing route to also return achievements_count, documents_count, memberships_count. Single fetch, atomic load. Client renders whatever the API sends.
- Option 2: Add a second endpoint `/api/player/[id]/counts`. Two fetches.
- Option 3: Server-side pre-compute in the family page (like the existing `achievementsByPlayer` and `documentsByPlayer` records) and pass to the component as a prop. No new API.

**Recommend Option 1** — keeps the component self-contained, single round-trip, and the route already touches the same tables.

---

## 4. Tier gate

Unchanged. `requireUserTier('identity_plus')` is already enforced server-side by the existing API route. The family page shell also enforces the gate, so this component only renders for eligible users.

---

## 5. Edge cases

- Player exists but has no achievements/docs/memberships: shows the three cards all in their "0 — Add your first one →" state. Page is still useful because it gives the user clear next actions.
- Player doesn't exist at all: route returns 404, component shows error state (existing behavior).
- Player has highlightly stats AND RinkStop history: both sections render. Highlightly on top, RinkStop history below.
- Player has highlightly stats but no RinkStop history: highlightly on top, RinkStop history below in its "Add your first…" state.
- Player is a managed profile but the parent isn't signed in: family page redirects to /login (existing gate).

---

## 6. Rollback

- Revert the route changes (one file, one commit)
- Revert the component changes (one file, one commit)
- Revert the family page prop changes if any
- No schema changes, no migration needed
- One-command rollback: `git revert <commit>`

---

## 7. Verification checklist (pre-ship)

- [ ] `pnpm build` exit 0
- [ ] `pnpm run lint` clean (or pre-existing warnings only)
- [ ] `/api/player/<id>/stats/season-trends` returns 200 with new counts for a player that has at least one of each
- [ ] Same route returns 200 with zeros for a player that has none
- [ ] Same route returns 401 anon, 403 below-tier, 403 not-your-player (existing)
- [ ] `/dashboard/family` renders the new cards without layout shift for the existing sections (Documents, Achievements, Media, Schedule, Payments)
- [ ] No `eval`, no `dangerouslySetInnerHTML`, no `innerHTML` writes
- [ ] No new third-party deps

---

## 8. Out of scope reminder

The "corrections flow" (Stage 2 / piece B from the 35470 discussion) is a separate piece. Do not bundle. Bundle = same trust-erosion pattern that triggered the 2026-06-24 Ship Gate.

The corrections piece needs its own prep doc, its own migration (new `corrections` table), its own admin UI, its own spam-protection API surface. That's a 2-3 day piece on its own.

---

## 9. Estimated work

- Prep doc verification (sections 3a/3b/3c): 0.5 day
- Route extension (counts in response): 0.25 day
- Component update (three cards + render logic): 0.5 day
- Smoke tests + build gate + commit: 0.25 day

**Total: ~1.5 days.** Ship as one commit.