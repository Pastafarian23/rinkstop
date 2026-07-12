# Phase 2 Team Admin Audit
**Date:** 2026-07-06  
**Scope:** team_admin end-to-end (documents, distribution, e-sign, roster polish)  
**Method:** read-only file + schema review (no live API calls, no SQL, no destructive actions)

## Verdict on each spec question

### Q1 — Document distribution model
VERDICT: **One-team-to-self only. NO one-to-many distribution model.** Documents live on the team. Distribution to specific players/families is done out-of-band (admin tells people in chat/email to go to the team docs page and sign).

FILE:LINE evidence:
- `supabase/migrations/2026-06-20_team_payments.sql:67-86` — `team_documents` table has only `team_id` + `payment_id` columns. No recipient list, no join table.
- `src/app/api/team/[slug]/documents/route.ts:42-50` (POST) — inserts one row per team. No recipients array accepted.
- `src/app/api/team/[slug]/documents/route.ts` (GET) — lists all docs for the team. No per-recipient filtering.
- `src/app/dashboard/team/[slug]/documents/page.tsx:54-72` — server-side page lists all docs and ALL signatures per doc. Each user fetches the full team list.
- `grep -rn "recipient\|distributed_to\|assigned_to"` across `supabase/migrations/`, `src/app/api/team/`, `src/app/dashboard/team/` → **zero matches**.

GAP (GAP — high impact): No `team_document_recipients` join table. No per-player or per-family delivery. The "compliance" model is "N required docs visible to everyone on the team; we count signatures in the aggregate" — which works for federation compliance scores but breaks the "send this specific waiver to these specific families" workflow. The admin currently has no way to (a) target a consent form to a specific subset (e.g. "just the U12 group"), (b) see per-recipient delivery/seen/signed status, or (c) trigger a notification when a new doc is published.

### Q2 — E-sign semantics
VERDICT: **Typed-name flag only. NO in-app signature capture. NO uploaded signed-PDF binding.** Calling `POST /api/team/[slug]/documents/[id]/sign` with `{ signed_by_name: "Maria Cruz", signed_by_role: "parent" }` inserts a row in `document_signatures` and that's it. The actual PDF in `team_documents.file_url` is **never modified, never stamped, never re-stored**.

FILE:LINE evidence:
- `src/app/api/team/[slug]/documents/[id]/sign/route.ts:62-71` — inserts into `document_signatures` ONLY. No file read. No file write. No canvas/SVG/PNG bytes accepted in the body. No `signature_image_data` column exists.
- `supabase/migrations/2026-06-20_team_payments.sql:88-104` — `document_signatures` schema columns: `id, document_id, player_id (nullable), signed_by_name (typed, TEXT), signed_by_role (enum), signed_by_user_id, ip_address, user_agent, acknowledged_at, created_at`. No `signature_image_data`, no `signature_svg`, no `signed_file_url` (no new version of the PDF), no `consent_text_snapshot`.
- `src/app/api/team/[slug]/documents/[id]/sign/route.ts:18` — body validator only checks `signed_by_name` (≥2 chars) and `signed_by_role` (in `player|parent|guardian|coach|staff`). Nothing else.
- `src/app/api/team/[slug]/documents/[id]/download-url/route.ts:36-52` — returns the original `file_url` unchanged. There is no "signed" variant.
- `src/lib/federations.ts:6` (doc comment) and `2026-06-20_team_payments.sql:5-9` migration header — explicit design decision: "Typed-name e-signature. Legally binding in PH under RA 8792." Phase 1 was scoped this way on purpose.

What's in the audit row (`document_signatures`):
- `signed_by_name` (typed, free text) — line 65 sign/route.ts
- `signed_by_role` (enum, default `player`)
- `signed_by_user_id` (Clerk id of caller — but parent signs on behalf of child, see caveat below)
- `ip_address`, `user_agent` (line 68-70 sign/route.ts)
- `acknowledged_at` (server timestamp)
- `player_id` — line 64 sign/route.ts: set ONLY when `signed_by_role === 'player'`. For `parent|guardian|coach|staff`, it's NULL. **This means a parent signature does NOT bind to a specific child.** There's no per-child waiver enforcement.

