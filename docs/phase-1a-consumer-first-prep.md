# Phase 1a — Consumer-First Growth: UX on Existing Data (Prep Doc)

**Status:** §3.1-3.5 file changes SHIPPED. Spec coverage PARTIAL. See amendment below.
**Author:** KiloClaw
**Date:** 2026-07-05 (amended 2026-07-06)
**Source of truth:** Spec in Telegram message #32354 (2026-07-05 17:32 CDT). Built-vs-missing matrix in Telegram message #32448. Scoping confirmations (a–e) in message #32461. Open-question approvals in message #32472.

---

## AMENDMENT (2026-07-06, KiloClaw)

**This prep doc was approved as a "UX on existing data" slice of the Consumer-First Growth spec.** The file changes in §3.1-3.5 were shipped.

**The spec's actual goal was not met by §3.1-3.5 alone.** The spec's design goal is "A parent should be able to sign up today, receive immediate value within ten minutes, and confidently recommend Rinkstop to their club tomorrow." That goal requires both UX AND a data layer (player_documents, player_achievements, player_timeline_events, family_org_invitations, consumer_notifications). §3.1-3.5 was UX only — the data layer was deferred to Phase 1b (this prep doc's own "Out of scope" section, lines 11-15).

**What shipped:** §3.1-3.5 file changes (reframed copy, wizard shell, consumer cards, empty states, wizard entry point, schema decision for the wizard's state column).

**What is still missing per the spec:**
- `player_documents` table + upload UI → 1b-1 (`docs/phase-1b-player-documents-prep.md`, 2026-07-06 draft, awaiting Arnel review)
- `player_achievements` + `player_timeline_events` → 1b-2
- `player_media` (photos/videos) → 1b-3
- `consumer_notifications` (medical doc expiry, verification renewal, etc.) → 1b-4
- `family_org_invitations` (parent → org flow) → Phase 2

**"Coming soon" / "coming next" / "building that now" hits remaining on user-facing surfaces as of 2026-07-06 06:04 CDT:** 11. Of those, 5 are Documents (1b-1), 3 are Achievements (1b-2), 2 are Career Timeline (1b-2), 1 is the wizard's Step 5 CTA (1b-3), 1 is the wizard's Step 6 CTA (Phase 2). The build-vs-missing matrix in Telegram message #32448 is the canonical list.

**Arnel's directive (2026-07-06 06:08 CDT, msg #32715):** "Any changes to UI and site must require my explicit consent. The goal is to keep all current features and data preserved and safe. Any improvements to make rinkstop the best are up for discussion." Per this directive, no further 1a work will be done. The remaining gaps are tracked in 1b prep docs and Phase 2 prep docs, each with its own scope statement and explicit approval gate.

**Treat this amendment as the source of truth for "what is 1a's actual state."** The "Status: FINAL" line above was wrong; the real status is "§3.1-3.5 shipped, spec goal not met, deferred to 1b/Phase 2 with per-piece approval gates."

---

## 0. Scope (Phase 1a only — UX on existing data + 1 new column for wizard state)

This prep doc covers **Phase 1a** of the consumer-first growth strategy:

- **Reframe** existing surfaces under the "Hockey Identity / Hockey Passport / Family Hub" language.
- **Add the Family Setup Wizard shell** with the 6 spec steps, gated to parent accounts on `identity_plus+`, with permanent dismiss + "Resume setup" link on Family Hub.
- **Add consumer dashboard cards** (Today's Schedule, Family Activity, Upcoming Payments, Recent Achievements (placeholder), Upcoming Tournaments, Verification Status, Suggested Next Steps, Recent Messages, Current Organizations), visible to all personal-workspace users, with account-type-aware empty-state CTAs.
- **Rewrite empty states** across personal-workspace pages so the app "never feels empty."
- **1 new schema column:** `profiles.family_setup_completed_at TIMESTAMPTZ NULL` for wizard state. No other schema changes. No new routes.

**Out of scope (later phases):**
- **Phase 1b** — 4 sub-migrations for player_documents, player_media, player_achievements, player_timeline_events, family-level rollup views, consumer_notifications. Each its own session.
- **Phase 2** — Parent → org invitation flow. New `family_org_invitations` table. Org-side "a family invited you" surface. Loop B becoming real.
- **Phase 3** — Org adoption surface (when a family invites a club, what's the club's first-touch experience?).

## 1. Guardrails (locked by Arnel, 2026-07-05 18:19 CDT)

| Guardrail | Source |
|---|---|
| Do NOT modify authentication, pricing tiers, billing, verification, permissions, or workspace architecture | Spec #32354 |
| Tier names stay the same (`verified_identity`, `identity_plus`, etc.) | Answer (1) |
| Wizard + Family Hub are **parent-only** (not junior/college/adult) | Answer (2) |
| **No free parent tier.** Free = fans. Parents must be on `identity_plus+` | Answer (4) |
| Hockey Identity / Hockey Passport = existing profile surface, no rename, no new data object | Answer (1) + confirmation (a) |
| Wizard entry point: in-page card on `/dashboard` for `account_type === 'parent'`, resumable, dismissible | Confirmation (b) |
| Claim flow stays in place, runs in parallel (option A) | Confirmation (c) |
| `tierAtLeastSameTrack(tier, 'identity_plus')` is the gate on wizard + Family Hub (no soft cap, no upgrade prompt) | Confirmation (d) |
| Phase 1 = 1a + 1b (1a alone cannot hit the 10-minute value design goal) | Confirmation (e) |

## 2. What "existing data" means (the 1a boundary)

Phase 1a reads from these tables only. **No writes outside this set.**

| Table | Used for |
|---|---|
| `profiles` | display_name, avatar_url, tier, is_founding_member, location, bio |
| `managed_profiles` | linked children (parent's kids) |
| `players` | child display info for Family Hub |
| `team_members` | "Current Organizations" card, family-level schedule rollup, family-level payment rollup |
| `team_workspaces` | org names for cards and rollups |
| `team_schedule` / `team_events` | "Today's Schedule" + family-level rollup |
| `team_payments` + `payment_records` | "Upcoming Payments" + family-level rollup |
| `fixtures` | "Upcoming Tournaments" card (read public) |
| `profile_identity_status` (view) | "Verification Status" card |
| `inbox` / `team_messages` | "Recent Messages" card (already exists) |
| `team_invites` (org→user) | org-side invitation entry (not touched; informational only) |
| `claims` | claim flow untouched; "Claim a record" CTA still in TypeSectionCard |

**Not read in 1a (deferred to 1b):** `player_documents`, `player_media`, `player_achievements`, `player_timeline_events`, `family_org_invitations`, `consumer_notifications` — these tables don't exist yet. Cards/sections that would read from them are **placeholders with explicit "coming next" copy** (matches the existing "coming soon" pattern in `/dashboard/family`).

## 3. File changes (approved by Arnel, to be implemented in Step 2 / next session)

### 3.1 Reframe copy + framing

| File | Change |
|---|---|
| `src/app/dashboard/profile/page.tsx` | Wrap existing content in a "Your Hockey Passport" header. Add section labels: Identity, Photo, Parent Relationships. **No data model changes.** |
| `src/app/dashboard/identity/page.tsx` | Add "Step 1 of your Hockey Passport" framing. The Didit verification flow itself is untouched. |
| `src/app/dashboard/family/page.tsx` | Restructure from "link your kids" stub to a real Family Hub layout: Linked Players (existing) + Family Schedule rollup (new, reads `team_schedule` via `team_members`) + Family Payments rollup (new, reads `team_payments` via `team_members`) + Documents placeholder (1b) + Achievements placeholder (1b). Tier gate already in place. |
| `src/components/AccountTypeBadges.tsx` (or new `HockeyIdentityBadge.tsx`) | Optional: a small "Hockey Identity" badge on the dashboard for parent users, mirroring TierBadge. Defers if it's noise. |

### 3.2 Wizard shell

| File | Change |
|---|---|
| `src/components/family/FamilySetupWizard.tsx` (NEW) | Client component. 6 steps, each step is a small card with: title, current state, action button, "skip for now" if applicable. Wizard state stored server-side on `profiles.family_setup_completed_at` (see 3.6). Visible on `/dashboard` for `account_type === 'parent' && tierAtLeastSameTrack(tier, 'identity_plus') && family_setup_completed_at IS NULL`. Hidden otherwise. |
| `src/app/dashboard/page.tsx` | Add `<FamilySetupWizard />` near the top, above the TypeSectionCards. Server-side check: render only if account_type=parent and tier>=identity_plus. |
| `src/app/api/family/setup-state/route.ts` (NEW) | POST endpoint to set `profiles.family_setup_completed_at = NOW()` (dismiss) or `NULL` (resume). Authenticated, parent-only, tier-gated to `identity_plus+`. See 3.6 for the column migration. |

**Wizard steps (matches spec):**
1. **Complete your Hockey Identity** → "Verify now" CTA → `/dashboard/identity`. State: didit status.
2. **Add your children** → "Add a child" CTA → `/dashboard/family` (existing FamilySearch).
3. **Upload important hockey documents** → placeholder CTA → disabled with "coming next" copy (1b-1).
4. **Create your first Hockey Passport** → "View your passport" CTA → `/dashboard/profile` (reframed).
5. **Import your existing schedule (optional)** → placeholder CTA → disabled (1b-1).
6. **Invite your team or organization** → "Find your team" CTA → /directory/teams (existing). Or `?invite=1` once Phase 2 ships.

State completion logic: each step has a `done` boolean. Step 1 done = didit verified. Step 2 done = `managed_profiles` count > 0. Step 3 done = (1b) `player_documents` count > 0. Step 4 done = `profiles.avatar_url` set + identity verified. Step 5 done = (1b) schedule import. Step 6 done = org invite sent (1b/2).

### 3.3 Consumer dashboard cards

The Personal dashboard already has `TypeSectionCard` per account type. I'll **add a new row of consumer cards** above the TypeSectionCards, visible to **all** personal-workspace users (parents, players, scouts, fans) — the cards read from public + per-user data, not org data.

| Card | Data source | Notes |
|---|---|---|
| Today's Schedule | `team_schedule` + `team_events` filtered to today, via `team_members` | Empty state: "No games today. Add a team to your schedule." |
| Family Activity | `managed_profiles` last_activity + child profile changes | Requires `managed_profiles.last_activity_at` — does this exist? **Need to verify in 1a prep audit.** If missing, fall back to "managed_profiles.created_at" ordering. |
| Upcoming Payments | `payment_records` (unpaid) | Empty state: "No payments due. Your family is current." |
| Pending Documents | placeholder (1b-1) | Copy: "Document storage coming soon. Family Hub → Upload" |
| Recent Achievements | placeholder (1b-2) | Copy: "Achievements unlock as your kids play. Stay tuned." |
| Upcoming Tournaments | `fixtures` filtered to next 30 days, joined to `team_members.team_id` | Empty state: "No tournaments on the calendar yet." |
| Verification Status | `profile_identity_status` | Already shown; re-positioned into the card row. |
| Suggested Next Steps | derived from tier + completion state | Personalized: "Verify identity" / "Add a child" / "Join a team". |
| Recent Messages | existing `InboxCard` | Re-positioned; no new code. |
| Current Organizations | `team_members` count | Empty state: "No teams yet. Browse the directory." |

**Card row implementation:** new `src/components/dashboard/ConsumerCards.tsx` (server component) that fetches all 10 cards in a single `Promise.all` and renders them in a responsive grid (4 columns on desktop, 2 on tablet, 1 on mobile).

**Important:** cards that read `team_members` are **empty by default for parents with no kids linked yet**. This is the spec's "never feel empty" requirement — empty states must be rich and offer an action, not just "—".

### 3.4 Empty states

Replace the 1-line "no X yet" copy with the spec's structure:
- Headline ("No teams yet.")
- One-liner body ("Join your first team to see practice, games, and payments here.")
- Primary CTA ("Browse teams →")
- Secondary CTA (optional, e.g. "How does this work?")

Affected pages:
- `/dashboard/family` (already has a stub; rewrite with rich empty state)
- `/dashboard/payments` (already has good empty state; tighten copy)
- `/dashboard/schedule` (one-liner; add CTA to /directory/teams)
- `/dashboard/favorites` (verify; tighten if needed)
- `/dashboard/team/*` (org-side; do NOT touch in 1a)
- `/dashboard/welcome` (tier-welcome page; add "Set up your Hockey Passport" CTA for parents)

### 3.5 Wizard entry point — confirmed (b)

In-page card on `/dashboard`, top of page, above TypeSectionCards. Gate: `account_type === 'parent' && tierAtLeastSameTrack(tier, 'identity_plus') && family_setup_completed_at IS NULL`. State stored server-side on `profiles.family_setup_completed_at`. Hidden permanently once that column is set. "Resume Hockey Passport setup" link on `/dashboard/family` clears the column to re-show the wizard.

### 3.6 Schema decision — RESOLVED (B)

**Decision:** add a single nullable timestamp column to `profiles`:
- `family_setup_completed_at TIMESTAMPTZ NULL`

**Migration (3 lines of SQL):**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS family_setup_completed_at TIMESTAMPTZ;
COMMENT ON COLUMN profiles.family_setup_completed_at IS
  'Timestamp when the parent dismissed or completed the Family Setup Wizard. NULL = wizard visible. Used by /dashboard server component to gate FamilySetupWizard render. Tier-gated to identity_plus+ parents.';
```

The column is nullable, ignored by every existing query, and only read by the new wizard component and the Family Hub "Resume setup" link. Droppable in a follow-up migration if 1a is reverted.

## 4. "Must-Keep-Working" audit list (per Piece C hardening, 2026-06-24 protocol)

Every item below is touched by 1a only via reading its data. If any of these break, the change is wrong.

| Surface | Why it must keep working |
|---|---|
| Didit verification at `/dashboard/identity` | Step 1 of the wizard links here. If it breaks, the wizard breaks. |
| `/dashboard/claims` and the entire claim flow (ClaimsForm, ClaimThisListing, ClaimParentButton) | Answer (c) explicitly: keep in place. The "Hockey Identity" reframe does NOT replace the claim flow. |
| Org-side surfaces (`/dashboard/team/*`, `/dashboard/manage/*`, `/dashboard/coach-feed`, `/dashboard/plans/*`, `/dashboard/referee/*`) | No changes. The reframe is Personal-workspace only. |
| Workspace switcher (Step 5/6) — UserMenu + MobileMenu + per-workspace nav | The wizard renders on `/dashboard` regardless of active workspace IF account_type=parent. **Verify this doesn't break the active-workspace UI.** |
| Pricing anchor (49c1f5d) and tier deep-links | `/pricing?tier=X` still works. No pricing changes. |
| Profile photo flow (659dbe7) | The `user.reload()` pattern in ChangePhotoButton is intact. Re-checking the file confirms the code is still correct. |
| Tier helper (`src/lib/tier.ts`, 7a9a97f) | All tier comparisons go through `tierAtLeastSameTrack` and `tierAtLeast`. No new tier names. |
| Pricing tiers (10 tier ids) | No tier renamed, no tier added, no tier removed. |
| TypeSectionCard (player/parent/scout/fan/coach/etc.) | Adding the consumer card row above TypeSectionCard does not modify TypeSectionCard itself. |

**Isolation rule (per 2026-06-24 protocol):** a change to one Personal-workspace surface MUST NOT change the behavior of any other surface. If a side effect appears, STOP and report. Do not ship.

## 5. Rollback plan

- 1a is **additive** by design. The biggest rollback risk is the new consumer card row visually pushing TypeSectionCards down. Reverting to the pre-1a dashboard is a single component removal.
- The wizard is a single new component (`<FamilySetupWizard />`) with a single mount point in `page.tsx`. Removal = remove the import + the JSX line.
- The Family Hub refactor is in one file (`src/app/dashboard/family/page.tsx`). Revert via `git checkout main -- src/app/dashboard/family/page.tsx` + commit.
- The profile/identity reframe is copy + wrapper changes in 2 files. Revert via checkout.
- **One database migration:** `profiles.family_setup_completed_at` (nullable, additive). A rollback that drops the column is a 2-line migration. Or stop reading the column and the wizard reverts to localStorage fallback.

## 6. Ship gate (per 2026-06-24 protocol)

Before `git push origin main`:

1. **Build:** `pnpm run build` exits 0. Full page count matches or exceeds pre-1a count.
2. **TypeScript:** `npx tsc --noEmit` exits 0.
3. **Import check:** every import in every changed file resolves in `git ls-tree HEAD` (no untracked-file build footgun from 2026-06-24).
4. **Live smoke (per route, per the 2026-06-21 lesson):**
   - `/api/health` → 200
   - `/dashboard` → 307 (auth gate, unchanged)
   - `/dashboard/profile` → 200 (reframed)
   - `/dashboard/identity` → 200 (reframed, Didit intact)
   - `/dashboard/family` → 200 (refactored, tier-gated)
   - `/dashboard/claims` → 200 (untouched)
   - `/dashboard/team/...` → 200 (org-side, untouched)
   - `/pricing` → 200 (untouched)
   - `/pricing?tier=identity_plus` → 200 + scrolls to identity_plus card (2026-06-25 anchor still working)
   - `/dashboard` for a parent user with `identity_plus+` → wizard visible
   - `/dashboard` for a free user → wizard NOT visible
   - `/dashboard` for a coach/team_admin → wizard NOT visible (parent-only)
5. **Build verification (deep):** `rm -rf .next && pnpm run build` exits 0 (replicates Vercel, per the 2026-07-02 lesson).
6. **"Must-keep-working" audit:** open each surface in the audit list (Section 4) and confirm no visual or behavioral change.

If any check fails, STOP. Do not push.

## 7. Resolved decisions (Arnel, 2026-07-05 18:23 CDT, msg #32472 — "Proceed with all recommendations, I approve")

| # | Question | Decision |
|---|---|---|
| 1 | Wizard state storage | **B — new `profiles.family_setup_completed_at` column** (single nullable timestamp). Migration: 3 lines of SQL. |
| 2 | Consumer cards visibility | **All personal-workspace users see the cards. Empty-state CTAs are account-type-aware** (parent/player/scout/fan). |
| 3 | Family Hub tier gate | **No change.** Existing `identity_plus+` or `business_listing+` gate stays. |
| 4 | "Hockey Passport" wording | **"Your Hockey Passport"** on `/dashboard/profile`. Sub-sections: Verified Identity, Player Photo, Parent Relationships, Documents (1b), Achievements (1b), Career Timeline (1b). |
| 5 | Wizard dismiss behavior | **Permanent dismiss.** Sets `family_setup_completed_at = NOW()`. "Resume Hockey Passport setup" link on `/dashboard/family` clears the timestamp and re-shows the wizard. |

All 5 questions resolved. Prep doc is FINAL. Step 2 (Implementation) starts in the next session.

## 8. Phasing recap (full program, not just 1a)


| Phase | Scope | Sessions | Schema | Status |
|---|---|---|---|---|
| 1a | UX on existing data: reframe, wizard shell, consumer cards, empty states | This prep doc + 1 ship | 1 column (`profiles.family_setup_completed_at`) | APPROVED 2026-07-05, awaiting Step 2 |
| 1b-1 | player_documents + player_media (Supabase Storage) | 1 prep + 1 ship | 2 new tables + 1 storage bucket | After 1a |
| 1b-2 | player_achievements + player_timeline_events | 1 prep + 1 ship | 2 new tables | After 1b-1 |
| 1b-3 | Family-level rollup views (read-side) | 1 prep + 1 ship | 3 new views, no new tables | After 1b-2 |
| 1b-4 | consumer_notifications + prefs | 1 prep + 1 ship | 1 new table + email-pref extension | After 1b-3 |
| 2 | Parent → org invitation flow (Loop B) | 1 prep + 1 ship | 1 new table + org-side surface | After 1b-4 |
| 3 | Org adoption surface (family-invites-club first-touch) | 1 prep + 1 ship | TBD | After 2 |

Each phase is its own session with its own prep doc, sign-off, and ship. Per the 2026-06-24 protocol: PREP → IMPLEMENT → AUDIT → SHIP → POST-SHIP AUDIT.

---

**Sign-off block (filled in by Arnel 2026-07-05 18:23 CDT):**

- [x] Phase 1a scope approved
- [x] Section 7 open questions answered (all 5)
- [x] Tier gate on wizard + Family Hub confirmed (`identity_plus+`)
- [x] "Must-keep-working" list complete
- [x] Rollback plan acceptable
- [x] Ship gate acceptable

**Sign-off:** Arnel, Telegram msg #32472 — "Proceed with all recommendations, I approve."

**Next step:** Step 2 (Implementation) starts in the next session. Per the 2026-06-24 protocol, Step 2 is a separate session with: (1) Implementation in small commits on a feature branch, (2) Pre-deploy audit, (3) Ship (one merge to main), (4) Post-ship audit. Arnel will receive per-step progress in this chat.

**Migration note for Step 2:** the first commit in Step 2 will be the schema migration for `profiles.family_setup_completed_at`. This is the only schema change in 1a. The Ship Gate deep check (`rm -rf .next && pnpm run build`) MUST pass before push.
