# Phase 2 Team Admin — Gap Fix Plan (Scope A)

**Status:** Awaiting Arnel sign-off — implementation only after explicit `go`
**Date:** 2026-07-06
**Author:** KiloClaw
**Companion doc:** `docs/phase-2-team-admin-audit.md` (audit findings, read first)

## Context (Arnel's binding guidance)

From message #33357 (2026-07-06 23:53 CDT, pastafarian):
> "Bugs must be fixed and all documents on rinkstop must be legally binding, especially with e signatures"

This expands Scope A from "fix gaps" to "fix gaps + ensure legal binding." The
audit confirmed the current `/sign` endpoint is a typed-name flag — not legally
adequate for liability waivers on a youth-sports platform under RA 8792 (PH)
or ESIGN/UETA (US).

**Legally adequate means:**
- Intent to sign — captured at an explicit "I sign" click (not just typed name)
- Consent to do business electronically — checkbox before sign
- Attribution — bound to a verified `user_id` (typed name is not attribution)
- Signed artifact persistence — the PDF the user saw at sign-time is the
  artifact of record, with the signature block persisted alongside (or baked into)
  the document
- Audit trail — IP, UA, timestamp, document hash at sign-time
- Withdrawal — revoke path exists
- Cascade safety — signatures are not silently wiped when a doc is deleted

## Scope summary

In-scope (Scope A, expanded):
- **A-i.** Distribution model — admin uploads once, families see it in inbox
- **A-ii.** Minor-attribution fix — parent signs flow resolves the child, not the parent
- **A-iii.** Real e-sign semantics — in-app signature capture replacing typed-name flag
- **A-iv.** Cascade safety + withdrawal — drop CASCADE, add revoked_at + withdraw route

Out-of-scope (deferred):
- **A-v.** PDF overlay rendering — bake signature into the PDF artifact itself
  (multi-day rabbit hole on its own, PDF lib choice, server-side rendering, storage)

---

## Live state verification (read-only Supabase queries, 2026-07-06 23:55 CDT)

Confirmed against `yszheonqyyskkjoxoexk` via Management API + PAT. All findings
are verified, not inferred from migration files alone.

### `team_documents` columns (live, 14 columns)
```
id, team_id, payment_id, title, description,
file_url (NOT NULL), file_name, file_size_bytes, mime_type,
required, due_date, created_by, created_at, updated_at
```
**Notable:** No `kind` column. No `recipients` table. No `doc_type` enum.

### `document_signatures` columns (live, 10 columns)
```
id, document_id (FK CASCADE),
player_id (nullable TEXT), signed_by_name (NOT NULL),
signed_by_role (NOT NULL), signed_by_user_id (nullable TEXT),
ip_address (nullable), user_agent (nullable),
acknowledged_at, created_at
```
**Notable:** No `revoked_at`, no `withdrawal_reason`, no `consent_text`,
no `document_hash`, no `signature_payload` (no SVG/PNG bytes), no
`consent_to_electronic`.

### FK on `document_signatures`
```
document_signatures_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES team_documents(id) ON DELETE CASCADE
```
**Confirmed BUG:** cascading delete wipes all signatures if a coach deletes the doc.

### Row counts
```
team_documents: 0 rows
document_signatures: 0 rows
team_workspaces: 2 rows
team_members: 2 rows
```
Empty tables = no migration compat concerns.

### Federation-template BUG (newly discovered via live probe)
Route: `src/app/api/team/[slug]/apply-federation-template/route.ts:71-77`

The route tries to `INSERT INTO team_documents (...) VALUES (..., kind: doc.kind, ...)`.
But `team_documents.kind` column does NOT exist. **Every federation-template
POST throws 500 on insert.** This is a fully broken flow, confirmed live.

Route also omits `file_url` (NOT NULL), which would fail too even if `kind`
existed. Either problem kills the request.

**Verdict:** federation-template is currently a dead feature. Must fix.

---

## Implementation phases

Each phase = one Q2 commit per Arnel's 2026-06-24 Implementation + Audit
Protocol. Per-piece approval before each commit.

### Phase A-0 — Federation-template fix (BEFORE A-i)

**Bug fix, must happen before the audit fix work or the audit becomes
misleading.**

1. Add `kind` column to `team_documents` (TEXT NULL or TEXT with default).
   Migration: `supabase/migrations/2026-07-06_team_documents_kind.sql`.
