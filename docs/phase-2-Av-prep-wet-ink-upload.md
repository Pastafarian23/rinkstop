# Phase 2 A-v — Wet-Ink Signature Upload

**Status:** PREP ONLY. No code yet.

## Goal

Add a parallel signing flow: a recipient can **download/print** the document, **sign on paper**, then **upload the signed image (or PDF)** as their signature record. Both flows (canvas e-sign and wet-ink upload) produce the same `document_signatures` row.

## Why

Some parents prefer paper. Some leagues (especially youth/minor hockey in certain jurisdictions) still require ink. Some admins want to hand out forms at a parent meeting and collect them at the door. The current canvas-only flow forces all signers to a touchscreen — that's a real barrier for some teams.

## Confirmed scope (Arnel 2026-07-07, msg #34067)

1. **Signer-triggered, not admin-triggered.** The parent/player is the one with the paper. Admin upload stays as the source-doc path. Wet-ink return is on the recipient.
2. **Add a "Print" CTA on the recipient side.** Browser print (window.print) is fine for v1 — no special print stylesheet work.
3. **v1 scope cap:** upload image/PDF, store as `signature_payload` URL, show "Signed on paper" badge, same FK/UNIQUE semantics. No OCR, no auto-extract, no anti-forgery image analysis.

## The two flows into one signature row

| Flow | Trigger | Signature source | Storage |
|------|---------|------------------|---------|
| **E-sign (existing)** | Sign button → canvas modal | Inline SVG drawn in browser | `signature_payload = "<svg>...</svg>"` (TEXT) |
| **Wet-ink (new)** | Sign button → upload modal | Uploaded image/PDF, scanned from paper | `signature_payload = "https://...supabase.co/storage/v1/object/sign/signed-uploads/<document_id>/<user_id>-<ts>.jpg"` (TEXT) |

Both flows end with the same consent capture (`consent_to_electronic = true`, `consent_text` saved, `document_hash` captured, `signed_by_user_id` set). The legal moment of agreement is identical.

## Storage convention

New Supabase Storage subfolder: `signed-uploads/` in the existing `team-documents` bucket (verify bucket name first — see Implementation step 0).

Path pattern:
```
signed-uploads/
  {document_id}/
    {user_id}-{unix_timestamp}.{ext}
```

Why this shape:
- One folder per doc — easy to audit "who signed this"
- Filename embeds user_id — easy to list "what did this person upload"
- Timestamp prevents collisions on retries
- Same bucket as source docs — no new bucket policy work

## Files to add / modify

### New routes

1. **`src/app/api/team/[slug]/documents/[id]/signatures/upload/route.ts`** (POST, signer auth)
   - Verifies caller is on the doc's recipient list (or, for `required=true` docs, anyone on team roster)
   - Verifies UNIQUE `(document_id, signed_by_user_id)` won't be violated — return 409 with same shape as the DELETE route
   - Accepts multipart/form-data: file + signed_by_name + signed_by_role + consent_to_electronic + consent_text
   - Validates file: ≤10MB, mime in `image/jpeg | image/png | image/webp | application/pdf`
   - Uploads to `signed-uploads/{document_id}/{user_id}-{ts}.{ext}` in Supabase Storage (signed URL, no public access)
   - Inserts into `document_signatures`:
     - `signature_payload` = the uploaded file's signed URL (NOT raw data URI like the canvas path)
     - `signature_width`, `signature_height` = null (no canvas dimensions)
     - All other fields same as the canvas path
   - Returns 201 with the row
   - **NO withdraw feature** (per A-iv precedent)

### New UI

2. **In `DocumentsClient.tsx`** (sign modal):
   - Add a third button next to "Sign with canvas": **"Upload signed image"**
   - New upload sub-modal (or panel within the same modal):
     - "View document" link (opens in new tab → user can print)
     - "Print this document" button (calls `window.print()` — works on the opened tab via `target="_blank"` link OR via a dedicated `printDoc()` helper that opens a print-styled view)
     - File input (image or PDF, ≤10MB)
     - "Your full name" field (same validation as canvas flow)
     - "Signing as" select (parent/guardian/player/coach/staff)
     - Same A-ii child picker (when applicable)
     - Consent checkbox + text (same wording)
     - Submit button → POSTs to the new route
   - On success → same flow as canvas: close modal, refresh

3. **In `DocumentsClient.tsx`** (admin signatures list):
   - For each signature row, render:
     - E-sign: inline SVG preview (existing behavior, no change)
     - Wet-ink: small thumbnail linking to the uploaded image/PDF via signed URL
   - Badge on the row: **"🖊 E-sign"** or **"📄 Wet-ink"**
   - Both rows are functionally identical for legal/audit purposes; the badge is for the admin's at-a-glance clarity

4. **In `/dashboard/family/documents/page.tsx`** (recipient inbox):
   - Add a "Print" button next to "View" on each doc (uses `window.print()` after opening — same simple approach)
   - Same button can serve as the "you'll need this to sign on paper" affordance

## Schema changes

**None.** `document_signatures.signature_payload` is already TEXT, which can hold either:
- An SVG string (e-sign path), or
- A URL string (wet-ink path)

The shape diverges by **content prefix** (`<svg` vs `https://`), not column type. A-iii already stores the hash and consent text, so legal semantics are identical.

