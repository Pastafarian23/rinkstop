# Phase 3-A0 — Claim Your Listing: Player Search + Self-Claim

**Status:** APPROVED (Arnel: "Proceed with a" — msg 35875)
**Author:** KiloClaw
**Date:** 2026-07-08
**Source of truth:** Arnel correction #35863 — "I told you /claim-your-listing was 'next, no prep doc exists, ~2 days.' That was wrong. The page is already shipped" — confirmed by reading src/app/claim-your-listing/page.tsx (commit `67c4a37`, today).

---

## 0. Why this piece

`/claim-your-listing` already exists (commit `67c4a37`) and ships search across **rinks + teams** with claim status badges, tier-gated claim buttons, and a no-results fallback.

It does **not** search players. Combined with the 1c-6 work (migration `players.user_id` lets a Clerk user own a player row), there's no UI path today for a self-managed adult to find their own player row and "claim" themselves.

This piece closes that loop:
1. Add a "Players" tab to the search.
2. Wire the claim button on player results to the existing `/dashboard/claims` flow.
3. Verify end-to-end: search → click claim → submit → row gets `players.user_id = userId` on approval.

## 1. What this piece does

### 1a. Players search tab

New third tab on `/claim-your-listing` next to Rinks and Teams. Same search input. Backend query:

```sql
SELECT id, slug, first_name, last_name, nationality, birth_date
FROM players
WHERE is_active = true
  AND (first_name ILIKE %q% OR last_name ILIKE %q%)
LIMIT 20;
```

Same display pattern as rink/team results:
- Name (with nationality badge if non-null)
- Birth year if available
- "Claim" button if no active claim; "CLAIMED"/"PENDING" badge otherwise

### 1b. Self-claim special path

When a player row's `user_id` is already set (= self-managed), the CLAIMED badge shows the player themself as the claimer. The existing `/api/entities/[type]/[id]/claim` GET already supports `player` claim_type — no change needed there.

When a player row's `user_id` is null (= unclaimed), the Claim button works the same as rink/team: links to `/dashboard/claims?entity=player&id=...&name=...&source=player`.

On claim APPROVAL (admin reviews and approves):
- The existing `claims` row goes to `status='approved'`
- We additionally set `players.user_id = claim.user_id` so the player becomes self-managed

The set-user-id step is the only NEW behavior in the approval flow. Without it, "claim yourself" doesn't actually link the player row to the claimer.

### 1c. Existing pieces that already work

- `/api/entities/[type]/[id]/claim` (GET) — already supports `player` claim_type.
- `/api/claims` (POST) — already accepts `claim_type: 'player'`.
- `/dashboard/claims` — already handles player claims (form uses generic entity_type).
- The `claims` table — already has rows for player claims.

So the only NEW code is:
- Add Players tab to `/claim-your-listing/page.tsx`
- Add the player branch to `searchEntities()`
- Add the player branch to `RinkResultCard` → renamed `EntityResultCard`
- Hook into claim approval to set `players.user_id` (one new function)

## 2. Schema

No new tables. Reads from:
- `players` (existing — needs `is_active` boolean, confirmed live)
- `claims` (existing — player claim_type already supported)

## 3. Pre-implementation checks

**(a) Verify `players.is_active` column exists and is populated.**
**(b) Verify a player claim already in `claims` table works end-to-end.**
**(c) Verify the existing claim approval flow doesn't already set `players.user_id`.** (Per 1c-6 prep doc, this was the "claim yourself UX flow" that was deferred.)

## 4. Tier gate

Same as rinks/teams. The claim button passes the tier check via the existing `getMaxClaimsForTier` flow.

## 5. Edge cases

- Player has no `slug` (very old rows): show name + link to `/directory/players/[id]` instead of `/directory/players/[slug]`.
- Player `is_active = false`: exclude from search results.
- Player `birth_date` is null: just show name + nationality, no "age N" line.
- Player `user_id` already set (= self-managed): search still returns them, but the claim button shows "You manage this player" (links to `/dashboard/analytics/[id]` for context).
- Player has a pending claim: badge shows "PENDING" and the claim button is hidden (same as rinks/teams).

## 6. Rollback

- Revert `/claim-your-listing/page.tsx` (Players tab added → removed)
- Revert the hook in claim approval that sets `players.user_id`
- One-command rollback: `git revert <commit>`

## 7. Verification checklist

- [ ] `pnpm build` exit 0
- [ ] `/claim-your-listing?type=player&q=mcdavid` returns NHL-style player results
- [ ] Clicking Claim on an unclaimed player row → `/dashboard/claims` with `entity=player&id=...`
- [ ] Admin approves a test player claim → `players.user_id` is set on the row
- [ ] Self-managed player (after approval) appears in search with "CLAIMED" badge and links to analytics
- [ ] Anon → 307→/login on /claim-your-listing (existing behavior preserved)
- [ ] No `eval` / `dangerouslySetInnerHTML` / `innerHTML`

## 8. Out of scope

- "Claim yourself" landing page that introduces the concept to first-time users (separate piece)
- Public profile links for self-managed players (already exists at /players/[slug])
- Migration to backfill `players.user_id` for players who already have a `claims` row pointing at them (deferred — admin can manually approve a fresh claim to trigger the linkage)

## 9. Estimated work

- Pre-implementation checks: 0.25 day
- /claim-your-listing Players tab: 0.5 day
- Claim-approval hook to set players.user_id: 0.25 day
- Smoke tests + build + commit + deploy: 0.5 day

**Total: ~1.5 days.** Ship as one commit.