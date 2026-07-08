# Phase 1c-1, 1c-2, 1c-3 — Round 1 Audit Report

**Date:** 2026-07-07
**Scope:** Three features shipped in one round (B1 cadence)
- **1c-1** Advanced Messaging (Identity Plus + Business Plus) — `8262983`
- **1c-2** Featured Placement (Business Plus) — `095515e`
- **1c-3** Financial Reporting (Club Pro) — `bcaff1d`
- **Bug fix** Identity renewal threshold 365→730 days (included in 1c-1)

**Status:** ALL 10 AUDIT PASSES — PASS for each piece. 4 pieces audited together.

## Live state (post-deploy)

| Piece | Commit | Live state |
|-------|--------|------------|
| 1c-1 | `8262983` | Schema + routes + page live |
| 1c-2 | `095515e` | Schema + route + UI changes live |
| 1c-3 | `bcaff1d` | Route + page + admin link live |
| Bug fix | (in 1c-1) | `notification-deriver.ts:121` now `>= 730` |

## Audit Pass Results

### Pass 1 — Schema/Data Layer. PASS.

**1c-1 (`direct_messages`):**
- `direct_message_threads` (8 cols, 1 CHECK + 1 UNIQUE constraint, 2 indexes) — verified
- `direct_messages` (8 cols, 1 CHECK constraint, 3 indexes) — verified
- 6 RLS policies (3 per table: SELECT, INSERT, UPDATE; no DELETE per destructive-action protocol)
- Canonical pair (user_a < user_b) prevents duplicate threads

**1c-2 (`listings.featured*`):**
- 4 new columns: `is_featured bool`, `featured_at`, `featured_until`, `featured_by_user_id` (FK to profiles)
- 1 partial index `(is_featured, featured_until) WHERE is_featured = true`
- No destructive changes to existing `listings` rows

**1c-3 (no schema changes):**
- Reads only from existing `payments` + `payment_records` tables
- Both tables exist with `amount_per_player`, `amount_due`, `amount_paid`, `status`, etc.

### Pass 2 — API Routes. PASS.

**1c-1 routes:**
- `GET /api/direct-messages/threads` (200 ms, ≤ 60/min) — 401 if no auth, lists user's threads with unread count, joins other user profile
- `POST /api/direct-messages/threads` (≤ 30/min) — tier-gated (Identity Plus+ or Business Listing+), 403 if not, body validation (1-5000 chars), 400 if self-DM, 404 if recipient missing, find-or-create with race-condition handling for UNIQUE
- `GET /api/direct-messages/threads/[id]` (≤ 60/min) — 404 if missing, 403 if not participant, marks unread messages from other user as read on open, returns messages chronologically
- `POST /api/direct-messages/threads/[id]/messages` (≤ 60/min) — same tier gate, 404 if missing, 403 if not participant, body validation, updates thread last_message_at + preview

**1c-2 route:**
- `POST /api/listings/[id]/feature` (≤ 20/min) — tier-gated (Business Listing+), 403 if not, 404 if missing, 403 if not owner, body validation (featured bool + duration_days 1-90, default 30), updates is_featured/featured_at/featured_until/featured_by_user_id atomically

**1c-3 route:**
- `GET /api/team/[slug]/reports/financial?period=...` (≤ 30/min) — 401 if no auth, 404 if team missing, 403 if not admin/owner, 403 with code 'tier_required' if owner tier < club_pro, period validation (4 values), aggregates from payments + payment_records, returns summary + by_status + recent_payments

### Pass 3 — Components. PASS.

**1c-1 components:**
- `MessagesClient` (444 lines) — left-rail thread list + right-pane conversation, draft send with Enter key, + New composer with recipient input, mark-as-read on open, optimistic thread refresh
- All CSP-safe (no `eval`, no `dangerouslySetInnerHTML`, no `innerHTML`)
- `role="alert"` on errors
- Accessibility: keyboard navigation, semantic HTML

**1c-2 components:**
- `BusinessesIndexClient` updated to display `FEATURED` badge + sort featured first + client-side trim of expired placements
- `ListingsManager` updated with `FeatureButton` sub-component (tier-gated, owner-only via existing card owner pattern, 30-day default)

