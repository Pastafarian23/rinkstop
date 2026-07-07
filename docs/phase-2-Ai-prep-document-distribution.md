# Phase 2 A-i — Document Distribution + Recipient Inbox Prep

**Status:** Awaiting Arnel `go`
**Date:** 2026-07-07
**Author:** KiloClaw
**Companion docs:**
- `docs/phase-2-team-admin-audit.md` (audit findings)
- `docs/phase-2-team-admin-gap-fix.md` (5-phase plan, A-i section starting line 124)
- `docs/phase-2-A0-prep-federation-template-fix.md` (Phase A-0 already shipped 2026-07-06 as `55fc606`)

## Goal

Admin uploads once → fans out to N players/families → each family has a
"received docs" inbox. This is the core distribution pipeline. A-ii
(minor-attribution fix) is a separate piece and is NOT bundled here.

## Verified live state (2026-07-07 ~02:50 CDT, via git + `ls supabase/migrations/`)

- `team_documents` table exists (schema modified by A-0 migration `2026-07-06_team_documents_kind_nullable_file_url.sql`)
  - columns: `id, team_id, payment_id, title, description, file_url (nullable now), file_name, file_size_bytes, mime_type, required, kind (new), due_date, created_by, created_at, updated_at`
  - 0 rows
- `team_document_recipients` table: **does not exist** — needs to be created.
- `document_signatures` table exists (A-iii migration `2026-07-06_document_signatures_e_sign.sql`)
- Existing upload route: `src/app/api/team/[slug]/documents/route.ts` (64 lines, current logic only inserts into `team_documents`)
- `DocumentsClient.tsx` at `src/app/dashboard/team/[slug]/documents/DocumentsClient.tsx` (admin UI for upload)
- No `/api/inbox/documents` route exists yet
- No `/dashboard/family/documents` page exists yet

## What this phase changes

### 1. New migration: `supabase/migrations/2026-07-07_team_document_recipients.sql`

```sql
CREATE TABLE team_document_recipients (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id           UUID NOT NULL REFERENCES team_documents(id) ON DELETE CASCADE,
  recipient_user_id     TEXT NOT NULL,                 -- Clerk user_xxx parent account
  recipient_player_id   UUID,                          -- player profile when scoped to a kid
  delivered_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at             TIMESTAMPTZ,                  -- first inbox view (write once)
  completed_at          TIMESTAMPTZ,                  -- signed + acknowledged
  archived_at           TIMESTAMPTZ,                  -- user dismissed
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, recipient_user_id)
);
CREATE INDEX idx_recipients_user ON team_document_recipients(recipient_user_id);
CREATE INDEX idx_recipients_player ON team_document_recipients(recipient_player_id);
CREATE INDEX idx_recipients_doc ON team_document_recipients(document_id);

ALTER TABLE team_document_recipients ENABLE ROW LEVEL SECURITY;

-- Parents can read their own recipient rows
-- ⚠️ CAST NOTE: `auth.uid()` returns UUID; recipient_user_id is TEXT.
--    The cast is `auth.uid()::text`, matching every other RLS policy in this
--    codebase that compares against Clerk `user_xxx` ids (verified in
--    supabase/migrations/2026-06-22_coach_feed.sql:36, 2026-06-13-listings.sql:111, etc.).
CREATE POLICY "recipients_select_own" ON team_document_recipients
  FOR SELECT USING (recipient_user_id = auth.uid()::text);

-- Insert is done by the upload route via service-role + admin role check;
-- no INSERT policy for authenticated users.
-- (Service role bypasses RLS, just like every other admin route in this codebase.)
```

**Why the `recipient_user_id` is TEXT (Clerk id), not UUID:**
matches the pattern used by `team_documents.created_by` and `team_members.user_id`
throughout the existing schema (verified by grep). Will revisit only if there's
a reason to change the type — not bundled here.

**Why no INSERT policy:**
Every existing admin-side route in this codebase uses `supabaseAdmin` (service
role) to do writes. Adding an INSERT policy for `auth.uid()` would create a
second code path with different semantics. Not bundled here.

### 2a. Tier-gate decision (correction to initial plan)
The original A-i prep doc did not specify tier gating for the new
`/dashboard/family/documents` page. **Decision: NO tier gate.** Receiving a
waiver/handout your coach sent you is independent of whether the parent has
a paid Identity Plus tier. Parents see the page based on Clerk auth only.
Rationale: gating on tier would silently drop critical documents to
non-paying parents, which is wrong for a primitive that's part of the team
admin distribution flow.

### 2. Route edit: `src/app/api/team/[slug]/documents/route.ts`

After the existing `team_documents` INSERT succeeds, fan out:

```ts
// new — after doc insert, before NextResponse.json({ ok: true })
if (Array.isArray(body.recipient_user_ids) && body.recipient_user_ids.length > 0) {
  const rows = body.recipient_user_ids.map((uid: string) => ({
    document_id: doc.id,
    recipient_user_id: uid,
    recipient_player_id: body.recipient_player_id ?? null,
  }));
  const { error: fanoutErr } = await supabaseAdmin
    .from('team_document_recipients')
    .insert(rows);
  if (fanoutErr) {
    // doc was created; recipients failed. Don't 500 (upload succeeded for caller).
    // Log + return ok with a warning so UI can show "uploaded, N recipients pending retry"
    console.error('[team_documents] recipient fan-out failed', fanoutErr);
    return NextResponse.json({ ok: true, document: doc, fanout_warning: fanoutErr.message });
  }
}
```

