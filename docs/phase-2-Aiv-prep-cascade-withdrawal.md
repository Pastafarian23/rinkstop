# Phase 2 A-iv — Cascade Safety + Signature Withdrawal Prep

**Status:** Awaiting Arnel `go`
**Date:** 2026-07-07
**Author:** KiloClaw
**Companion docs:**
- `docs/phase-2-team-admin-audit.md`
- `docs/phase-2-team-admin-gap-fix.md` (lines 273-329, Phase A-iv section)

## Goal

Two things in one piece:

1. **Cascade safety.** Today, `document_signatures` rows are silently wiped when
   their parent document is hard-deleted (`ON DELETE CASCADE`). We want to prevent
   that. Either:
   - Hard deletes require admin to confirm when signatures exist (return 409).
   - Or signatures remain (RESTRICT).

2. **User withdrawal.** A parent/guardian who signed something should be able to
   revoke their own signature with a reason. Audit trail preserved (rows don't
   delete, they get `withdrawn_at` set).

## Verified live state (2026-07-07 ~08:36 CDT)

- `document_signatures` rows: **0** (clean)
- `team_documents` rows: **0** (clean)
- FK state: `document_signatures_document_id_fkey` is `ON DELETE CASCADE` (verified via `pg_constraint`)
- `withdrawn_at` column already exists (added in A-iii migration `2026-07-06_document_signatures_e_sign.sql`)
- No `DELETE /api/team/[slug]/documents/[id]/route.ts` route exists
- No `/withdraw` route exists
- No UNIQUE on `(document_id, signed_by_user_id)` exists — duplicate signs are currently possible

## What this phase changes

### 1. Migration: `supabase/migrations/2026-07-07_signature_safety.sql`

```sql
-- A-iv: cascade safety + idempotent withdrawal.

-- Flip FK to RESTRICT: deleting a doc with signatures should fail loudly.
-- Admin must archive (soft delete) instead.
ALTER TABLE document_signatures
  DROP CONSTRAINT document_signatures_document_id_fkey;
ALTER TABLE document_signatures
  ADD CONSTRAINT document_signatures_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES team_documents(id) ON DELETE RESTRICT;

-- UNIQUE constraint makes withdrawal idempotent and prevents the same
-- user from signing the same doc twice (a parent shouldn't be able to
-- rack up 6 signature rows on a single waiver by clicking "Sign" repeatedly).
-- This CHANGES behavior: today, two sign POSTs = two rows. After, the second
-- will get a unique-violation error from the DB. We handle that as 409 in
-- the route. Acceptable trade-off — the alternative (silent duplicate rows)
-- is worse for compliance.
ALTER TABLE document_signatures
  ADD CONSTRAINT document_signatures_user_unique
  UNIQUE (document_id, signed_by_user_id);
```

**Both changes are forward-only safe.** FK swap is the live behavior change.
UNIQUE add is data-shape enforcement (no existing rows to collide).

### 2. New route: `DELETE /api/team/[slug]/documents/[id]`

```ts
// Auth: admin of the team (existing pattern, same ADMIN_ROLES list as POST).
// Body: none.
// Behavior:
//   - If signatures exist (count > 0): return 409 with
//     { error: 'cannot delete doc with signatures — archive instead', signatures_count: N }
//   - Else: hard-delete the doc row. Storage path cleanup is a separate concern (not done here — storage bucket GC can be a follow-up).
//   - If a foreign-key RESTRICT hits (which is exactly what we want now),
//     catch the 23503 FK violation and return 409 with the same shape.
```

No `?force=true` override. Admin must explicitly archive instead.

**Storage cleanup note:** Hard-deleting a `team_documents` row leaves the file in
the `team-documents` storage bucket. Cleanup is out of scope here. We can add a
follow-up Phase that garbage-collects orphaned storage paths. Today's count = 0
so no backlog.

### 3. New route: `POST /api/team/[slug]/documents/[id]/signatures/[sigId]/withdraw`

```ts
// Auth: only the original signer can withdraw their own signature.
//        Validate sig.signed_by_user_id === auth.userId, else 403.
// Body: { reason: string, min_length_10? }
// Behavior:
//   - Set withdrawn_at = NOW(), withdrawn_reason = reason,
//     withdrawn_by_user_id = auth.userId() (per audit trail).
//   - Return 200 + updated signature row.
// Edge case: already withdrawn? Idempotent — leave withdrawn_at as-is, return 200.
// Edge case: doc was deleted (FK RESTRICT prevents this in practice, but defensive).
//   Return 404 in that case.
```

### 4. UI change: `DocumentsClient.tsx`

For each signed doc in the admin list, surface a "Withdraw" button per signature row
(if `signed_by_user_id === currentUserId`). For the parent's signed docs (rendered
in their own view, if we have one): same button.