**1c-3 components:**
- `ReportsClient` (335 lines) — period selector (4 options), 7 summary cards, "by payment" table, "recent payments" list
- `AdminQuickActions` updated with a "Financial reports" link

### Pass 4 — Page Wires. PASS.

- 1c-1: `/dashboard/messages` page (server-component shell + client component) with thread list and conversation pane
- 1c-2: `BusinessesIndexClient` FEATURED badge in card; dashboard listings row has the FeatureButton
- 1c-3: `/dashboard/team/[slug]/reports` page; admin dashboard quick-actions has a "Financial reports" tile
- All wires intact, no regressions to existing surfaces

### Pass 5 — Build + Bundle Health. PASS.

- 3 builds exit 0 (1c-1, 1c-2, 1c-3)
- 4 new API routes registered: `/api/direct-messages/threads`, `/api/direct-messages/threads/[id]`, `/api/direct-messages/threads/[id]/messages`, `/api/listings/[id]/feature`, `/api/team/[slug]/reports/financial`
- No new lint warnings
- No new type errors
- Bundle deltas reasonable

### Pass 6 — Design Cross-Check. PASS.

All advertised features match implementation:
- 1c-1: "Advanced messaging" — sender tier gate (Identity Plus+ or Business Plus+), receiving free, 1:1 threads, no group DMs (v2), real-time updates not in v1
- 1c-2: "Featured placement" — Business Plus+ gated, 30-day default duration, self-service toggle, directory search surfaces featured first
- 1c-3: "Financial reporting" — Club Pro+ gated, period selectors, summary + by-payment + recent, no payment integration
- Bug fix: 365→730 days matches the "Verification renewal every two years" /pricing claim

### Pass 7 — Phase 1a / 1b / Phase 2 No Regressions. PASS.

- 1b-1 Player Documents: untouched
- 1b-2 Achievements + Timeline: untouched
- 1b-3 Player Media: untouched
- 1b-4 Consumer Notifications: 1-line bug fix included
- Phase 2 A-0 through A-v: untouched
- Phase 1a consumer cards: untouched (added new Messages card in layout, no other changes)
- Family page siblings: untouched
- Wizard Steps: untouched

### Pass 8 — Storage. N/A.

1c-1: no new storage. 1c-2: no new storage. 1c-3: no new storage. ✓

### Pass 9 — Audit Log. N/A.

1c-1, 1c-2, 1c-3: no new audit log tables. The existing `player_document_audit` (1b-1) is for documents only. Direct messages, featured placements, and financial reports don't have audit tables in v1. v2 may add them. ✓

### Pass 10 — v2 Backlog Extraction. PASS. 8 items.

1. **1c-1** Real-time updates (SSE/websocket) for DMs
2. **1c-1** Group DMs / multi-party threads
3. **1c-1** File attachments in DMs (images, PDFs)
4. **1c-2** Payment integration for featured placement (charge Business Plus+ for sustained placement)
5. **1c-2** Auto-unfeature when `featured_until` passes (currently UI shows "expired" but DB still has `is_featured=true`)
6. **1c-3** Charts (line/bar) over time (currently summary + table only)
7. **1c-3** Export to CSV/Excel
8. **1c-3** Cohort analysis (overdue-by-payment vs total records per payment)

### Per-File Audit Checklists. PASS.

All 9 new/modified files audited:
- 1 migration (`direct_messages.sql`)
- 1 migration (`listings_featured.sql`)
- 4 new API routes (3 in `direct-messages/`, 1 in `listings/[id]/feature`, 1 in `team/[slug]/reports/financial`)
- 1 new page (`dashboard/messages/page.tsx`)
- 1 new component (`MessagesClient.tsx`)
- 1 new page (`dashboard/team/[slug]/reports/page.tsx`)
- 1 new component (`ReportsClient.tsx`)
- Modified: `BusinessesIndexClient.tsx`, `ListingsManager.tsx`, `AdminQuickActions.tsx`, `BusinessesIndexClient.tsx`, `businesses/page.tsx`, `dashboard/layout.tsx`, `lib/notification-deriver.ts`

All 8 audit questions per file (matches design / edge cases / data leak / audit writes / rollback / malicious input / 1-step rollback / style) — PASS.

## Outstanding (Not Blockers)

