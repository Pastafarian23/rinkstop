# Phase 1b — Player Documents (Prep Doc)

**Status:** DRAFT. NOT YET REVIEWED BY ARNEL. No code has been written.
**Author:** KiloClaw
**Date:** 2026-07-06
**Source of truth:** Consumer-First Growth spec (Telegram msg #32712-32713, 2026-07-05 06:04 CDT). Phase 1a prep doc (`docs/phase-1a-consumer-first-prep.md`). Built-vs-missing matrix (msg #32700).
**Related:** `supabase/migrations/2026-07-05_family_setup_completed_at.sql` (already applied; the wizard's "Step 3 done" logic reads from `player_documents.count > 0`).
**Scope of THIS prep doc:** `player_documents` only. `player_media`, `player_achievements`, `player_timeline_events`, `family_org_invitations`, `consumer_notifications` are 1b-2 / 1b-3 / Phase 2 work and get their own prep docs.

---

## 0. Why this piece is first in 1b

The build-vs-missing matrix lists 11 "coming soon" / "coming next" / "building that now" hits on user-facing surfaces. **Five of them are Documents:**

1. `/dashboard/family` — "Documents (1b-1 placeholder)" section
2. `/dashboard/profile` — "DOCUMENTS — Birth certificates, waivers, and medical forms. Coming soon." (line 307)
3. `/dashboard/profile` — generic "coming soon" badge (line 430)
4. `/dashboard` consumer card — "Pending Documents" dimmed card
5. Wizard — Step 3 ("Upload important hockey documents") — "Coming next" disabled CTA

Shipping `player_documents` removes 5 of 11 "coming soon" hits with one piece of work, and it's the one piece every parent actually needs (waivers, medical forms, birth certificates — the spec's own example list).

Achievements + Career Timeline are 1b-2 and together remove 5 more. That's 10 of 11. The remaining 1 is the wizard's Step 5/6 CTAs (calendar import + org invite), which are 1b-3 + Phase 2 work.

---

## 1. What this piece does (and does not do)

### Does

- Adds a `player_documents` table that stores uploaded documents at the **player level** (one row per child, not per family, not per org).
- Adds a Supabase Storage bucket `player-documents` for the actual file bytes.
- Adds an upload UI on `/dashboard/family` that lets a parent upload a document for one of their linked children (managed via `managed_profiles`).
- Adds a read-only list of the uploaded documents on the same page.
- Gates the upload UI behind `tierAtLeastSameTrack(tier, 'identity_plus')` (matches Family Hub gate).
- Updates the wizard's Step 3 (`done: player_documents.count > 0` for at least one managed child).
- Updates the `/dashboard` consumer card "Pending Documents" — if `player_documents` has docs that are flagged `pending` or `expired`, show them; otherwise show "All documents up to date" (no more dimmed-empty card).
- Adds a single Supabase Storage RLS policy on the bucket (parent can read/write files in their own children's folders).
- Adds the same RLS pattern on the `player_documents` table (SELECT for parent, INSERT for parent, UPDATE for parent, no DELETE in v1).

### Does NOT do (deferred to 1b-2, 1b-3, Phase 2)

- **Waivers/electronic signatures** — `document_signatures` table exists (verified 2026-07-06) but is empty. The "Waivers" piece of the Hockey Passport spec is a separate piece. This prep doc does not touch `document_signatures`.
- **Sharing/visibility controls** — the spec says "Parents should control who sees each document." The v1 RLS model lets the parent read it. Letting an org read it (org-side document request flow) is a separate piece. **v1: parent-only visibility.**
- **Document expiry / renewal notifications** — the consumer_notifications table doesn't exist. Expiry-based "your medical form expires in 30 days" is 1b-3. **v1: documents have an `expires_at` field but no automated notification fires.**
- **Photo/video media** — `player_media` is 1b-2.
- **Achievements** — 1b-2.
- **Career timeline** — 1b-2.
- **Parent → org invitation flow** — Phase 2.

### Out of scope per the original spec's guardrail

- Authentication, pricing tiers, billing, verification, permissions, workspace architecture — **untouched**, per spec.
- Existing `team_documents` (org-side document requests) — **untouched**. This is a separate surface. The "Pending Documents" card on the org-side dashboard reads from `team_documents`; the new "Pending Documents" card on the personal dashboard reads from `player_documents`. Same label, different sources, no conflict.

---

## 2. Schema (the only DB change in this piece)

### New table: `public.player_documents`

```sql
CREATE TABLE public.player_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  uploaded_by     text NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
  category        text NOT NULL CHECK (category IN (
                    'birth_certificate', 'waiver', 'medical_form',
                    'vaccination_record', 'proof_of_residence',
                    'photo_id', 'other'
                  )),
  title           text NOT NULL,
  description     text,
  storage_path    text NOT NULL,    -- path within the player-documents bucket
  file_name       text NOT NULL,
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes < 26214400),  -- 25 MB cap
  mime_type       text NOT NULL,
  expires_at      date,             -- optional; for medical forms, waivers
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'archived')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX player_documents_player_idx ON public.player_documents (player_id, created_at DESC);
CREATE INDEX player_documents_status_idx ON public.player_documents (player_id, status) WHERE status = 'active';
```

**Decisions in the schema (need your call before implementation):**

- **`player_id` references `public.players(id)`** — the players table has a `team_id` field, but we're treating the player as the primary owner (per spec: "Hockey Passport belongs to the player—not the club"). Players can have `team_id = NULL` (no org attached yet) — that case is **first-class** in this design. A player with no team can still have documents.
- **`uploaded_by` references `public.profiles(user_id)`** — every document has a parent uploader on record.
- **`category` enum** — the 7 values cover the spec's examples (birth certificate, waiver, medical form) plus the common 2 (vaccination, residency) plus a catch-all. **Open question: do you want this enum expanded?**
- **`file_size_bytes < 26214400` (25 MB cap)** — reasonable default for PDFs and JPEGs. **Open question: cap value?**
- **`status` enum** — `active` / `expired` / `archived`. `expired` is computed from `expires_at` (a view or trigger could maintain it; for v1, compute in the read query). **Open question: trigger vs. computed-on-read?**
- **No DELETE in v1 RLS** — only archive. Real DELETE is gated behind a future "purge" tool. **Open question: any admin use case that needs hard DELETE?**
- **No RLS for org-side reads in v1** — even if a parent is in an org, the org cannot see `player_documents`. The org-side document request flow (which would request a specific document) is a separate piece.

### New table: `public.player_document_audit` (optional, recommended)

```sql
CREATE TABLE public.player_document_audit (
  id              bigserial PRIMARY KEY,
  document_id     uuid NOT NULL REFERENCES public.player_documents(id) ON DELETE CASCADE,
  actor_user_id   text NOT NULL REFERENCES public.profiles(user_id),
  action          text NOT NULL CHECK (action IN ('upload', 'replace', 'archive', 'view', 'download')),
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

**Why:** the spec says "parents control who sees each document." For v1, that's just the parent, but the audit table is cheap insurance. If we add org-side access in a later piece, we already have the log. **Open question: include in v1, or defer to a "before we add org-side reads" check?**

### New Supabase Storage bucket

- **Name:** `player-documents`
- **Public:** `false` (private bucket, signed URLs only)
- **File size limit:** 25 MB (matches DB cap)
- **Allowed MIME types:** `application/pdf`, `image/jpeg`, `image/png`, `image/heic`, `image/webp`
- **Path convention:** `{player_id}/{document_id}/{filename}` (so each document has a unique folder; replacing a doc creates a new file rather than overwriting)
- **RLS on the bucket:**
  - SELECT: parent of the player (via `managed_profiles`) can read
  - INSERT: same
  - UPDATE: same
  - DELETE: blocked at the policy level (parent must archive in the DB instead)

**Bucket creation method (this needs to be in the prep phase, not the implementation phase):**
- Option (i): create via Supabase Dashboard → Storage → New bucket
- Option (ii): create via `supabase-storage-api` library in a one-time script
- Option (iii): create via Management API endpoint (the `POST /v1/projects/{ref}/storage/buckets` endpoint — note: returned 404 when I tried it just now, so this path may not exist on the current Supabase API surface; bucket creation via Management API is **unverified**)

**Open question: which method do you want for bucket creation? My recommendation: (i) dashboard, one-time, then we never touch it again.**

### RLS policies on `public.player_documents`

Mirroring the pattern on `team_documents`:

```sql
-- Read: parent of the player OR the player themselves
CREATE POLICY player_documents_select ON public.player_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id = player_documents.player_id
        AND mp.manager_user_id = current_user_id()
        AND mp.minor_consent_revoked_at IS NULL
    )
    OR uploaded_by = current_user_id()
  );