2. Decide: do federation-template docs require a real file? Two options:
   - (a) Make `file_url` nullable; federation rows are "placeholder/template" docs
     that the admin later uploads a real file for. Cleaner schema, less work.
   - (b) Keep NOT NULL; route has to upload a placeholder PDF server-side
     before insert. More work, no real value.
3. **My recommendation: option (a).** Migration makes `file_url` nullable +
   `kind` column non-null. Route updates the federation-template insert to
   set `file_url: null`. Admin uploads the real file later.
4. Smoke test: hit `POST /api/team/<slug>/apply-federation-template` with a
   real team id, confirm 200 + 0 broken docs.

**Push:** one migration + one route edit. Build + audit before push.
**Risk:** low. Federation-template was broken before; this can only improve.

### Phase A-i — Document distribution + recipient inbox

**Goal:** admin uploads once → fans out to N players/families → each
family has a "received docs" inbox.

1. **Migration `2026-07-06_team_document_recipients.sql`:**
   ```sql
   CREATE TABLE team_document_recipients (
     id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     document_id     UUID NOT NULL REFERENCES team_documents(id) ON DELETE CASCADE,
     recipient_user_id  TEXT NOT NULL,  -- user_xxx Clerk id, parent account
     recipient_player_id UUID,           -- player profile id when scoped to a kid
     delivered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     opened_at       TIMESTAMPTZ,       -- first inbox view
     completed_at    TIMESTAMPTZ,       -- signed + acknowledged
     archived_at     TIMESTAMPTZ,       -- user dismissed
     created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     UNIQUE (document_id, recipient_user_id)
   );
   CREATE INDEX idx_recipients_user ON team_document_recipients(recipient_user_id);
   CREATE INDEX idx_recipients_player ON team_document_recipients(recipient_player_id);
   ALTER TABLE team_document_recipients ENABLE ROW LEVEL SECURITY;
   -- RLS: users can SELECT rows where recipient_user_id = auth.uid()
   -- RLS: team admins can INSERT/SELECT on rows for their team's docs
   ```

