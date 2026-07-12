# Phase 2 Prep — Team Admin End-to-End Finetune

**Status:** prep-only (no implementation until Arnel approves scope)
**Author:** KiloClaw
**Date:** 2026-07-06

## Why this prep doc

Per Arnel's 2026-07-06 directive (msg #33247) the goal is: features must work for
**all profiles**, with the biggest gap being **team_admin**. Specifically:

- Team admin must be able to **upload documents for distribution** to players/families.
- **E-signature** flow (consent forms, waivers) must be finetuned — currently ambiguous
  whether it's "upload a signed PDF" vs. "in-app signature capture."

This prep is **scope + audit + design**, not code. Implementation only after Arnel
signs off on the scope (per the Q1-stub / Q2-commit rule).

---

## Audit-first: what already exists

Confirmed by repo scan 2026-07-06. **Nothing here is speculative — all paths
verified to exist as files on disk.**

### Team admin shell (BUILT)
- `/src/app/dashboard/team/[slug]/page.tsx` — main team admin page (446 lines of API support)
- `/src/app/dashboard/team/[slug]/admin/page.tsx` — admin landing
- `AdminRosterSummary.tsx`, `AdminActivityFeed.tsx`, `AdminQuickActions.tsx` — admin sub-views
- `team_workspaces` table + `team_members` table (`is_team_admin` 12-role bitmask)
- `/api/team/[slug]/` (17 endpoints — see inventory)

### Documents (PARTIALLY BUILT — needs audit)
- `/api/team/[slug]/documents/route.ts` (64 lines — POST + GET)
- `/api/team/[slug]/documents/[id]/download-url/route.ts` (51 lines)
- `/api/team/[slug]/documents/[id]/sign/route.ts` (78 lines) — **THIS IS THE E-SIG ENDPOINT**
- `/src/app/dashboard/team/[slug]/documents/page.tsx` + `DocumentsClient.tsx`
- Storage bucket: `team-documents` (assumed from file existence — verify)

**Unknown — needs to read these files to confirm:**
- Does `sign` endpoint do **in-app signature capture** (canvas/signature-pad SVG capture
  + signer identity binding + audit) OR does it just record "user downloaded + signed
  externally + re-uploaded the signed PDF"?
- Is there a `document_signatures` table that records signer identity, timestamp, IP,
  user-agent + a hash of the signed artifact? OR is signing just a metadata flag?
- Does the upload route accept `recipient_user_ids[]` or `recipient_player_ids[]` to
  trigger distribution? OR is distribution a separate endpoint that hasn't been built?

### Payments (BUILT — needs audit)
- `/api/team/[slug]/payments/` (7 endpoints)
- `team_payments` table (`2026-06-20_team_payments.sql`)
- Stripe checkout integration via `create-checkout`
- export + bulk-mark-paid

### Events + Attendance (BUILT — needs audit)
- `/api/team/[slug]/events/` (3 endpoints) + `[id]/attendance`
- `team-events` etc. tables

### Posts + Federation (BUILT — needs audit)
- `/api/team/[slug]/posts` (649 lines — biggest team endpoint)
- `/api/team/[slug]/apply-federation-template`
- `team_public_posts` etc. tables

---

## Open questions to resolve in audit

I'm not going to draft a feature spec against assumptions. The audit phase will
read every file in `/api/team/[slug]/documents/**`, the e-signature route, the
documents page components, AND the parent-side counterpart
(`/api/player-documents/` + components). Then I'll produce a gap analysis.

### Audit dimensions