Optional future schema add (NOT in v1):
- `signature_kind` TEXT column (`'e_sign' | 'wet_ink'`) — useful for filtering, but redundant given the payload prefix. Defer until a real query needs it.

## What stays true (the legal & UX invariants)

- **Consent is still the legal moment.** `consent_to_electronic = true` + `consent_text` saved + `signed_by_user_id` recorded — same as canvas flow. The user's mental model from 2026-07-07 ("submitted document with consent was already accepted") applies equally to wet-ink: once they've checked the box and uploaded, that's the agreement.
- **UNIQUE `(document_id, signed_by_user_id)` still applies.** Same person can't wet-ink-sign AND e-sign the same doc. Either path works; one is enough.
- **FK RESTRICT on document_id** — cascade safety from A-iv protects against accidental deletes that would orphan signatures.
- **A-i recipient gating still applies.** A signer can only upload a wet-ink signature for a doc they were sent. Same recipient check as the canvas route.
- **A-ii child picker still applies.** Parent/guardian picks which kid they're signing for (required for liability/medical/COC).
- **NO withdraw feature.** Arnel's correction from 2026-07-07 stands: agreement doesn't have an erase button.

## Implementation steps (Prep gate + 4-step protocol)

Following the 2026-06-24 Implementation + Audit Protocol.

### Step 0 — Verification (read-only, no code)
- Read current sign route to confirm auth/validation pattern
- Read current `team-documents` bucket name in Supabase Storage (verify exact name)
- Read current DocumentsClient.tsx sign modal to confirm structure (already at A-i+A-ii state from `ac521e0`)
- Confirm migration `2026-07-07_signature_safety.sql` is the only constraint A-v relies on

### Step 1 — PREPARATION doc (this doc, Arnel approves)

### Step 2 — IMPLEMENTATION (preview branch)

- Add `signatures/upload/route.ts`
- Add UI: upload sub-modal, Print button, badge on admin signatures list
- Add Print button on `/dashboard/family/documents`
- One logical change per commit:
  - 1: route + types
  - 2: UI in DocumentsClient (admin side)
  - 3: UI in family/documents (recipient side)

### Step 3 — PRE-DEPLOY AUDIT
- Smoke test: parent uploads JPG → row created with URL → admin sees badge → admin clicks thumbnail → image renders
- Smoke test: parent uploads PDF → row created with URL → admin sees badge → admin clicks thumbnail → PDF opens
- Smoke test: A-ii child picker still works in wet-ink modal
- Smoke test: UNIQUE violation returns 409 with same shape as DELETE route
- Smoke test: 10MB cap enforced
- Smoke test: mime-type validation rejects `.exe` and other non-image/PDF files
- Smoke test: signed URL is time-limited (verify expiry parameter)
- Must-keep-working: canvas e-sign flow, A-i recipient picker, A-ii child picker, cascade-safety DELETE 409

### Step 4 — SHIP (merge to main, Vercel auto-deploys)

### Step 5 — POST-SHIP AUDIT (10-15 min, watch Vercel logs)

## Rollback plan

Single revert:
```bash
git revert <merge-commit>
git push origin main
```
Vercel redeploys the previous commit in ~30 seconds. Migration dependency: zero (no schema changes).

## Files to be touched (summary, for audit checklist)

- `src/app/api/team/[slug]/documents/[id]/signatures/upload/route.ts` (new)
- `src/app/dashboard/team/[slug]/documents/DocumentsClient.tsx` (modify — add upload sub-modal, badge rendering, Print button)
- `src/app/dashboard/family/documents/page.tsx` (modify — add Print button)
- `src/app/dashboard/family/documents/FamilyDocumentsClient.tsx` (modify IF Print button requires client-side handler; otherwise add a plain `<button onClick={window.print}>` via a small client wrapper)

## Risks

- **Supabase Storage size.** Uploads are small (images of signatures, 200KB-2MB typical). 10MB cap should keep this in check. Free tier has 1GB — we have headroom. Logged for future cost review.
- **Signed URL leakage.** Supabase signed URLs with short expiry (60s for admin view) are fine. The URL embeds a token — only valid while token valid. No new risk class beyond what's already in canvas-sign (signed URLs already used there for source docs).
- **Forge risk.** Out of scope for v1 per Arnel. A real wet-ink forgery would need image analysis or notarization. Not blocking; documented as known limitation.
- **Inbox experience.** Adding two CTAs (Canvas sign / Upload signed image) is a small UX choice. Both end in the same legal record. Confirm with Arnel in audit step 3 that the labels feel right.

## Open questions

- **Should the admin's existing "Sign" path also show for an admin signing their own doc via wet-ink?** I think yes — admins are also recipients of docs they upload. But that path currently isn't called out. Will confirm in audit step 3.
- **Audit log row.** Should we add an entry in some `document_audit_log` table for "uploaded signature" events? Currently no such table exists. Defer until there's a real audit query.

## Not in v1

- OCR or content extraction from uploaded images
- AI-based forgery detection
- Notarization integration
- Multi-page PDF signature placement (PDF page 3 of 5 — which page did they sign?)
- Auto-renewal of wet-ink waivers
- Bulk upload (admin uploads 30 signed images at once for a meeting)

Each of these is a separate piece if/when needed.