2. **Route changes:**
   - `POST /api/team/[slug]/documents` — accept `recipient_user_ids[]` +
     optional `recipient_player_ids[]` for fan-out. When provided, insert
     into `team_document_recipients`.
   - `GET /api/inbox/documents` (new) — parent's view of received docs,
     joined with `team_documents` + `team_workspaces` for display.
   - Mark `opened_at` on first GET (idempotent — don't overwrite first view).

3. **UI changes:**
   - `DocumentsClient.tsx` — when uploading, show recipient picker (multi-select
     from team roster).
   - Family inbox: new `/dashboard/family/documents` page (or a "Team docs"
     section in the existing family page).
   - Notification: extend `team-notifications.ts` to include "you received a doc"
     on insert.

4. **Must-keep-working audit:**
   - Existing GET `/api/team/[slug]/documents` (admin's own list) — must not break
   - Existing player-documents routes — different system, must not break

5. **Smoke:**
   - Admin uploads → 2 recipients created
   - Parent A GETs /inbox/documents → sees doc + `delivered_at`
   - Parent A GETs again → `opened_at` populated, not double-written
   - Admin's own list still shows doc

**Push:** one migration + 2-3 route edits + 2 page edits.
**Risk:** medium. New table + RLS = potential policy mistakes.

### Phase A-ii — Minor-attribution fix

**Bug:** when a parent signs on behalf of a kid, `player_id = NULL`, so the
signature attaches to the parent's row. For roster-counting compliance
("X of N signed the waiver"), this is wrong.

1. **Route change `POST /api/team/[slug]/documents/[id]/sign`:**
   - Accept optional `player_id` in body.
   - When present: validate the parent's `managed_profiles` includes this player
     (reject 403 otherwise).
   - Set `player_id` on the signature row.
   - Default: when absent, behavior unchanged (parent signs for themselves).

2. **UI change** in `DocumentsClient.tsx`:
   - When signing a required team-wide doc (e.g. liability waiver), show a
     child picker if the parent has kids in this team.
   - Required for: liability waiver, medical consent. Optional for: informational
     documents.

3. **Must-keep-working audit:**
   - Sign flow still works when `player_id` is absent (parent self-sign)
   - Non-parent roles (player, coach) can sign without `player_id`

4. **Smoke:**
   - Parent with 2 kids signs waiver for kid 1 → row has `player_id = kid1`
   - Parent self-signs another doc → row has `player_id = NULL` (unchanged)
   - Parent tries to sign for unrelated kid → 403

**Push:** one route edit + one UI edit.
**Risk:** low. Additive.

### Phase A-iii — Real e-sign semantics (the big one)

**Goal:** replace typed-name flag with in-app signature capture.

1. **Migration `2026-07-06_document_signatures_e_sign.sql`:**
   ```sql
   ALTER TABLE document_signatures
     ADD COLUMN IF NOT EXISTS consent_to_electronic BOOLEAN NOT NULL DEFAULT false,
     ADD COLUMN IF NOT EXISTS consent_text TEXT,                 -- exact text the user agreed to
     ADD COLUMN IF NOT EXISTS document_hash TEXT,                 -- sha256 of PDF bytes at sign-time
     ADD COLUMN IF NOT EXISTS signature_payload TEXT,             -- SVG markup of the captured signature
     ADD COLUMN IF NOT EXISTS signature_width INTEGER,
     ADD COLUMN IF NOT EXISTS signature_height INTEGER,
     ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ,
     ADD COLUMN IF NOT EXISTS withdrawn_reason TEXT,
     ADD COLUMN IF NOT EXISTS withdrawn_by_user_id TEXT;
   ```
   Note: `signed_by_name` and `signed_by_role` stay (audit/display), but
   `signed_by_user_id` becomes effectively required for new signatures
   (validate in route, leave existing rows alone).

2. **Route change `POST /api/team/[slug]/documents/[id]/sign`:**
   - Body now: `{ consent_to_electronic, consent_text, signature_payload (SVG),
     signature_width, signature_height, player_id? }`
   - Validate `consent_to_electronic === true` (reject 400 otherwise)
   - Fetch the PDF bytes from storage; compute SHA-256; store as `document_hash`
   - Insert signature row with all fields populated
   - Return 201 + the new signature id

3. **New components `src/components/team-documents/`:**
   - `SignaturePad.tsx` — HTML5 canvas capture, exports SVG markup
   - `ConsentCheckbox.tsx` — checkbox + required-link-to-consent-text
   - `SignDocumentModal.tsx` — composes the two above + sign button

4. **UI integration `DocumentsClient.tsx`:**
   - "Sign" button opens `SignDocumentModal`
   - Modal shows: PDF preview, consent text (loaded from doc.metadata or
     hardcoded fallback "I agree this is a binding electronic signature"),
     consent checkbox, signature pad
   - "Sign" button disabled until checkbox + non-empty signature
   - On submit: POST, then refresh doc list to show "Signed ✓ by you on DATE"

5. **Must-keep-working audit:**
   - Admin's GET `/api/team/[slug]/documents` — sign count must remain
     computable (signature count by document_id)
   - Existing signed rows (0 today) — schema migration backfills work even
     with empty data
   - Storage path access — `download-url` route must still resolve paths

6. **Smoke:**
   - GET `/api/team/[slug]/documents` → 200 + (still works with no docs)
   - Sign with empty signature → 400
   - Sign without consent_to_electronic → 400
   - Sign with both → 201, row has `document_hash`, `signature_payload`,
     `consent_to_electronic=true`
   - Sign twice for same doc by same user → 409 (or use UNIQUE constraint to
     make this happen server-side; document_signatures doesn't have UNIQUE
     on (document_id, signed_by_user_id) yet — could add)

**Push:** one migration + 1 route edit + 3 new components + 1 page edit.
**Risk:** high. Schema migration + new UI flow + canvas capture.
Mitigation: test on preview branch first, ship in stages.

### Phase A-iv — Cascade safety + withdrawal

**Goal:** no silent signature wipe on doc delete; user can revoke their own
signatures.

1. **Migration `2026-07-06_signature_safety.sql`:**
   ```sql
   -- Drop the cascade; replace with RESTRICT.
   ALTER TABLE document_signatures
     DROP CONSTRAINT document_signatures_document_id_fkey;
   ALTER TABLE document_signatures
     ADD CONSTRAINT document_signatures_document_id_fkey
     FOREIGN KEY (document_id) REFERENCES team_documents(id) ON DELETE RESTRICT;

   -- (Schema for revocation columns already added in A-iii.)
   -- Add a UNIQUE so withdrawal is idempotent.
   ALTER TABLE document_signatures
     ADD CONSTRAINT document_signatures_user_unique
     UNIQUE (document_id, signed_by_user_id);
   ```

2. **Route change `DELETE /api/team/[slug]/documents/[id]`:**
   - If signatures exist, return 409 with `{ error: 'cannot delete doc with signatures — archive instead', signatures_count: N }`
   - Or add a `force=true` query param: `?force=true&reason=...` for admin override.
     Recommended: no force. Admin must explicitly archive instead.

3. **Route change `POST /api/team/[slug]/documents/[id]/signatures/[sigId]/withdraw`:**
   - Auth: only the original signer can withdraw their own
   - Body: `{ reason }`
   - Sets `withdrawn_at`, `withdrawn_reason`, `withdrawn_by_user_id`
   - Returns 200 + updated row

4. **UI change** `DocumentsClient.tsx`:
   - For each signed doc, show "Withdraw signature" button
   - Confirmation modal: "Withdrawing removes your signature from this doc.
     You may be asked to sign again. Continue?" + reason textarea
   - On success: row shows "Withdrawn on DATE"

5. **Must-keep-working audit:**
   - Team admin can still `archive` a doc (soft delete) — separate from hard delete
   - Existing signatures remain queryable + their audit trail intact

6. **Smoke:**
   - Admin DELETE doc with 1 signature → 409
   - Parent POST /withdraw on own signature → 200, `withdrawn_at` populated
   - Parent tries to withdraw another user's signature → 403
   - Verify `withdrawn_at` shows up in admin's "signed count" view as
     "withdrawn, not counted as signed"

**Push:** one migration + 2 route edits + 1 UI edit.
**Risk:** low-medium. Schema migration is safe (empty tables).

---

## Push cadence + per-piece rules

Per Arnel's 2026-06-24 Implementation + Audit Protocol:

1. Each phase = one Q2 commit, pushed to `main` only after Arnel `go`
2. Each push: build clean + preview smoke + must-keep-working audit + ship
3. If a phase breaks the must-keep-working list, revert + report
4. Never bundle phases (no atomic merge of A-i + A-ii)

## What I need from Arnel before each phase

| Phase | Need from Arnel |
|---|---|
| **A-0** (federation-template fix) | `go` to push. Recommend merging into A-i unless blocking. |
| **A-i** (distribution) | `go` after reviewing prep doc + smoke plan |
| **A-ii** (minor-attribution) | `go` after reviewing prep doc |
| **A-iii** (real e-sign) | `go` after reviewing prep doc; recommend preview branch first |
| **A-iv** (cascade + withdrawal) | `go` after reviewing prep doc |

## Things this plan does NOT do

- ESIGN Act / RA 8792 legal certification (engineer-side, not legal-side)
- PDF overlay rendering (A-v, separate scope)
- Doc template system (waiver templates, consent templates)
- Auto-renewal of waivers (e.g. every season)
- Notary integration
- Doc retention policies beyond standard row-level persistence

## Risks I'm flagging up front

1. **A-iii is the biggest piece.** Canvas + signature storage + consent UI is
   real work. Estimate 1-2 focused days for the schema migration + new components,
   plus another day for UI integration + smoke. Not a one-shot Q2.
2. **Existing data is empty (0 docs, 0 signatures).** All migrations are
   forward-only — no backfill work needed. This is a clean slate.
3. **RLS policies on the new recipient table are the #1 source of bugs.** Need
   to test from BOTH the admin's perspective (can insert/select their team's
   recipients) and the parent's perspective (can select only their own rows).
4. **A-iii + A-iv share a constraint change.** If A-iv (DROP FK, ADD RESTRICT)
   is pushed before A-iii (new columns), the unique constraint works fine
   either way. But the order matters for shipping safely: push A-iii first
   (new columns, no breakage), then A-iv (FK + UNIQUE change, breaks admin
   hard-delete but in a controlled way).

## Status

- ✅ Audit: complete, doc written
- ✅ Live state verified: federation-template BUG confirmed, FK cascade confirmed,
  columns confirmed
- ⏳ Gap doc: this file, awaiting Arnel sign-off
- ⏳ Implementation: not started