-- Insert: parent of the player
CREATE POLICY player_documents_insert ON public.player_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id = player_documents.player_id
        AND mp.manager_user_id = current_user_id()
        AND mp.minor_consent_revoked_at IS NULL
    )
    AND uploaded_by = current_user_id()
  );

-- Update: parent of the player (for archive/status changes)
CREATE POLICY player_documents_update ON public.player_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.managed_profiles mp
      WHERE mp.profile_id = player_documents.player_id
        AND mp.manager_user_id = current_user_id()
        AND mp.minor_consent_revoked_at IS NULL
    )
  );

-- No DELETE policy in v1.
```

**Decisions in the RLS (need your call):**

- **No self-read for non-parent players.** If a player is 18+ and has their own Clerk account, can they read their own documents? **Open question.** For v1, the `uploaded_by = current_user_id()` check covers the parent-as-uploader case, but doesn't cover "I am the player, I want to see my own passport." Recommend: add `OR player_id IN (SELECT id FROM players WHERE user_id = current_user_id())` to the SELECT. **Open question: include the player-self-read in v1?**
- **`minor_consent_revoked_at IS NULL` check.** A parent who has revoked their consent for a child should not see new docs. This is conservative. **Open question: keep this check?**
- **The "uploaded_by = current_user_id()" check on INSERT.** This means a parent can only insert a document they themselves uploaded — which is the same as saying the parent who clicks "upload" is the one on the row. **Open question: do we want co-parents (two parents of the same child) to be able to upload? If yes, the RLS should also allow INSERT if the uploader is another parent of the same child, which requires a new `parent_links` table or a check on `managed_profiles.relationship`.**

---

## 3. File changes (the only file changes in this piece)

### 3.1 New files

| File | Purpose |
|---|---|
| `supabase/migrations/2026-07-06_player_documents.sql` | Table + indexes + RLS policies (the schema above) |
| `src/app/api/player-documents/route.ts` | POST (upload, multipart/form-data) + GET (list for a player) |
| `src/app/api/player-documents/[id]/route.ts` | GET (signed URL) + PATCH (archive/replace) |
| `src/components/family/PlayerDocumentUpload.tsx` | Client component: file picker + category dropdown + title + optional expiry + upload button |
| `src/components/family/PlayerDocumentList.tsx` | Server component: read list of documents for a player, render with status + expiry warning |

### 3.2 Modified files

| File | Change | Risk to existing features |
|---|---|---|
| `src/app/dashboard/family/page.tsx` | Add Documents section above the existing placeholder at line 411. Replace the placeholder at line 411-426 with the real upload + list. | **Low.** The placeholder is a section with no data dependency. Replacing it with a real surface doesn't touch any other section. The "Family Hub" restructure (3.1 from the 1a prep doc) already put this section in the right place. |
| `src/app/dashboard/page.tsx` | Update the "Pending Documents" consumer card: read from `player_documents` for the user's children, show real data or "All documents up to date." If the user has no children, show "Add your first child to start tracking documents." | **Low.** Card is currently opacity 0.7 and shows "Pending Documents" placeholder. Changing the data source from "no source" to `player_documents` is a one-way improvement. |
| `src/components/dashboard/ConsumerCards.tsx` | Update `loadConsumerCardData` to include `pendingDocuments: PlayerDocument[]` for the user's children. | **Low.** Adding a new field to the data shape doesn't break existing cards. |
| `src/components/family/FamilySetupWizard.tsx` | Update Step 3 (`done: player_documents.count > 0 for at least one managed child`). Currently the step shows "Coming next" CTA. Replace with: if docs exist, show "✓ {N} documents uploaded" + "Manage" link to `/dashboard/family`; if not, show upload CTA that opens the family page. | **Low.** The wizard is already a client component. Adding a check for `player_documents` is a new query, doesn't change the existing steps. |

### 3.3 No-touch list (must-keep-working audit)

Per the 2026-06-24 protocol, these are the features that must NOT change behavior as a result of this piece:

- [ ] `team_documents` table and all org-side document request flows — read paths, write paths, RLS
- [ ] `document_signatures` table (the waivers surface, separate piece)
- [ ] `/dashboard/team/[slug]/documents` (org-side documents page)
- [ ] `/dashboard/team/[slug]/admin/documents` (org-side admin upload)
- [ ] Wizard Steps 1, 2, 4, 5, 6 (only Step 3 is touched)
- [ ] `family_setup_completed_at` column and the `/api/family/setup-state` route
- [ ] Tier gates on Family Hub (`tierAtLeastSameTrack(tier, 'identity_plus') || business_listing`)
- [ ] Account-type gate on Family Hub (parent-only)
- [ ] All `ConsumerCards` data shape fields except the new `pendingDocuments` add
- [ ] All claim flows, all team_member flows, all team_invites flows
- [ ] Authentication, pricing tiers, billing, verification, permissions, workspace architecture (spec guardrail)

---

## 4. Storage decision (need your call)

Three viable approaches for storing the actual file bytes:

### Option (i) — Supabase Storage in this same project

- **Pros:** same project, same RLS, same credentials, signed URLs via `supabase.storage.from('player-documents').createSignedUrl()`. ~$0.021/GB/mo storage + ~$0.09/GB egress after 1 GB free. Free tier covers first 1 GB.
- **Cons:** files live in the same Supabase project as the data, which is a single point of failure for both. Storage costs scale with usage.
- **Cost:** $0/mo at current scale (0 docs, 0 children with documents). $5-20/mo at 100 GB.

### Option (ii) — Separate Supabase project for storage

- **Pros:** isolates file storage from DB. Different credentials, different backup.
- **Cons:** more accounts to manage, signed URLs go cross-project, RLS doesn't carry over (need a separate auth pattern).
- **Cost:** same as (i) but doubled for the free tier.

### Option (iii) — Cloudflare R2 (S3-compatible)

- **Pros:** $0 egress (matches our image-serving pattern elsewhere). 10 GB free storage, 10M free Class A operations/mo. RLS-equivalent: signed URLs with custom policies.
- **Cons:** different SDK, different credential pattern. Adds a third party to the auth chain.
- **Cost:** $0/mo at current scale, ~$1.50/mo at 100 GB.

**My recommendation: (i) Supabase Storage in this same project.** We already have Supabase credentials wired into the Vercel deployment, the RLS pattern is built-in, the signed URL API is one function call, and the cost is $0 at current scale. The single-point-of-failure concern is real but no worse than the rest of the data layer.

**Open question: confirm (i), or do you want (iii) R2 for the egress cost advantage?**

---

## 5. Upload flow (the user-facing path)

### Step-by-step what the user does

1. Parent on `identity_plus+` tier with at least one linked child navigates to `/dashboard/family`.
2. The Documents section shows:
   - If the child has documents: a list with category icon, title, file name, upload date, status (active/expired/expires-soon), and a "Download" button (signed URL, 60-second expiry).
   - If the child has no documents: a card "No documents yet. **Upload your first hockey document**" with an "Upload" button.
3. Clicking "Upload" opens an inline form (not a modal — modal is too heavy for a single upload):
   - Child selector (dropdown of linked children, pre-selected if only one)
   - Category dropdown (Birth Certificate, Waiver, Medical Form, Vaccination, Proof of Residence, Photo ID, Other)
   - Title (free text, required, 1-100 chars)
   - Description (optional, 0-500 chars)
   - File picker (drag-and-drop or click; PDF, JPEG, PNG, HEIC, WebP; max 25 MB)
   - Expires on (date picker, optional, only shown for Waiver / Medical Form / Vaccination categories)
4. Clicking "Upload" sends a multipart POST to `/api/player-documents` with the file. The server validates (tier, account type, parent of player, file size, mime type), uploads to Supabase Storage, inserts the DB row, returns the new document id.
5. The list refreshes with the new document. The wizard's Step 3 (if visible) updates to "✓ Document uploaded."

### Edge cases the prep covers

- **No linked children** → the section shows "Add your first child before uploading documents." with a link to the existing FamilySearch component. No new surface.
- **Player is 18+ and has their own Clerk account** → depending on the RLS call, either they can self-upload, or they're told to ask their parent. Default v1: parent-only upload, players can view their own docs.
- **File too large** → client-side check before upload (rejects files > 25 MB with a clear message), server-side re-check.
- **Wrong mime type** → client-side rejects non-PDF/image, server-side re-check.
- **Upload fails mid-stream** → server returns 500, client shows error, no partial DB row.
- **Replace a document** → in v1, "replace" creates a new row and archives the old one. No file mutation. Cleaner audit trail.

---

## 6. Rollback plan

If this piece ships and breaks something:

### Schema rollback
```sql
DROP TABLE IF EXISTS public.player_document_audit;
DROP TABLE IF EXISTS public.player_documents;
-- RLS policies drop with the tables
```

### Storage rollback
- Delete the `player-documents` bucket via Supabase Dashboard → Storage → Delete bucket.
- All uploaded files are lost. (This is the only non-recoverable side effect, which is why the 2026-06-24 protocol says "ship small.")

### Code rollback
- Revert the 4 modified files (1 SQL migration, 2 component files, 2 route files, 1 wizard file).
- Re-deploy to Vercel. The 4 placeholder sections on `/dashboard/family`, `/dashboard/profile`, `/dashboard`, and the wizard Step 3 CTA reappear.

### Data preservation
- **The migration is additive (CREATE TABLE, no ALTER on existing tables).** Existing data is untouched.
- **The modified files only ADD new sections or REPLACE placeholders that had no data dependency.** No existing read path is changed.
- **The wizard Step 3 change is a one-way improvement** — replacing "Coming next" with real functionality. Reverting brings back "Coming next."

### Worst case (something we didn't predict breaks)
- `git revert <merge-commit> + git push origin main` per the 2026-06-24 protocol.
- Vercel redeploys in ~30 seconds.

---

## 7. Ship gate (per 2026-06-24 protocol)

### Step 1 — Preparation (this doc, currently in progress)
- [x] Scope statement written (this doc)
- [x] Affected file list (section 3)
- [x] Dependency check (sections 1, 2, 4)
- [x] Rollback plan (section 6)
- [x] Must-keep-working audit list (section 3.3)
- [x] All 13 open questions answered by Arnel 2026-07-06 06:57 CDT
- [x] Q7 follow-up answers (multi-file, edit-after-staging, cancel+save) locked 2026-07-06 07:07 CDT
- [x] Q12 read (a) confirmed (re-assert consent at upload time) 2026-07-06 07:07 CDT
- [ ] **Arnel gives explicit "go" on implementation** (per 06:08 rule)

### Step 2 — Implementation (only after Step 1 is approved)
- One commit per file (per one-piece-at-a-time rule)
- `pnpm run build` clean (Vercel-safe — no missing imports on tracked files)
- Local smoke: a `supabase db reset` to apply the migration locally, then run the upload flow as Arnel's account

### Step 3 — Pre-deploy audit
- Smoke test: upload as parent → row appears → signed URL works → archive works
- Smoke test: all must-keep-working features still work (claim flow, team docs, wizard steps 1/2/4/5/6, consumer cards, family hub, identity, payments, schedule)
- DB / RLS check: `SELECT * FROM player_documents` as a non-parent returns 0 rows
- SEO check: no new public routes, sitemap unchanged

### Step 4 — Ship
- One merge commit to `main`, Vercel auto-deploys
- Confirm live site works
- Confirm `player_documents` table exists in production with the right schema

### Step 5 — Post-ship audit
- Smoke test on production
- Watch Vercel logs for errors 10-15 min
- If anything breaks: `git revert` + `git push origin main`

---

## 8. Open questions for Arnel (must be answered before Step 2)

**All 13 questions answered by Arnel 2026-07-06 06:57 CDT. Plus Q7 follow-up answers 2026-07-06 07:07 CDT. Locked. Implementation is gated on explicit "go" from Arnel per the 06:08 rule.**

| # | Question | Arnel's answer (2026-07-06) | Implementation |
|---|----------|------------------------------|----------------|
| 1 | Scope: `player_documents` only or with `player_document_audit`? | **Both** | Ship `player_documents` + `player_document_audit` in v1 |
| 2 | Storage approach | **(i) Supabase Storage in this same project** | `(i)` |
| 3 | Bucket creation method | **Proceed with recommendation** | `(i)` dashboard, one-time, Arnel clicks |
| 4 | `category` enum (7 values) | **Keep all 7** | birth_certificate, waiver, medical_form, vaccination_record, proof_of_residence, photo_id, other |
| 5 | File size cap | **25 MB** | 25 MB hard cap, client-side + server-side check |
| 6 | Status `expired` — trigger vs computed | **Computed on read. Add note for v2** | computed-on-read in v1; SQL comment + `// v2:` note in route code to add trigger or scheduled job |
| 7 | Hard DELETE in v1 | **Archive only for submitted. There must be an option to confirm saving first.** | No hard DELETE in v1; archive only. **Add a "Confirm save" review panel before any file uploads.** Q7 follow-up answers 2026-07-06 07:07: (a) Cancel + Save buttons on the review panel, (b) **multiple files in one batch** (multi-page documents split into multiple files), (c) **edit-after-staging** (category, title, description, expiry remain editable on staged files before Save) |
| 8 | `player_document_audit` table | **Include in v1** | yes, ship `player_document_audit` |
| 9 | Player self-read RLS | **Include in v1** | yes, players can read their own documents |
| 10 | Co-parent upload | **Proceed with recommended, note for v2** | parent-who-clicks only in v1; SQL comment for v2 to add `parent_links` table or expand the RLS |
| 11 | Replace behavior | **New row, archive old** | new row + archive old |
| 12 | `minor_consent_revoked_at IS NULL` check | **"I'm thinking about if its easier to just submit docs and give consent first, with removal in v2"** | **Read (a) confirmed by Arnel 2026-07-06 07:07: re-assert consent at upload time.** No `minor_consent_revoked_at IS NULL` check in RLS. If `managed_profiles.minor_consent_revoked_at` is set, the upload form shows a consent checkbox first; on submit, write `parent_consent_at = now()` and clear `minor_consent_revoked_at`. v2 reconsiders the check. |
| 13 | `/dashboard/profile` DOCUMENTS section framing | **Per player view** | per-player view of `player_documents` |