**Backwards compat:** if `recipient_user_ids` is absent or empty (existing
admin flow), behavior is identical to before. Existing callers see no change.

### 3. New route: `src/app/api/inbox/documents/route.ts`

```ts
GET /api/inbox/documents
// auth required (parent's Clerk id == auth.uid())
// returns: parent's received docs (not archived), newest first
// joins: team_documents + team_workspaces for display
// side effect: SET opened_at = NOW() WHERE opened_at IS NULL on first read
// (idempotent — uses .is('opened_at', null) filter, no double-write)
```

Implementation notes:
- Use `supabaseAdmin` (consistent with rest of codebase).
- Filter `archived_at IS NULL` for default view; query param `?include_archived=1` for archive view (NOT in this phase, defer).
- Return shape: `[{ document: {...}, team: {id, slug, name, logo_url}, recipient: {...} }]`

### 4. UI change: `DocumentsClient.tsx`

When admin uploads, show a multi-select recipient picker sourced from the team
roster (everyone with `team_members.role != 'parent_external'` or whatever
filter matches what we already use — need to check `team_members` schema when
implementing; verified at audit time, not now).

Smoke-only change. Defer fancy UX (search, groups) — basic checkbox list is enough
for first cut. If the roster is large (50+), add a search input. Otherwise no.

### 5. New page: `/dashboard/family/documents/page.tsx`

Renders the parent's inbox via the new route. Server component that
fetches from `supabaseAdmin` (matches existing family-page pattern at
`src/app/dashboard/family/page.tsx`).

For first cut: list view, click → opens document in new tab via existing
`/api/team/[slug]/documents/[id]/download-url/route.ts`. Inbox-level
actions (mark complete, archive) deferred — A-i ships the read path, A-iii
already shipped the sign/acknowledge flow on the document itself.

## What this phase MUST NOT change

(Per 2026-06-24 Implementation + Audit Protocol — isolation rule.)

- Other `team_documents` reads/writes (`GET`, sign route, download-url route)
- Player-documents system (entirely separate table)
- A-ii minor-attribution fix (different piece, different merge)
- A-iii e-sign semantics (already shipped `632e1af`, do not retouch)
- Family wizard, ConsumerCards, profile, claiming — no relationship
- Other team admin routes (payments, events, posts, members, attendance)

## Must-keep-working audit checklist

Run these against production after deploy before announcing done:

- [ ] `GET /api/team/[slug]/documents` (admin list) — still returns same shape for a team with 0 docs
- [ ] `POST /api/team/[slug]/documents` without `recipient_user_ids` — still works (backwards compat)
- [ ] `POST /api/team/[slug]/documents/[id]/sign` — still works (A-iii surface)
- [ ] `GET /api/team/[slug]/documents/[id]/download-url` — still works
- [ ] Player documents pages — unchanged
- [ ] Family wizard + ConsumerCards — unchanged
- [ ] Login + dashboard render — unchanged

## Smoke plan (new behavior)

1. **Migration applied:** verify table exists with expected columns via Supabase Management API.
2. **Admin uploads with 2 recipients:**
   ```bash
   curl -X POST /api/team/<slug>/documents \
     -H "Authorization: Bearer <admin>" \
     -d '{"title":"Team Handout","file_url":"https://...","recipient_user_ids":["user_a","user_b"]}'
   # expect: 200, doc.id, no fanout_warning
   # verify: SELECT count(*) FROM team_document_recipients WHERE document_id = <id> → 2
   ```
3. **Parent A GETs `/api/inbox/documents`:**
   - expect: 200, sees 1 doc + team info + delivered_at
   - verify: `SELECT opened_at FROM team_document_recipients WHERE recipient_user_id = 'user_a' AND document_id = <id>` → NOT NULL
4. **Parent A GETs again:**
   - verify: `opened_at` unchanged (same timestamp, not double-written)
5. **Existing admin `GET /api/team/<slug>/documents`:**
   - expect: still returns the doc we just uploaded

## Rollback plan

**Migration:**
```sql
DROP TABLE IF EXISTS team_document_recipients CASCADE;
```
Drops the table, all policies, all indexes. No other table references it
(fresh table). Reversible cleanly.

**Route edits:**
- `documents/route.ts`: revert to 64-line version (git revert).
- `api/inbox/documents/route.ts`: delete file (new route, no callers).
- `DocumentsClient.tsx`: revert.
- `dashboard/family/documents/page.tsx`: delete file (new page).

Total rollback: revert the merge commit on main. Vercel redeploys previous
commit in ~30s.

## Risk

**Medium.** New table + RLS = policy mistakes possible. Mitigation:
- RLS policy is single-condition `auth.uid()` match. Trivial to verify.
- Service-role writes for admin path (consistent with rest of codebase).
- Smoke plan covers all 3 acceptance paths and the backwards-compat path.

No bundling with A-ii (minor-attribution) per 2026-06-24 protocol.

## Push plan

1. Apply migration via Supabase Management API.
2. Verify table + policy + indexes via Management API introspection.
3. Code edit (3 files: route edit, new route, UI picker) + new page.
4. `pnpm run build` (exit 0).
5. Smoke 1-5 against local + production.
6. One merge commit to `main`. Vercel auto-deploys.
7. Post-ship audit per 2026-06-24 protocol (re-run smoke against prod URL).

## What I will NOT do without your explicit `go`

- Apply the migration (`2026-07-07_team_document_recipients.sql`)
- Push to `main`
- Any dashboard configuration changes