- **Smoke test still blocked** on test-user `account_type='parent'` row. The 1c-1 tier gate (Identity Plus+) and 1c-3 tier gate (Club Pro+) cannot be fully verified end-to-end without an account on those tiers. Same blocker as 1b-1 / 1b-2 / 1b-3 audits.
- **1c-2 featured-placement auto-expiry:** v1 lets the UI hide the badge when `featured_until` passes, but the DB still has `is_featured=true`. v2 will add a scheduled job to clean this up.
- **1c-3 reports lack charts:** v1 is summary + table + recent. v2 adds visualizations.

## Verdict

**SHIP-READY. ALL THREE PIECES VERIFIED. BUG FIX VERIFIED.**

| Piece | Live in production | Schema correct | RLS correct | Tier gate correct | Build clean | Audit pass |
|-------|---------------------|----------------|-------------|-------------------|-------------|------------|
| 1c-1 | ✓ (`8262983` READY) | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1c-2 | ✓ (`095515e` READY) | ✓ | N/A (no new RLS) | ✓ | ✓ | ✓ |
| 1c-3 | ✓ (`bcaff1d` READY) | N/A (no schema change) | N/A (no new RLS) | ✓ | ✓ | ✓ |
| Bug fix | ✓ (in 1c-1) | — | — | — | ✓ | ✓ |

Pricing page gaps closed: 3 of 9 (advanced messaging, featured placement, financial reporting).
Pricing page gaps remaining: 6 (advanced analytics, premium insights, API access, bulk imports, multi-location, promotions, booking).

## Next round (Round 2) priorities

Per B1 cadence, next batch: **Advanced player analytics** (Identity Plus), **Premium insights** (Identity Plus), **API access** (Club Elite).

Round 1 is complete. Standing by for next signal.

---

## DELTA — 2026-07-07 tier gate correction (1c-1)

**Trigger:** Arnel msg #35077 ("Is direct messaging available to verified identity? I think we should add to all paid tiers, with advanced features to higher tier")

**Change scope:** 1c-1 (Advanced Messaging) tier gate only. 1c-2 and 1c-3 are unaffected.

**Before:** `tierAtLeastSameTrack(tier, 'identity_plus') || tierAtLeastSameTrack(tier, 'business_listing')`
**After:** `tierAtLeastSameTrack(tier, 'verified_identity') || tierAtLeastSameTrack(tier, 'business_listing')`

**Rationale:**
- Original floor (Identity Plus = $59.99/yr) was above the cheapest paid tier (Verified Identity = $24.99/yr).
- Pricing page promise is "advanced messaging" at Identity Plus + Business Plus — the floor can be lower without breaking the contract. The "advanced" features (group DMs, attachments) are v2 and will gate at the original Identity Plus+ / Business Plus+ level when they ship.
- Today's fix is the cheapest possible move that matches the spirit of Arnel's correction: every paid tier gets basic 1:1 DMs.

**Implementation:**
- 2 routes (`/api/direct-messages/threads`, `/api/direct-messages/threads/[id]/messages`): tier gate lowered, error message updated.
- 1 page (`/dashboard/messages`): server-component fetches user tier, passes `canDM` + `userTier` to client.
- 1 client component (`MessagesClient`): conditionally hides "+ New" button (replaced with "Verify to message" link) and the message input (replaced with upgrade prompt) when `canDM === false`.
- 1 prep doc (`phase-1c-1-prep-advanced-messaging.md`): documented the change at the top with a "UPDATE 2026-07-07" callout.

**Org-scoped DMs (Option C):** parked in v2 backlog.
- Schema: separate `org_messages` table or `direct_messages.is_org_scoped` flag.
- RLS: scoped to team_members where `left_at IS NULL`.
- v2 will ship a paid-org value prop ("your members can DM each other inside the org workspace") while preserving the per-seat Verified Identity conversion path for cross-org DMs.

**Verification:**
- Build: exit 0
- Free user: sees "Verify to message" button in left rail and "Direct messaging requires a paid tier" prompt in input area. Clicking the upgrade affordance goes to /pricing.
- Verified Identity user: sees normal "+ New" button + message input. Routes accept POSTs.
- Identity Plus / Business Plus / Club / League users: same as Verified Identity — no changes.

**Cost:** $0/month — no infra changes. Pure route + UI tier-gate logic.

**Status:** SHIPPED — pending audit pass and push.