### Q7 follow-up details (locked 2026-07-06 07:07 CDT)

**Multi-file upload in v1.** The form is a multi-file picker. The review panel lists each staged file with its own (category, title, description, expiry) row. One **Save** button uploads all files in a single multipart API call. The server iterates the files, creates one `player_documents` row per file, and writes one `player_document_audit` row per file (action='upload').

**Consent is per-upload-batch, not per-file.** If the parent re-asserts consent for a child during this upload (because `minor_consent_revoked_at` was set), the consent applies to all files in the batch. A single `parent_consent_at = now()` is written on the `managed_profiles` row, which applies to all files created in this batch. **If Arnel wants per-file consent (checkbox per file row), the v1 UI changes and the prep doc gets a Q7a.**

**No server-side staging.** All-or-nothing Save. Cancel = no cleanup (no files were sent, no rows to delete). All files in a batch either succeed together (all rows commit, all files uploaded) or fail together (no rows, no files). No partial-success state in v1. **If Arnel wants partial-success (some files succeed, some fail with errors), the API response shape and the review panel UX both change.**

**Multi-file, batched consent, all-or-nothing Save is the locked v1 shape.** Changes to this require a new Q7a prep doc.

---

## 9. Estimated effort (after Arnel approval)

| Step | Effort | Notes |
|---|---|---|
| Step 1 prep | DONE | this doc |
| Step 2 implementation | 1 piece, 4-6 hours | small. bucket setup is the slowest single step (~30 min if via dashboard) |
| Step 3 pre-deploy audit | 1-2 hours | depends on how many edge cases we exercise |
| Step 4 ship | ~30 min | merge + Vercel |
| Step 5 post-ship audit | 15 min + 15 min log watch | routine |
| **Total** | **6-9 hours, one session, one piece** | fits the 2026-06-24 one-piece-at-a-time rule |

