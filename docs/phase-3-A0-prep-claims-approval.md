# Phase 3-A0 — Claims Approval + Player Self-Claim

**Status:** APPROVED (Arnel: "Proceed with path x" — msg 35899)
**Author:** KiloClaw
**Date:** 2026-07-08
**Source of truth:** Real architectural gap discovered during 3-A0 prep — claim submissions today have no admin approval path.

---

## 0. Why this piece

`/claim-your-listing` accepts claims (rink, team, player) but no admin endpoint or UI exists to approve/reject them. Claims sit at `status='pending'` forever. This was discovered while building 3-A0 (add players to search).

Fixes a real bug + closes the self-managed-player loop from 1c-6.

## 1. What this piece does

### 1a. Admin claims review endpoint

`POST /api/admin/claims/[id]/review` — admin-only via `getAdminFromRequest()`.

Body: `{ action: 'approve' | 'reject', note?: string }`.

On approve:
- Update `claims.status='approved'`, set `reviewer_user_id`, `reviewer_note`, `reviewed_at`.
- **For player claims only:** also set `players.user_id = claim.user_id`. This is the self-managed-player linkage.
- The existing `claim_approved_trigger` (migration `2026-06-29`) fires automatically on status change → analytics event recorded.

On reject:
- Update `claims.status='rejected'`, set reviewer fields.
- No side effects.

### 1b. Admin claims queue UI

`/admin/claims` — admin-only (hard-coded `arnellarracas@gmail.com`, same pattern as `/admin/corrections`).

Three sections:
- **Pending** (oldest first): entity, submitter, reason, claim type. Approve / Reject buttons with optional reviewer note.
- **Recently reviewed** (collapsible): approved/rejected history.
- Same dark-card UI as `/admin/corrections`.

### 1c. Players tab on `/claim-your-listing`

Add a "Players" tab next to Rinks and Teams. Same search input. Backend:

```sql
SELECT id, slug, first_name, last_name, nationality, birth_date, user_id
FROM players
WHERE is_active = true
  AND (first_name ILIKE %q% OR last_name ILIKE %q%)
LIMIT 20;
```

Display:
- Name + nationality (if set)
- Birth year if available
- "CLAIMED" / "PENDING" badge if a claim exists
- "You manage this player" if `players.user_id` is set (= self-managed)
- Claim button otherwise → `/dashboard/claims?entity=player&id=...&name=...&source=player`

### 1d. Existing pieces reused (no changes)

- `/api/claims` (POST) — already accepts `claim_type: 'player'`.
- `/dashboard/claims` — already handles player claims.
- `claims` table — already has rows for player claims.
- `/api/entities/[type]/[id]/claim` (GET) — already supports `player` claim_type.
- `claim_approved_trigger` — fires on status change, no edit needed.

## 2. Schema

No new tables. The `players.user_id` column was added in 1c-6 (migration `2026-07-08_players_user_id.sql`).

## 3. Pre-implementation checks (live)

**(a) Verify the `claim_approved_trigger` exists and fires.**
**(b) Verify `claims` table has columns: id, user_id, claim_type, entity_id, entity_name, reason, status, created_at.**
**(c) Verify there are NO existing pending claims** (to start the queue clean).

## 4. Tier gate

No tier gate on submit. Admin-only on review.

## 5. Edge cases

- Approving a player claim when `players.user_id` is already set to a DIFFERENT user: log warning, do NOT overwrite (data integrity). Surface in UI as "already managed by another user".
- Approving a rink/team claim: just flip status. No side effect (no equivalent to `players.user_id` for those types yet).
- Concurrent approvals: last-write-wins on `claims.status`. The trigger fires twice (analytics dedupe index handles that).
- Claim with no `entity_id` (some legacy claims may have null): show in queue but disable Approve button (nothing to apply).

## 6. Rollback

- Delete `/admin/claims`, `/api/admin/claims/[id]/review`, the Players tab from `/claim-your-listing`.
- Revert `players.user_id` write in the review endpoint (or delete the endpoint).
- One-command rollback: `git revert <commit>`.

## 7. Verification checklist

- [ ] `pnpm build` exit 0
- [ ] `/admin/claims` anon → 307→/login
- [ ] `/admin/claims` non-admin user → redirect to /dashboard
- [ ] `/admin/claims` admin → renders queue
- [ ] Approve button on a rink claim → status flips to approved, claim_approved_trigger fires (analytics event recorded)
- [ ] Approve button on a player claim → status flips + `players.user_id` set
- [ ] `/claim-your-listing?type=player&q=mcdavid` returns NHL-style player results
- [ ] Player result for an already-self-managed player → shows "You manage this player" instead of Claim button
- [ ] No `eval` / `dangerouslySetInnerHTML` / `innerHTML` writes

## 8. Out of scope

- Email notification on claim approval (v2)
- Public "claimed by X" links on the listing pages (already implemented in `/api/entities/[type]/[id]/claim`)
- Multi-admin review (current single-admin hard-code follows corrections page pattern; moves to `profiles.role` when Arnel appoints others)

## 9. Estimated work

- Pre-implementation checks: 0.25 day
- /api/admin/claims/[id]/review: 0.5 day
- /admin/claims page: 0.75 day
- /claim-your-listing Players tab: 0.5 day
- Smoke tests + build + commit + deploy: 0.5 day

**Total: ~2.5 days. Ship as one commit.**