GAP (BUG): A parent signs with `signed_by_role: "parent"` and `player_id` is NULL. The compliance widget (`src/app/dashboard/team/[slug]/page.tsx:206-219`) then keys signatures to a member by `signed_by_user_id`, but if the parent's Clerk id ≠ the player's Clerk id (which it never does — they're different accounts), the signature gets attributed to the wrong person. For minors specifically, this is broken: the parent signs, but the row is NOT counted against the child's compliance tally in any meaningful way because `signed_by_user_id = parent.clerk_id` and `team_members.user_id = child.clerk_id`.

GAP (GAP — high impact): No canvas/signature-pad. No PDF stamping. No way to prove *what* the signer agreed to at the moment of signing (no snapshot of the doc text). For PH RA 8792 compliance this might be OK (typed name + IP + timestamp is recognized in PH), but for US/EU/CAN jurisdictions this is materially weaker than e-sign providers like DocuSign/HelloSign.

GAP (GAP — medium impact): No `intent_to_sign` flag, no separate "I have read this document" acknowledgment checkbox. Body accepts the typed name and writes a signature. A UX gate ("I have read and agree to the {doc.title}") is not enforced at the API level.

### Q3 — Consent templates
VERDICT: **Federation templates exist for required-doc inventory only. No consent-form templates with clauses / signature anchors.** A "consent form template" with predetermined clauses and named signature anchors (e.g. "Parent Signature", "Player Signature", "Date", "Emergency Contact") is NOT modeled. The federation library lists doc *kinds* (e.g. `injury_waiver`, `medical_release`, `code_of_conduct`) but each one is just a placeholder row in `team_documents` with no clause content.

FILE:LINE evidence:
- `src/lib/federations.ts:9-25` — `FederationDoc` interface has `kind`, `label`, `note`. No `clause[]`, no `signature_anchor[]`, no `template_body_md`, no `template_pdf_url`.
- `src/app/api/team/[slug]/apply-federation-template/route.ts:71-77` — inserts rows with `kind, title, description, required` and that's it. The `file_url` column is NOT NULL per schema (line 74 of migration) — but the insert at line 71-77 doesn't include `file_url`. **This route will fail at insert time unless the column is nullable or there's a default.** (This is a BUG — verify with live read or schema introspection before shipping.)
- `src/app/dashboard/team/[slug]/page.tsx:147-166` — `KIND_LABELS` is a hardcoded map in the admin hub (hardcoded "Birth Certificate", "Injury / Concussion Waiver", etc.). Doc kinds are presented as labels; the system has no notion of "this kind of waiver has these clauses."
- `src/app/dashboard/team/[slug]/ApplyTemplateBanner.tsx:68-77` — UX text says "Import the required-doc template now" but the actual import is metadata only.

GAP (BUG — unverified): The `apply-federation-template` POST inserts a row missing the NOT-NULL `file_url` column (per schema line 74 of `2026-06-20_team_payments.sql`). Without seeing the live schema or a successful POST in logs, I can't confirm whether this throws. Flag as: **live state uncertain — runtime may be broken, OR `file_url` was made nullable in a hand-applied ALTER not present in the migration folder.**

GAP (GAP — high impact): No `team_document_templates` table. No `consent_form_template`, no `clauses` table, no `signature_anchors`. The whole concept of "consent form with X clauses" isn't modeled. Today, a "waiver" is just a generic PDF the admin uploads.

### Q4 — Recipient visibility (from family/player side)
VERDICT: **Team documents do NOT surface anywhere on the family/player side.** A parent has no way to discover team-published docs other than visiting `/dashboard/team/{slug}/documents` directly. There is NO team-doc inbox on `/dashboard/family`, `/dashboard/profile`, or any player-side dashboard.

FILE:LINE evidence:
- `grep -rn "team_documents\|document_signatures\|team_document"` against `src/app/dashboard/family/`, `src/components/player-documents/`, `src/components/family/`, `src/components/dashboard/`, `src/app/dashboard/page.tsx` → **zero matches**.
- `src/app/api/player-documents/route.ts` (parent-side counterpart, lines 1-80) — this is the player-side document API (parent uploads docs FOR a child). It does NOT call `team_documents`. The two systems are completely separate.
- `src/components/player-documents/PlayerDocumentList.tsx`, `PlayerDocumentSection.tsx`, `PlayerDocumentUpload.tsx` — read from the player-documents schema (uploaded by parent). No `team_documents` reference.

GAP (GAP — high impact): A coach uploads a waiver to the team workspace; the parent has to manually navigate to the team's docs page. There's no notification, no team-doc inbox widget, no "this team requires your signature" badge on `/dashboard/family`. The `team_notifications` table exists (referenced in `src/app/dashboard/team/[slug]/admin/page.tsx:101-110` for admin activity) but no code path writes a `team_notifications` row when a `team_documents` row is published. The admin has to manually tell families via chat.

GAP (GAP — medium impact): The family-side `PlayerDocumentSection.tsx` shows player-uploaded docs only. There's no "Team asks" section. The user has to learn "for THIS team's waivers, go to the team's docs page; for uploads, use this player-side form." Two separate worlds.

### Q5 — Admin roster polish gaps

What `AdminRosterSummary` shows:
- `src/app/dashboard/team/[slug]/admin/AdminRosterSummary.tsx` — read-only. Renders:
  - Total admin count (line 95: `{admins.length} admins on this team`)
  - Role distribution chips (line 110-122: `head_coach ×N`, `manager ×N`, etc., sorted by priority)
  - Member list with role + display name + joined date, sortable by role/recent/name (lines 130-180)
  - "+ Invite another admin" link → `/dashboard/team/{slug}#invites`
- This component shows **admins only**, not the full roster. It is intentionally admin-centric.

What the main roster (`RosterTable` at `src/components/team/RosterTable.tsx`) shows for the full team:
- Lines 76-77: `Documents` and `Fees` columns when `statusByUserId` is passed.
- Lines 134-141: `<DocsCell>` renders `${signed}/${required}` per member. `<FeesCell>` renders outstanding money.
- Line 174-189: `DocsCell` computes `pct = docsSigned / docsRequired` and renders a status badge.
- Line 224-256: `FeesCell` formats money outstanding per member.

What's currently MISSING from the admin roster view:
- (GAP — high impact) **No attendance column.** Per-player attendance is NOT in the admin roster. The data exists (`team_rsvps` + `team_event_attendance` referenced in `src/app/api/team/[slug]/events/[id]/attendance/route.ts:101-110`), but `RosterTable.tsx` and `AdminRosterSummary.tsx` never query it. There's no "last event attended" or "% events attended this season" column.
- (GAP — medium impact) **No "linked children" view.** `team_members.user_id` is the Clerk id of whoever joined the team. For a parent account, that user_id is the parent's, not the child's. The roster shows the parent. There's no UI showing "this admin has 2 linked kids: Juan (U12), Maria (U10)." The `managed_profiles` table holds parent-child links (per `2026-06-18_team_workspace.sql:208-225`) but nothing in the admin roster joins to it.
- (OK) Documents received status: YES — `RosterTable` line 136-138 has `<DocsCell>`. Shows `${signed}/${required}` per member.
- (OK) Payment status: YES — `RosterTable` line 139-141 has `<FeesCell>`. Shows outstanding cents per member.
- (GAP — low impact) No per-season scoping on these counts. `RosterTable` aggregates ALL `payment_records` across ALL `payments` for a team (per `page.tsx:226-238`). A "per-season" filter would be nice but not critical for the basic admin flow.
- (GAP — low impact) No "expiring docs" badge per member (e.g. "this member's medical_release expires in 14 days"). Data is computable from `team_documents.due_date` × `document_signatures.created_at`, but no query path builds it.

### Q6 — Compliance posture (light check)

(a) **Intent to sign:** NOT captured. No checkbox gate at the API level (`sign/route.ts:18-29` only checks `signed_by_name` and `signed_by_role`). No `intent_to_sign_at` column. No `I have read and agree` UX gate enforced server-side.

(b) **Consent to do business electronically (E-SIGN Act / RA 8792):** PARTIALLY captured. `document_signatures` records `ip_address`, `user_agent`, `acknowledged_at`, `signed_by_user_id` (lines 92-99 of `2026-06-20_team_payments.sql`). That hits the PH RA 8792 baseline (typed name + IP + timestamp). But for US E-SIGN compliance you'd typically also need (i) explicit "I agree to use electronic records" consent and (ii) a clear disclosure of right-to-withdraw. Neither is modeled.

(c) **Attribution:** PARTIALLY. For self-signing adults (`signed_by_role: 'player'`) attribution is fine: `signed_by_user_id = clerk_id` matches `team_members.user_id`. For minors signed by parents, attribution breaks: `player_id` is NULL (line 64 sign/route.ts), and `signed_by_user_id` is the parent's Clerk id, not the child's. The compliance widget's per-player count (`page.tsx:206-219`) tries to attribute via `s.player_id || s.signed_by_user_id` — which means a parent's signature WILL be counted under the parent's row, not the child's row. For minors this is the wrong attribution.

(d) **Record retention:** UNKNOWN. No `retention_until` or `legal_hold` column on `team_documents` or `document_signatures`. The `document_signatures` table has no archival/retention policy. Default Postgres behavior + the `ON DELETE CASCADE` from `team_documents` to `document_signatures` (line 92 of migration) means **if a coach deletes a document, every signature record is wiped**. For liability waivers, this is the wrong default — once signed, the audit row should outlive the doc.

GAP (BUG — high impact): `ON DELETE CASCADE` on `document_signatures.document_id` (migration line 92). Deleting a `team_documents` row permanently destroys all signature records. No soft-delete, no tombstone, no admin warning. **For a waiver, this means a coach who deletes the wrong row erases proof of consent.**

GAP (GAP — high impact): No `legal_hold` / `retention_until` columns. For youth-sports liability waivers you typically want 7-year retention past age of majority.

### Q7 — Withdrawal / revocation
VERDICT: **No withdrawal/revoke endpoint. No `revoked_at` column on `document_signatures`.** A parent cannot revoke a signature. A coach cannot revoke a signature (other than deleting the doc, which cascades and destroys all signatures — see Q6d).

FILE:LINE evidence:
- `grep -n "withdraw\|revoke\|revoked_at\|withdrawn_at"` in `supabase/migrations/2026-06-20_team_payments.sql` → **zero matches**. The columns don't exist on `document_signatures` or `team_documents`.
- `grep -rn "Withdraw\|withdrawn_at\|revoked_at"` against `src/app/api/team/`, `src/app/dashboard/team/`, `src/lib/` → only matches are on `team_invites.revoked_at` (which is a separate table for invite codes, not signatures) and `managed_profiles.minor_consent_revoked_at` (parent revokes CONSENT TO USE THE PLATFORM, not a specific signature).
- `src/app/api/team/[slug]/documents/[id]/sign/route.ts` — single POST endpoint, no DELETE. Schema (`document_signatures`) has no `deleted_at` or `revoked_at` to UPDATE either.

GAP (GAP — high impact): If a parent signs an injury waiver and then wants to revoke (e.g. child switches teams, parent changes mind), there is NO API path. The only way to "remove" a signature today is for the coach to delete the document — which destroys ALL signatures, not just the one. Per-child withdrawal is unimplemented.

Note (for context, not a gap): `managed_profiles.minor_consent_revoked_at` exists (per `2026-06-18_team_workspace.sql:214`) but that's the parent's consent to use RinkStop for the minor's account in general, not a per-document waiver revocation.

### Q8 — Cross-team / season scoping
VERDICT: **Scoped to `team_id` only. No `season_id` on `team_documents` or `document_signatures`. No `team_seasons` table at all.** A signature on a waiver binds the player to the doc forever (until the doc is deleted), regardless of which season the waiver was for.

FILE:LINE evidence:
- `supabase/migrations/2026-06-20_team_payments.sql:67-104` — `team_documents` has `team_id, payment_id` but no `season_id`. `document_signatures` has `document_id, player_id, signed_by_user_id` but no `season_id` or `team_id` (only via FK chain).
- `grep -rn "team_seasons\|season_id"` in `supabase/migrations/` → zero matches. **There is no seasons table.**
- `team_workspaces` table (per `2026-06-18_team_workspace.sql`) has `season_label TEXT` — but it's a free-text label, not a FK to a seasons dimension.
- `src/app/dashboard/team/[slug]/page.tsx:114` — `requiredDocs` query: `.eq('team_id', team.id).eq('required', true).is('payment_id', null)`. The count of "required docs signed per member" aggregates across all time, all seasons.

GAP (GAP — medium impact): A player who was on the team in 2024-25 and signed a waiver then, who is still on the team in 2025-26 with the SAME doc still `required: true`, will have the SAME signature counted against the 2025-26 compliance score. If the admin needs the player to re-sign for a new season, they have to (a) mark the old doc `required: false`, (b) create a NEW `team_documents` row with a new `due_date`, and (c) the player signs the new row. There's no automatic re-prompt for season rollover.

GAP (GAP — low impact): No cross-team awareness. A player on two teams (e.g. parent coaches U12 and has a kid on U16) signs a `medical_release` for Team A; the signature is not visible to Team B's compliance. Each team has its own docs and signatures. This is the right default for separation, but worth flagging — a player who switches teams has to re-sign everything.

GAP (GAP — low impact): `team_documents.due_date` is a `DATE`, not a season. If the admin sets `due_date = '2026-09-15'` for a `medical_release`, there's no automatic "expire after one season" logic. `expiringSoon` in `page.tsx:181-184` is a 30-day window — workable but coarse.

## Top 3 gaps (by impact)

1. **Q4 — Team docs don't surface on family/player side (Distribution gap).** This is Arnel's explicit 2026-07-06 directive: "features must work for ALL profiles, biggest gap is team_admin." Today, even the most basic "send waiver to parents, parents see it and sign" loop is broken because there's no parent-side inbox. Even worse: Q1 says there's no per-recipient delivery either. The current model is "upload, manually tell people in chat to go look." No join table, no notification, no inbox widget.

2. **Q2 — E-sign is typed-name flag only, no signature capture.** For a hockey club liability waiver, the standard is: canvas signature → bind to user + timestamp + IP + UA + snapshot of the doc text the signer agreed to → store the signed PDF. Today you get a row in `document_signatures` with the typed name. For PH RA 8792 this might pass; for the doc kinds in `src/lib/federations.ts` (injury_waiver, safeguarding, medical_release, code_of_conduct), the bar is higher. There's also the `player_id` attribution bug: parent signs → `player_id = NULL` → signature is attributed to parent's roster row, not child's. Compliance count is wrong for minors.

3. **Q6d + Q7 — Cascading delete on signatures + no withdrawal endpoint.** `document_signatures.document_id` has `ON DELETE CASCADE` from `team_documents`. A coach who deletes (or accidentally drops) a doc row permanently destroys all signature records — including injury waivers. There is no `revoked_at`, no withdrawal endpoint, no legal hold, no retention policy. For liability waivers this is a structural non-starter.

Honorable mention: **Q3 BUG — `apply-federation-template` may be broken at runtime.** Migration `2026-06-20_team_payments.sql:74` says `file_url TEXT NOT NULL`. Route `src/app/api/team/[slug]/apply-federation-template/route.ts:71-77` inserts without `file_url`. Either the column was made nullable via an unrecorded hand-applied ALTER, or every federation-template POST throws 500. **Live state unverified — flag for explicit confirmation before relying on the federation template feature.**

## Open questions for Arnel

1. **Q1 — Distribution model.** Do you want N→N (one doc, many recipients) or 1→N (admin uploads many copies, one per family)? The simpler "one doc, optional `recipients: text[]` array" might work for hockey clubs (small rosters). The full "team_document_recipients join table with status per recipient" is more flexible. Which fits the use case?

2. **Q2 — E-sign fidelity.** For PH-only operation (RA 8792), typed-name + IP + timestamp might be enough. If you want US/EU/CAN-grade, you need a signature pad + PDF stamping. What's the target jurisdiction for the liability waivers? (Most likely PH for v1, but worth confirming.)

3. **Q2 — Parent signature attribution.** When a parent signs on behalf of a minor, should the signature be (a) attributed to the parent's row only, (b) attributed to BOTH the parent's row AND each linked child, or (c) require the parent to specify which child they're signing for at sign time?

4. **Q3 — Consent form templates.** Do you want a built-in library of "hockey waiver", "code of conduct", "photo release" with pre-written clauses, or do you want admins to upload their own PDFs? (My read: the current design assumes the latter, but the team-doc UX is much weaker without template-level content.)

5. **Q6d — Signature retention.** Should signatures be soft-deleted (kept as audit trail even after doc is removed)? What's the retention period for liability waivers? (US sports: typically 7 years past age of majority; PH: 5-7 years per RA 8792.) We need a policy before changing the CASCADE.

6. **Q7 — Withdrawal flow.** Should a parent be able to revoke a single signature, or do you want a "parent withdraws consent" button that revokes ALL their signatures across the team? (Easier UX, harder semantics.)

7. **Q8 — Season scoping.** Do you want a `team_seasons` dimension now, or is "admin creates a new doc with a new due_date per season" good enough for v1? (Most youth sports teams run 2-3 seasons/year; the manual workflow is workable but error-prone.)

8. **Q3 BUG.** Can you confirm whether `team_documents.file_url` is nullable in the live database? (Run `SELECT is_nullable FROM information_schema.columns WHERE table_name = 'team_documents' AND column_name = 'file_url';`) The migration says NOT NULL but the federation-template route inserts without it.

## What I deliberately did NOT audit

- Payment flows in depth (`/dashboard/team/{slug}/payments/{id}`, Stripe integration, PayMongo wiring) — only verified `POST /api/team/{slug}/payments` and the payments list page exist and look sane.
- Federation template content beyond the surface schema (did not verify every IIHF federation row, just confirmed the structure is `kind/label/note` only).
- Events attendance UI (`/dashboard/team/{slug}/events/{id}`) — only confirmed the route exists, didn't trace the full attendance workflow.
- ICS export, calendar widget, print button — none of these are in scope for the team-admin audit.
- Email/notification system internals (`team_notifications` table structure, `team-notifications.ts` helper) — only confirmed the table is read by admin/activity feed, not whether doc publishing triggers a notification.
- Player-side `/api/player-documents/*` beyond semantic comparison (the parent-side counterpart was already audited in Phase 1b-1).
- Cron jobs / RLS policies beyond what was needed to answer the spec questions.
- Supabase Storage bucket configuration (`team-documents` bucket — only confirmed via the `download-url` route that signed URLs work).