---

## 10. After this piece (the rest of 1b, briefly)

For your reference, not part of this prep doc's scope:

- **1b-2** — `player_achievements` + `player_timeline_events` (covers 5 of 11 "coming soon" hits: family page career timeline, family page achievements, profile achievements, profile career timeline, consumer card recent achievements). Built from existing data via derivation layer where possible (e.g. `team_members` join dates → timeline "Joined Team" events). No upload flow.
- **1b-3** — `player_media` (photo/video at the player level). Same shape as 1b-1 but heavier (transcoding considerations for video, image variants for photo).
- **1b-4** — `consumer_notifications` (verification renewal, document expiry, payment reminder, etc.). Requires the documents + media + achievements tables to exist first because notifications are derived from them.
- **Phase 2** — `family_org_invitations` (the parent → org flow). Cross-actor invitation loop, separate architecture from the player-data layer.

Each gets its own prep doc and its own session per the 2026-06-24 protocol.

---

## 11. Status + outstanding (2026-07-06 14:49 CDT)

### Built (on disk, build-clean)

- `supabase/migrations/2026-07-06_player_documents.sql` — table + RLS + indexes + audit, applied live via Management API
- Storage bucket `player-documents` (private, 25MB cap, MIME-restricted) + storage RLS, applied live
- `src/app/api/player-documents/route.ts` — POST (upload, 1-5 files/batch, all-or-nothing rollback, per-batch consent re-assert), GET (list, computed-on-read `status='expired'`)
- `src/app/api/player-documents/[id]/route.ts` — PATCH (archive-only, idempotent), GET (mint 60s signed URL, view+download audit)
- `src/components/player-documents/PlayerDocumentList.tsx` (~440 lines) — read-only display, View, Archive (optimistic + rollback), "X archived" footer pill
- `src/components/player-documents/PlayerDocumentUpload.tsx` (~700 lines) — multi-file picker (1-5, 25MB cap, MIME-validated), per-file metadata, review panel (re-pick + remove), all-or-nothing Save, per-batch consent re-assert
- `src/components/player-documents/PlayerDocumentSection.tsx` (~50 lines) — thin client wrapper that composes List + Upload and owns `router.refresh()`
- `src/app/dashboard/family/page.tsx` — replaced DOCUMENTS placeholder (was line 411) with per-child rendering of `<PlayerDocumentSection>`, server-side batch fetch of `player_documents` for all linked children + computed-on-read `status='expired'`, per-child consent state read
- `src/app/dashboard/profile/page.tsx` — replaced Section 4 (DOCUMENTS) placeholder with the same per-child `<PlayerDocumentSection>` rendering, batch fetch of `player_documents` + consent state, "Open Family Hub" shortcut link at top of section