| Dimension | Question |
|---|---|
| **Distribution model** | Can admin upload once and distribute to N players? If not, what's missing — a `document_recipients` table? a per-player visibility claim? |
| **Recipient visibility** | On the family/player side, where do they see admin-distributed docs? Is there a "team-docs inbox" or do they only see docs they personally received via some other path? |
| **E-sign semantics** | Is it (a) upload signed PDF + flag "this is signed by X" or (b) in-app signature pad → bind to user → audit row? What does the `sign` endpoint actually do today? |
| **Consent/waiver template** | Is there a way to define a "consent form template" (fields + clauses + signature anchor) and have multiple recipients sign it? OR is consent implied by clicking "I agree"? |
| **Audit trail** | For each signed doc, what's recorded — signer user_id, signed timestamp, IP, UA, hash of signed artifact? Is the audit immutable? |
| **Compliance posture** | Does the current design satisfy US e-sign law (ESIGN Act + UETA)? — i.e. (i) intent to sign, (ii) consent to do business electronically, (iii) attribution, (iv) record retention |
| **Withdrawal / revocation** | Can a parent revoke a signature they've previously given? Is there a `withdrawn_at` field on signature records? |
| **Reassignment** | If a parent signed a liability waiver but a year later the minor is on a different team — is the doc scoped to (team + season + child) or (team + child forever)? |

---

## Proposed scope for Arnel's review (DRAFT — not yet code)

Pending audit findings. Two possible scopes, Arnel chooses.

### Scope A — "Reach feature parity for team_admin"
Tightest scope. Implements only what's missing to make team_admin not feel
second-class vs. parent.
- (1) Audit + gap analysis doc (`docs/phase-2-team-admin-audit.md`)
- (2) Whatever gaps the audit finds in the **distribution flow**, **recipient
  inbox**, and **e-sign semantics** — fix them
- (3) Polish: admin roster shows per-player "documents received" status;
  payments show "X players paid / Y pending"
- Out-of-scope: building a new signature-pad canvas, ESIGN compliance, payment
  reconciliation

### Scope B — "Full feature suite for team_admin"
Broader. Includes everything in A + new signature capture UX.
- All of Scope A
- (4) In-app signature capture (HTML5 canvas → SVG/PNG → bound to user_id +
  timestamp + IP + UA), persisted as a `document_signatures` row referencing
  the parent doc
- (5) Consent/waiver template system: admin uploads a base PDF; system
  embeds signature fields per recipient; each recipient signs in-app; signed
  artifact rendered server-side with signature blocks overlaid
- (6) Per-recipient "received + opened + signed" audit trail
- (7) Withdrawal/revoke flow
- Out-of-scope: ESIGN act certification (legal), notary integration, paper
  backup, retention policies beyond 7 years

**My recommendation: Scope A first, Scope B as a follow-up once Scope A ships.**

Reason: Scope B's signature-pad canvas + server-side PDF rendering is real
engineering (2-4 days of focused work, multi-PR), and we don't yet know
exactly what the current `sign` route does. Audit first → decide.

---

## Process + safeguards (Arnel's standing rules apply)

1. **Q1 stub, Q2 commit**: this prep doc is Q1. Implementation only after
   Arnel says "go" in chat.
2. **Implementation + Audit Protocol** (2026-06-24): one feature at a time,
   preview URL, must-keep-working list per commit.
3. **Isolated, reversible changes**: every change keeps the unrelated features
   intact (existing payments/events/posts must not regress).
4. **No new vendor cost**: this whole feature can be built with Supabase +
   Clerk + Stripe. No DocuSign, no HelloSign, no SignRequest.

---

## What I need from Arnel

1. **Pick scope**: A (audit + gap fix only) or B (audit + full e-sign build)?
2. **Confirm priority order** (recommended):
   1. Audit pass → gap document
   2. Distribution + recipient inbox (small, highest impact)
   3. Roster "docs received" / "payments status" polish (small, high UX)
   4. E-sign semantics decision (in-app capture vs upload-signed-PDF)
   5. Consent/waiver templates (only if step 4 = in-app capture)
3. **Push cadence**: push each piece to `main` separately per the
   2026-06-25 deploy rule, or batch some?

After you say "go" + pick scope, I'll run the audit and come back with a
concrete gap list before writing any code.