Realistically, withdrawal is most useful from the parent side. Today parents sign
from `DocumentsClient.tsx` (the team's view) — that's where the button slots in.
Confirmation modal: "Withdrawing removes your signature from this doc. You may
be asked to sign again. Continue?" + reason textarea (min 10 chars).

For admin's view of signatures: optionally surface a "Withdrawn" badge instead of
"✓ Signed" so they can see who has reversed their signature. Optional polish —
not blocking for first cut.

## What this phase MUST NOT change

- Sign route's allowed payload (consent, dimensions, etc.) — A-iii contract
- A-i distribution/recipient inbox (just shipped `d1f82d1`, independent)
- A-ii minor-attribution UI (separate phase)
- Player-documents system (`player_documents` table — different system entirely)
- Family wizard, ConsumerCards, profile, claiming — no relationship

## Must-keep-working audit checklist

- [ ] Sign flow still works (A-iii contract unchanged)
- [ ] Sign-as-different-user on different docs still works (UNIQUE is per-doc)
- [ ] Sign-as-same-user-twice-on-same-doc → 409 (new behavior, intentional)
- [ ] Admin DELETE on a doc with 0 signatures → 200 (or 204, hard delete)
- [ ] Admin DELETE on a doc with ≥1 signature → 409
- [ ] Parent POST /withdraw on own signature → 200, `withdrawn_at` populated
- [ ] Parent tries to withdraw another user's signature → 403
- [ ] Withdrawal idempotency: calling /withdraw twice → 200, `withdrawn_at` unchanged

## Smoke plan

1. **Migration applied + verified** (live introspection):
   - FK definition now contains `ON DELETE RESTRICT`
   - `document_signatures_user_unique` exists in pg_constraint
2. **Build clean:** `pnpm run build` exit 0
3. **Routes live on prod:**
   - `DELETE https://rinkstop.com/api/team/{slug}/documents/{id}` → 401 (signed-out)
   - `POST https://rinkstop.com/api/team/{slug}/documents/{id}/signatures/{sigId}/withdraw` → 401
4. **Manual smoke (Arnel's coach account):**
   - Coach uploads a doc → signs it once → DB has 1 row
   - Coach uploads another doc → doesn't sign → admin DELETE → 200
   - Coach signs the same doc twice (UI prevents this; manual curl bypasses) → second call → 409 from the new UNIQUE
   - Coach's parent account opens the signed doc → "Withdraw" → DB row has withdrawn_at populated
   - Other parent (different user_id) tries to withdraw coach's signature → 403

## Rollback plan

**Migration:**
```sql
ALTER TABLE document_signatures
  DROP CONSTRAINT document_signatures_user_unique;
ALTER TABLE document_signatures
  DROP CONSTRAINT document_signatures_document_id_fkey;
ALTER TABLE document_signatures
  ADD CONSTRAINT document_signatures_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES team_documents(id) ON DELETE CASCADE;
```
Reversible cleanly (no data to migrate, 0 rows exist).

**Routes:** revert the merge commit. New routes have no callers yet (zero docs
in prod); delete the files.

**UI:** revert the DocumentsClient edit.

Total rollback: `git revert <merge-commit>` + push main.

## Risk

**Medium.** The migration changes real FK semantics. If anyone (admin or
otherwise) is currently relying on cascade-delete to wipe signatures silently,
they'll start getting 409s. Mitigation:
- 0 docs and 0 signatures in prod today (verified).
- The new 409 is the correct behavior — the audit flagged this as a bug.
- Admin who hits 409 gets a clear error message instructing them to "archive instead."

**UNIQUE behavior change:** A parent who double-clicks "Sign" today creates two
rows. After A-iv, the second click returns 409 (or fails the DB insert). The UI
(once we have a "you signed" banner with disabled button) prevents this naturally;
the UNIQUE is a backstop.

## Out of scope (deferred)

- Storage bucket cleanup for orphaned files after hard delete
- "Archive" semantic vs hard delete (today there's no archive column)
- Bulk withdrawal (single-doc only for now)
- Admin "force delete" override (no force param — admin must archive, when archive ships)

## Push plan

1. Apply migration via Supabase Management API
2. Live-verify FK + UNIQUE via `pg_constraint` introspection
3. Two new routes + UI edit
4. `pnpm run build` (exit 0)
5. Smoke 1-3 against production
6. One commit to `main`. Vercel auto-deploys.
7. Arnel does the manual smoke 4 (requires real account + browser session)

## What I will NOT do without your explicit `go`

- Apply the migration
- Push to `main`
- Any storage bucket cleanup
- Add an "archive" column to `team_documents` (separate phase if you want it)