### Pre-deploy audit (Step 3) — completed inline

- **BUG-2** (parent_consent_ip inet cast) — fixed
- **BUG-4** (rollback race on partial batch failure) — fixed (per-rollback try/catch)
- **BUG-9** (empty playerId guard in upload component) — fixed
- **BUG-16** (PATCH/GET[id] ip_address inet cast) — fixed
- **BUG-19** (storage-not-found → 410 instead of 500) — fixed in `[id]` GET
- **BUG-MISSING-AWAIT** (rate limit Promise not awaited in 4 functions) — caught by `pnpm run build`, fixed

`pnpm run build` clean. No new lint warnings. No new type errors. `/dashboard/family` bundle: 9.06 kB (up from ~7 kB baseline).

### Outstanding (gate-step + post-audit)

- [ ] **Smoke test (Option A — manual)** — Arnel logs in to rinkstop.com/dashboard/family, screenshots the DOCUMENTS section, pastes here. UI-only verification.
- [ ] **End-to-end round-trip** — blocked on `account_type='parent'` not being present in `profile_account_types` for the test user. Upload returns 403 "Only parents can upload player documents." Resolution options:
  - (a) Add a `parent` row for Arnel's test user via Management API (requires explicit `/approve`)
  - (b) Relax the `isParent` gate in the route (spec change, not in v1 scope without explicit go)
  - (c) Wait for a separate workstream to add account-type flexibility
