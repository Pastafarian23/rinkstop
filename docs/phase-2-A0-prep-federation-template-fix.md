# Phase 2 A-0 — Federation-Template Fix Prep

**Status:** Awaiting Arnel `go`
**Date:** 2026-07-06
**Author:** KiloClaw
**Companion docs:**
- `docs/phase-2-team-admin-audit.md` (audit findings)
- `docs/phase-2-team-admin-gap-fix.md` (5-phase plan)

## Bug

Route: `src/app/api/team/[slug]/apply-federation-template/route.ts:71-77`

```ts
const toInsert = federation.requiredDocKinds
  .filter((doc) => !existingKinds.has(doc.kind))
  .map((doc) => ({
    team_id: team.id,
    kind: doc.kind,           // ❌ column doesn't exist
    title: doc.label,
    description: doc.note ?? null,
    required: true,
    // due_date: null — admin sets it later
  }));
// INSERT INTO team_documents (..., kind, ...) ...
// ❌ kind column doesn't exist
// ❌ file_url NOT NULL but not provided
```

**Live state (verified 2026-07-06 23:55 CDT via Supabase Management API):**
- `team_documents` columns: id, team_id, payment_id, title, description, **file_url (NOT NULL)**, file_name, file_size_bytes, mime_type, required, due_date, created_by, created_at, updated_at
- No `kind` column. No `doc_type` enum.
- 0 rows in `team_documents`.

**Verdict:** Every federation-template POST returns 500. Federation-template is a **dead feature**.

## Fix (Option A — recommended)

Two changes:

1. **Migration** — add `kind` column (nullable TEXT), make `file_url` nullable.
   - `kind` is set at federation-template time (e.g. "liability_waiver", "code_of_conduct").
   - `file_url` becomes nullable because federation rows are placeholders the admin
     uploads a real file for later. The route's intent ("admin sets it later") matches.
2. **Route** — no schema change needed; the route's existing intent already assumes
   `file_url` is null at insert time. Once schema allows it, the INSERT succeeds.

**Why not option B (keep NOT NULL, upload placeholder)?**
Placeholder upload adds zero value (admin immediately replaces it) and is more work.

## Scope statement (per 2026-06-24 Implementation + Audit Protocol)

### What this phase changes
- One new migration: `supabase/migrations/2026-07-06_team_documents_kind_nullable_file_url.sql`
- One route comment update (clarify `file_url: null` is intentional, link to migration)
- (Optional) One admin UI hint: when admin opens a federation-template doc with
  null `file_url`, show "Upload required file" CTA

### What this phase MUST NOT change
- The 14 other team routes (`payments`, `events`, `posts`, `admin`, `sign`,
  `documents`, etc.)
- Player-documents routes (separate system)
- Family wizard / ConsumerCards (no relationship)
- Anything outside `src/app/api/team/[slug]/apply-federation-template/` + the
  migration + an optional admin-UI hint

### Must-keep-working checklist
- [ ] `GET /api/team/[slug]` — team metadata still returns
- [ ] `GET /api/team/[slug]/documents` — admin's own docs list still returns
  (will return 0 docs since table is empty, but the SQL must still execute)
- [ ] `GET /api/team/[slug]/posts` — posts unaffected
- [ ] `POST /api/team/[slug]/events` — events unaffected
- [ ] `POST /api/team/[slug]/payments` — payments unaffected
- [ ] Login + dashboard render — unchanged
- [ ] Family wizard — unchanged

### Rollback plan
Migration is forward-only safe (adds nullable columns, loosens a NOT NULL).
Rollback is:
```sql
-- Cannot fully roll back if rows have been inserted with NULL file_url
-- Best-effort only
ALTER TABLE team_documents DROP COLUMN IF EXISTS kind;
-- file_url cannot be returned to NOT NULL safely (use UPDATE to backfill first)
```
If migration breaks something, the simpler rollback is `git revert <commit>`
+ push. Migration alone doesn't break queries; only INSERT-without-file_url
becomes legal, but no existing INSERT relied on the constraint.

## Smoke test plan (after preview deploy)

1. `GET /api/team/<slug>` → 200 with team metadata
2. Apply a federation template (POST `/api/team/<slug>/apply-federation-template`)
   → expect 200 + `{ok: true, added: N}` instead of 500
3. `GET /api/team/<slug>/documents` → returns the inserted placeholder rows
   with `file_url: null`, `kind: '<federation-doc-kind>'`, `required: true`
4. Verify on Supabase: `SELECT id, kind, title, file_url FROM team_documents`
   shows the inserted rows
5. Negative: try admin DELETE on one of those placeholder docs → expect 200 or
   appropriate response (current behavior is unchanged since A-iv's FK constraint
   change is in a later phase)

## Risks

**Low.** This is a strictly loosening migration:
- Adding a nullable column: zero risk to existing queries
- Making NOT NULL → NULL: zero risk to existing queries that pass a value
- Existing rows: 0 docs, so no backfill concern

The only risk is if a future INSERT explicitly expects NOT NULL — but no such
INSERT exists in the current codebase.

## Implementation steps (in order)

1. Write migration `supabase/migrations/2026-07-06_team_documents_kind_nullable_file_url.sql`
   with two `ALTER TABLE` statements (add `kind TEXT`, drop `NOT NULL` on `file_url`)
2. Update route comment at `src/app/api/team/[slug]/apply-federation-template/route.ts:71-77`
   to clarify `file_url: null` is intentional and link to the migration
3. `pnpm run build` — confirm exit 0
4. **Push to preview branch only** (per Arnel's instruction: A-iii preview first
   rule extends to A-0 since it's the first A-piece — set the pattern)
5. Smoke test on preview URL
6. **Wait for Arnel `go` before merging to main**

## Files touched (preview branch only)

- `supabase/migrations/2026-07-06_team_documents_kind_nullable_file_url.sql` (new)
- `src/app/api/team/[slug]/apply-federation-template/route.ts` (1-line comment)

Total: 1 new file + 1 line edit.