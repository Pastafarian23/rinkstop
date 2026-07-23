# Sports Passport Roadmap — STATUS

**Source of truth:** `docs/passport-roadmap.md` (12-week master plan, last updated 2026-07-10)
**Status doc updated:** 2026-07-23 (this session)
**Rule going forward:** this file is updated whenever a workstream PR merges or a side-task plan gets added.

---

## Status legend

- ✅ **Shipped** — code in `main`, verified
- 🟡 **Partial** — partial work landed, follow-up required
- ⏳ **Pending** — planned, no code yet (or branch only)
- ➖ **Out of scope / parked**

---

## From the original master list (`passport-roadmap.md`)

### Tier 1 — Player record + career timeline + stats
**Goal:** Verified hockey record exists with team history + per-season stats + federation registration.

| Sub-deliverable | Status | Notes / PR |
|---|---|---|
| `hockey_player_team_history` table | ➖ | Schema never created. Profile timeline exists but uses different table (likely `player_team_history` from the legacy work). |
| `hockey_player_stats_season` table | ➖ | Not created. Player analytics routes exist (1c-1 through 1c-6) but use a different stats model. |
| `hockey_seasons` lookup | ➖ | Not created. |
| `players` extended (current_team_id, federation numbers) | 🟡 | Partial — `current_team_id` likely exists; federation numbers not yet. |
| `/profile/[slug]/passport` page | ✅ | `/passport/[id]` (public) shipped as PR #28 (WS2 PR3). Player-facing timeline included in `9d63d0a9` (WS1 Phase 5). |
| Self-reported → coach-verified flow | 🟡 | Schema in WS4 PR1 (account-type resolver, PR #43) covers part of it. End-to-end UI not fully shipped. |
| **Tier 1 verdict** | 🟡 **Partial** | Public passport surface shipped; the dedicated hockey_* schema tables were never built (the existing analytics surface filled the gap). |

### Tier 2 — Federation + coach verification

| Sub-deliverable | Status | Notes / PR |
|---|---|---|
| `federations` + `federation_registrations` tables | ✅ | Both tables live (migrations applied 2026-07-23). 84 IIHF federations seeded. PR #49. |
| USA Hockey # manual entry → verify by name+DOB match | ✅ | `/dashboard/passport/federation` form + PATCH API → submit → admin approve. PR #49. |
| Hockey Canada # manual entry | ✅ | Same workflow. PR #49. |
| `/dashboard/identity/federation` | ➖ | Renamed/routed to `/dashboard/passport/federation` for players; `/dashboard/coach/credentials` for coaches; `/dashboard/referee/credentials` for referees. |
| `coaches` + `coach_team_history` + `coach_endorsements` tables | 🟡 | Coach role + permissions live (WS4 PR1+PR2). Coach credentials flow live (PR #49). Endorsement tables not yet. |
| Coach profile (`/directory/coaches/[id]`) | ⏳ | Deferred to v2. |
| `/dashboard/coach/endorsements` | ⏳ | Not built. |
| **Tier 2 verdict** | 🟢 **Submission workflow live** | All three personas can submit; admin queue at `/admin/federation-registrations`. Endorsement tables still pending. Deprecation of legacy `players.usa_hockey_number` columns scheduled for PR3. |

### Tier 3 — Schema sport-agnostic refactor + data portability

| Sub-deliverable | Status | Notes / PR |
|---|---|---|
| Sport-agnostic schema (`hockey_*` prefix pattern) | 🟡 | Partial — most tables still sport-specific. Identity Abstraction Foundation (WS1 Phase 5, `9d63d0a9`) was the start. |
| `GET /api/passport/export?format=json|csv` | ⏳ | Not built. |
| `/dashboard/passport/export` UI | ⏳ | Not built. |
| Email confirmation for export | ⏳ | Not built. |
| **Tier 3 verdict** | 🟡 **Partial** | Identity abstraction shipped; full data portability zero. |

### Tier 4 — Tournaments + events + recruitment v1

| Sub-deliverable | Status | Notes / PR |
|---|---|---|
| `tournaments`, `events`, `event_participations`, `scout_profiles`, `recruitment_interests` | ⏳ | None built. |
| Player adds tournament/event participations | ⏳ | Not built. |
| Scout visibility consent flow | ⏳ | Not built. |
| `/directory/tournaments/[id]` | ⏳ | Deferred to v2. |
| **Tier 4 verdict** | ➖ **Not started** | Open question #3 (Arnel decision): scouts = v2, so this tier can be deferred. |

---

## Side-tasks and emergent workstreams (added since 2026-07-10)

These were NOT in the original roadmap. They emerged from daily ops, SEO, audit findings, and pivot decisions. They got their own PRs and plans.

### WS2 — Passport + QR Foundation ✅ DONE
- **WS2 PR1** (#22) — Dashboard + Activation + Timeline
- **WS2 PR2 PR1** (#26) — QR code foundation (Steps 1.1–1.9)
- **WS2 PR2 P1 v2** (in #26) — separate `passport_qr_codes` table + Identity Assets Service
- **WS2 PR3** (#28) — public Passport page at `/passport/[id]`
- **WS2 PR1 fixes** (#22) — port from `seo-ambiguous-slug-redirects`
- **Status:** ✅ Complete. Foundation for the passport ecosystem.

### WS3 — Stamp System ✅ DONE
- **WS3 PR1** (#29) — stamp system schema + `STAMPS_ENABLED` flag
- **WS3 PR2** (#30) — stamp endpoint, confirmation page, QR dispatch
- **WS3 PR3** (#31) — public attendance, dashboard history, visibility toggle
- **WS3 PR4** (#32) — dispute flow + admin QR rotation
- **WS3 PR5** (#33) — operator QR card + rollout docs
- **Follow-up fix** (`756c5007`) — `r.id` cast to text + AT TIME ZONE 'UTC' for IMMUTABLE indexes
- **Status:** ✅ Complete. One open gap: `stamps.qr_identifier` referenced in RLS but missing on the table — scan counts will show 0 until reconciled. Tracked below.

### WS3.5 — Dispute Adjudication + Family Hub Multi-Stamp ✅ DONE
- **WS3.5 PR1** (#34) — dispute adjudication schema + types + flag
- **WS3.5 PR2** (#35) — operator dispute queue UI + adjudication endpoint
- **WS3.5 PR3** (#42) — admin staff dispute queue (cross-target)
- **WS3.5 PR4** (#39) — dispute notifications (operator + stamper inbox)
- **WS3.5 PR5+PR6** (#40) — Family Hub Multi-Stamp Passport picker + `subject_passport_id`
- **Status:** ✅ Complete.

### WS4 — Permission Resolver + Referee Tools ✅ DONE
- **WS4 PR1** (#43) — account-type-aware permission resolver
- **WS4 PR2** (#44) — referee tools (read-only dashboards)
- **Status:** ✅ Complete.

### Setup Wizard (persona-aware) ✅ DONE
- **PR #27** — persona-aware Setup Wizard (parent/coach/player/official/operator/generic)
- **Status:** ✅ Complete.

### Dashboard Workspaces (Documents/Passport split + dismiss) ✅ DONE
- **PR #45** — Documents/Passport split + workspace dismiss foundation
- **PR #46** — workspace dismiss UI (Hide button + restore footer)
- **Status:** ✅ Complete.

### Equipment Schema 🟡 PARTIAL
- **PR #47** — equipment schema foundation (items + assignments)
- **Status:** 🟡 Schema only. UI and integration pending. Likely becomes its own WS (WS-Equipment?).

### SEO Batches ✅ DONE
- **PR #23** — 659 redirects (16 rinks + 643 teams) + gear-brands content
- **PR #24** — Hockey teams content hub on `/directory/teams`
- **PR #25** — rink page titles em-dash + country + intent signals
- **PR #22** — WS2 PR1 fixes from seo-ambiguous-slug-redirects
- **Status:** ✅ Complete (these batches).

### Claim flow hardening ✅ DONE
- **PRs #1–#13** (June 13–14) — pricing single-source-of-truth, claim CTA on unclaimed pages, cap enforcement, 403 structured errors, draft persistence after Stripe checkout, welcome duplicate fix, guest checkout, etc.
- **Status:** ✅ Complete for that batch. Analytics on the claim-to-paid funnel still pending.

### WS7 — Partner Engagement (NEW, not in master list) ✅ DONE
- **WS7 PR1** (#48, **MERGED**) — Partner Passport activity surface + business rename
  - New page: `/partners/[id]/passport`
  - Renames: `/partner` → `/partner-with-us`, `/businesses` → `/partners`
  - Service: `16-partner-activity-service.ts` (gated, read-only)
  - Migration: `2026-07-23_venues_listing_id.sql` (venues.listing_id FK)
- **WS7 PR2+** — ⏳ NOT PLANNED. Master list has no WS7. The only references to WS7 are in branch names and in `passport-card-design-system.md` (which uses WS5/WS6 differently than this).

### WS8 — Federation Verification (NEW, not in master list) ✅ DONE
- **WS8 PR1** (#49, **MERGED** at 2026-07-23T13:54Z, commit `b27e3d74`) — Federation submissions + admin verification across player/coach/referee
  - New table: `federation_registrations` (polymorphic subject: player_id | coach_id | referee_user_id, exactly one set per row)
  - New column: `federations.category` (player/coach/referee/all)
  - 84 IIHF federations seeded (idempotent UPSERT)
  - Player UI: `/dashboard/passport/federation` (status badges + submit/withdraw)
  - Coach UI: `/dashboard/coach/credentials`
  - Referee UI: `/dashboard/referee/credentials`
  - Cross-persona summary: `/dashboard/credentials`
  - Admin queue: `/admin/federation-registrations` (with inline reject reason input)
  - 9 new API routes (player/coach/referee × edit/submit/withdraw + admin approve/reject)
- **WS8 PR2/PR3 (deferred)** — Drop legacy `players.usa_hockey_number` and `players.hockey_canada_number` columns; convert `coach_profiles.license_issuing_authority` from free-text to derived view.

---

## Pending — must address

### A. Document the workstream numbering reconciliation

The `passport-roadmap.md` numbering (Tier 1–4) and the `workstream-2-pr1-audit.md` numbering (WS3–WS6) are different. WS7 doesn't exist in either. **Blocker for sane planning.**

Recommendation: keep WS-numbering (it's what the branches and PR titles use). Update `passport-roadmap.md` to map its Tier list to WS-numbers and append WS7 explicitly.

### B. `stamps.qr_identifier` RLS gap
- Existing RLS migration references `stamps.qr_identifier` but the column doesn't exist on `stamps`.
- Scan counts in the partner activity view will stay at 0 until fixed.
- Page surfaces a "v1.1" badge so it's visible, not silent.
- Tracked from PR #48 follow-ups. Open ticket needed.

### C. Claim-to-paid funnel analytics
- The revenue path per MEMORY.md: `/claim-your-listing` → `/api/tier/upgrade`.
- "Why upgrade?" prompt + step-by-step funnel analytics still not built.
- Cold email Play 1 is parked (per MEMORY.md "pivot to organic-only revenue").
- Tracked from MEMORY.md §2011. Open ticket needed.

### D. WS7 PR2+ plan
- The Partner Engagement workstream started but has no written plan.
- Candidate next items (from MEMORY.md + audit doc):
  - Partner-side tier upgrade surface
  - Funnel analytics from (C)
  - Fix (B) `stamps.qr_identifier`

### E. Tier 1-3 incomplete pieces (hockey schema tables, federation tables, data portability)
- These were deprioritized in favor of the passport+stamps+WS4 track.
- Federations (USA Hockey #) is on the revenue-adjacent list (orgs want to claim verified status) — possibly worth scoping as WS8.

### F. WS5/WS6 from audit doc — deferred
- WS5 — Physical Ecosystem (printed Passport, editions, partner program)
- WS6 — Platform Expansion (recruiting tools, wallet passes, NFC, federation APIs)
- Both parked. The audit doc calls these out explicitly as future.

---

## Total picture

**Shipped (PRs in main):** ~46 merged PRs since June 13. The bulk of passport work (WS2 + WS3 + WS3.5 + WS4) is done.

**Open:** 1 PR (#48, in review).

**Partial / deferred:** Equipment schema (PR #47), Tier 1/2/3 schema tables, WS5/WS6, WS7 PR2+.

**Tracking debt:** Two numbering schemes (Tier vs WS), no WS7 plan, three open follow-up items not in any backlog (B, C, D).

---

## How this doc stays accurate

Every time a PR merges:
1. Update the matching row above
2. If the PR creates a new workstream or sub-stream, add a section
3. If the PR closes an open follow-up (B/C/D), mark it done

The master plan (`passport-roadmap.md`) gets a pointer at the top to this STATUS doc, and a one-paragraph "what changed since 2026-07-10" appended.