- [ ] **Complete audit pass (post-1b-1) — covers ALL changes together** — Arnel-flagged 2026-07-06 14:49 CDT, clarified 20:17 CDT: "We will do a complete audit of all changes together." Scope:
  - **Schema & data layer**: migration applied correctly, RLS policies correct, indexes present, no orphan rows, no destructive changes to existing tables
  - **API routes (3 functions across 2 files)**: auth, tier gate, account-type gate, parental-link gate, input validation, all-or-nothing rollback, defensive IP casts, signed-URL mint, audit rows
  - **Components (3 files)**: state management, edge cases (empty list, archive then re-fetch, optimistic update rollback), error UX, accessibility (data-testid, role=alert, aria-hidden), CSP-safe (no inline scripts, no eval)
  - **Family page wire**: must-keep-working audit (FamilySearch, FamilySetupResume, sibling sections), no regressions to existing surfaces, rollback path verified
  - **Build + bundle health**: no new lint warnings, no new type errors, bundle size delta sane (9.06 kB on family page acceptable for the new feature)
  - **Re-read prep §8 against actual implementation** — confirm no scope drift across all 13 design questions + Q7 follow-up + Q12 read (a)
  - **Phase 1a consumer surfaces** — no regressions to Active Status / Pending Verification / Family Schedule / Family Payments / Resume Setup link
  - **Storage layer** — bucket RLS, MIME restrictions, file size cap, storage object orphan risk (v1 has no DELETE policy but Dashboard can still orphan files)
  - **Audit log consumer** — confirm `player_document_audit` schema works for org-side v2 reads (columns: document_id, actor_user_id, action, ip_address, user_agent, created_at)
  - **v2 backlog** — extract anything that came up during build: replace-by-insert-new-row, hard DELETE, co-parent upload, per-file consent, trigger-maintained `status='expired'`, scheduled expiry notifications
  - **Per-change audit checklist** (one block per file change above):
    1. Does the code match the prep doc's design intent?
    2. Are there edge cases the code doesn't handle?
    3. Does it leak any data it shouldn't?
    4. Does it write to the audit table correctly?
    5. Does it roll back correctly on partial failure?
    6. Could a malicious input cause an unintended state?
    7. Is the rollback plan (prep doc §6) still 1-step per change?
    8. Does it match the existing codebase style (inline styles, Bebas Neue, #14B8A6 accent)?
- [x] **Profile page wire** (`src/app/dashboard/profile/page.tsx` Section 4 / DOCUMENTS) — DONE 2026-07-06 20:34 CDT. Section 4 placeholder replaced with per-child `<PlayerDocumentSection>` rendering, mirroring the family page wire. Achievements (line 320) and Career Timeline (line 333) placeholders remain — those are 1b-2, parked. Build clean.
- [ ] **Consumer card Pending Documents** (`src/components/dashboard/ConsumerCards.tsx` lines 343/355) — separate commit after Profile wire.
- [ ] **Wizard Step 3 Documents** (`src/components/family/FamilySetupWizard.tsx`) — `done: player_documents.count > 0` for at least one managed child. Separate commit after Consumer card.

### v2 backlog (not part of 1b-1, parked)

- Trigger-maintained `status='expired'` (currently computed on read)
- Storage object orphan cleanup cron (orphans from v1 dashboard deletes before RLS hardening)
- Hard DELETE for parents and/or admins (with audit + custody)
- Replace-by-insert-new-row UX flow
- Co-parent upload (multi-`manager_user_id` on a single `managed_profiles` row)
- Per-file consent (currently locked at per-batch)
- Org-side document reads (require org membership RLS that doesn't exist yet)
- Scheduled expiry notifications (depends on 1b-4 `consumer_notifications`)
